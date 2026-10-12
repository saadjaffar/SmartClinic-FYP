import React, {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useFocusEffect,
  useRouter,
} from "expo-router";

import { apiRequest } from "../api/client";

type QueuePatient = {
  id: number;
  appointment_id: number;
  token_number: number;
  patient_id: number;
  patient_name?: string | null;

  priority?: string | null;

  status:
    | "waiting"
    | "called"
    | "in_consultation"
    | "completed"
    | "skipped";

  appointment_status?: string | null;
  appointment_type?: string | null;
  notes?: string | null;

  appointment_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;

  check_in_time?: string | null;
  called_at?: string | null;
  consultation_started_at?: string | null;
  completed_at?: string | null;
};

type QueueResponse = {
  status: string;
  message: string;
  date?: string;
  count?: number;
  queue?: QueuePatient[];
};

export default function DoctorQueueScreen() {
  const router = useRouter();

  const [queue, setQueue] = useState<QueuePatient[]>([]);
  const [date, setDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [callingNext, setCallingNext] = useState(false);

  const [processingId, setProcessingId] =
    useState<number | null>(null);

  const [error, setError] = useState("");

  const loadQueue = useCallback(async () => {
    try {
      setError("");

      const response: QueueResponse =
        await apiRequest("/api/queue/today");

      setQueue(
        Array.isArray(response?.queue)
          ? response.queue
          : []
      );

      setDate(response?.date || "");
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to load today's queue."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadQueue();
    }, [loadQueue])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadQueue();
  };

  const currentPatient = useMemo(
    () =>
      queue.find((item) =>
        [
          "called",
          "in_consultation",
        ].includes(item.status)
      ) || null,
    [queue]
  );

  const waitingPatients = useMemo(
    () =>
      queue.filter(
        (item) =>
          item.status === "waiting"
      ),
    [queue]
  );

  const finishedPatients = useMemo(
    () =>
      queue.filter((item) =>
        [
          "completed",
          "skipped",
        ].includes(item.status)
      ),
    [queue]
  );

  const callNext = async () => {
    try {
      setCallingNext(true);

      const response =
        await apiRequest(
          "/api/queue/call-next",
          {
            method: "POST",
          }
        );

      showMessage(
        "Patient Called",
        `Token #${
          response?.token_number ?? ""
        } has been called.`
      );

      await loadQueue();
    } catch (err: any) {
      showMessage(
        "Unable to Call Patient",
        err?.message ||
          "Could not call the next patient."
      );
    } finally {
      setCallingNext(false);
    }
  };

  const openConsultation = (
    patient: QueuePatient
  ) => {
    router.push({
      pathname: "/doctor-consultation",
      params: {
        queueId: String(patient.id),

        tokenNumber: String(
          patient.token_number
        ),

        patientName:
          patient.patient_name ||
          "Patient",

        appointmentTime:
          formatTimeRange(
            patient.start_time,
            patient.end_time
          ),

        appointmentType:
          patient.appointment_type ||
          "in_person",

        reason:
          patient.notes || "",
      },
    });
  };

  const startConsultation = async (
    patient: QueuePatient
  ) => {
    try {
      setProcessingId(patient.id);

      await apiRequest(
        `/api/queue/${patient.id}/start`,
        {
          method: "PATCH",
        }
      );

      openConsultation(patient);
    } catch (err: any) {
      showMessage(
        "Unable to Start",
        err?.message ||
          "Could not start consultation."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const skipPatient = (
    patient: QueuePatient
  ) => {
    const message =
      `Mark token #${patient.token_number} ` +
      `(${patient.patient_name || "Patient"}) as no-show?`;

    if (Platform.OS === "web") {
      const confirmed =
        window.confirm(message);

      if (confirmed) {
        performSkip(patient);
      }

      return;
    }

    Alert.alert(
      "Skip Patient",
      message,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Skip",
          style: "destructive",
          onPress: () =>
            performSkip(patient),
        },
      ]
    );
  };

  const performSkip = async (
    patient: QueuePatient
  ) => {
    try {
      setProcessingId(patient.id);

      await apiRequest(
        `/api/queue/${patient.id}/skip`,
        {
          method: "PATCH",
        }
      );

      showMessage(
        "Patient Skipped",
        `Token #${patient.token_number} was marked as no-show.`
      );

      await loadQueue();
    } catch (err: any) {
      showMessage(
        "Unable to Skip",
        err?.message ||
          "Could not skip this patient."
      );
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading today's queue...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.backIcon}>
            ‹
          </Text>
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
            Today's Queue
          </Text>

          <Text style={styles.headerSubtitle}>
            Manage today's patients
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        contentContainerStyle={
          styles.content
        }
      >
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              Unable to load queue
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>

            <Pressable
              onPress={loadQueue}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>
                Try Again
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* SUMMARY */}
            <View style={styles.summaryCard}>
              <View>
                <Text style={styles.summaryTitle}>
                  Clinic Queue
                </Text>

                <Text style={styles.summaryDate}>
                  {formatDate(date)}
                </Text>
              </View>

              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />

                <Text style={styles.liveText}>
                  LIVE
                </Text>
              </View>
            </View>

            {/* QUEUE STATS */}
            <View style={styles.statsRow}>
              <MiniStat
                value={queue.length}
                label="Total"
              />

              <MiniStat
                value={waitingPatients.length}
                label="Waiting"
              />

              <MiniStat
                value={
                  currentPatient ? 1 : 0
                }
                label="Active"
              />

              <MiniStat
                value={finishedPatients.length}
                label="Done"
              />
            </View>

            {/* CURRENT PATIENT */}
            <Text style={styles.sectionTitle}>
              Current Patient
            </Text>

            {currentPatient ? (
              <CurrentPatientCard
                patient={currentPatient}
                processing={
                  processingId ===
                  currentPatient.id
                }
                onStart={() =>
                  startConsultation(
                    currentPatient
                  )
                }
                onContinue={() =>
                  openConsultation(
                    currentPatient
                  )
                }
                onSkip={() =>
                  skipPatient(
                    currentPatient
                  )
                }
              />
            ) : (
              <View style={styles.emptyCurrent}>
                <Text style={styles.emptyIcon}>
                  🩺
                </Text>

                <Text style={styles.emptyTitle}>
                  No active patient
                </Text>

                <Text style={styles.emptyText}>
                  Call the next waiting patient
                  when you are ready.
                </Text>
              </View>
            )}

            {/* CALL NEXT */}
            <Pressable
              disabled={
                callingNext ||
                currentPatient != null ||
                waitingPatients.length === 0
              }
              onPress={callNext}
              style={({ pressed }) => [
                styles.callNextButton,

                (
                  callingNext ||
                  currentPatient != null ||
                  waitingPatients.length === 0
                ) &&
                  styles.callNextDisabled,

                pressed &&
                  !callingNext &&
                  styles.pressed,
              ]}
            >
              {callingNext ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />

                  <Text style={styles.callNextText}>
                    Calling...
                  </Text>
                </View>
              ) : (
                <Text style={styles.callNextText}>
                  🔔 Call Next Patient
                </Text>
              )}
            </Pressable>

            {/* WAITING PATIENTS */}
            <View style={styles.sectionHeader}>
              <View>
                <Text
                  style={
                    styles.sectionTitleNoMargin
                  }
                >
                  Waiting Patients
                </Text>

                <Text
                  style={styles.sectionSubtitle}
                >
                  {waitingPatients.length} patient
                  {waitingPatients.length === 1
                    ? ""
                    : "s"}{" "}
                  waiting
                </Text>
              </View>
            </View>

            {waitingPatients.length === 0 ? (
              <View style={styles.emptyList}>
                <Text
                  style={styles.emptyListText}
                >
                  No patients are currently waiting.
                </Text>
              </View>
            ) : (
              waitingPatients.map(
                (patient) => (
                  <WaitingPatientCard
                    key={patient.id}
                    patient={patient}
                    processing={
                      processingId ===
                      patient.id
                    }
                    onSkip={() =>
                      skipPatient(patient)
                    }
                  />
                )
              )
            )}

            {/* FINISHED */}
            {finishedPatients.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>
                  Completed Today
                </Text>

                {finishedPatients.map(
                  (patient) => (
                    <FinishedPatientCard
                      key={patient.id}
                      patient={patient}
                    />
                  )
                )}
              </>
            ) : null}

            <View style={styles.refreshNotice}>
              <Text style={styles.refreshIcon}>
                ↻
              </Text>

              <Text style={styles.refreshText}>
                Pull down anytime to refresh the
                latest queue status.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function CurrentPatientCard({
  patient,
  processing,
  onStart,
  onContinue,
  onSkip,
}: {
  patient: QueuePatient;
  processing: boolean;
  onStart: () => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const inConsultation =
    patient.status ===
    "in_consultation";

  return (
    <View style={styles.currentCard}>
      <View style={styles.currentTop}>
        <View style={styles.tokenCircle}>
          <Text style={styles.tokenLabel}>
            TOKEN
          </Text>

          <Text style={styles.tokenNumber}>
            #{patient.token_number}
          </Text>
        </View>

        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>
            {patient.patient_name ||
              "Patient"}
          </Text>

          <Text style={styles.patientMeta}>
            {formatTimeRange(
              patient.start_time,
              patient.end_time
            )}
          </Text>

          <Text style={styles.patientMeta}>
            {patient.appointment_type ===
            "video"
              ? "Video Consultation"
              : "In-Person"}
          </Text>
        </View>

        <StatusBadge
          status={patient.status}
        />
      </View>

      {patient.notes ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>
            Reason for visit
          </Text>

          <Text style={styles.notesText}>
            {patient.notes}
          </Text>
        </View>
      ) : null}

      {/* PATIENT HAS BEEN CALLED */}
      {patient.status === "called" ? (
        <View style={styles.currentActions}>
          <Pressable
            disabled={processing}
            onPress={onSkip}
            style={({ pressed }) => [
              styles.currentSkipButton,

              processing &&
                styles.disabled,

              pressed &&
                !processing &&
                styles.pressed,
            ]}
          >
            <Text
              style={
                styles.currentSkipText
              }
            >
              No Show
            </Text>
          </Pressable>

          <Pressable
            disabled={processing}
            onPress={onStart}
            style={({ pressed }) => [
              styles.currentStartButton,

              processing &&
                styles.disabled,

              pressed &&
                !processing &&
                styles.pressed,
            ]}
          >
            {processing ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <Text
                style={
                  styles.startButtonText
                }
              >
                🩺 Start Consultation
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {/* CONSULTATION STARTED */}
      {inConsultation ? (
        <>
          <View
            style={
              styles.consultationNotice
            }
          >
            <Text
              style={
                styles.consultationNoticeTitle
              }
            >
              Consultation in progress
            </Text>

            <Text
              style={
                styles.consultationNoticeText
              }
            >
              Record the patient's diagnosis,
              prescription and medical notes.
            </Text>
          </View>

          <Pressable
            onPress={onContinue}
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={
                styles.continueButtonText
              }
            >
              Open Consultation Form →
            </Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

function WaitingPatientCard({
  patient,
  processing,
  onSkip,
}: {
  patient: QueuePatient;
  processing: boolean;
  onSkip: () => void;
}) {
  return (
    <View style={styles.patientCard}>
      <View style={styles.smallToken}>
        <Text style={styles.smallTokenText}>
          #{patient.token_number}
        </Text>
      </View>

      <View style={styles.waitingInfo}>
        <Text style={styles.waitingName}>
          {patient.patient_name ||
            "Patient"}
        </Text>

        <Text style={styles.waitingMeta}>
          {formatTimeRange(
            patient.start_time,
            patient.end_time
          )}
          {"  •  "}
          {patient.appointment_type ===
          "video"
            ? "Video"
            : "In-Person"}
        </Text>

        {patient.notes ? (
          <Text
            style={styles.waitingNotes}
            numberOfLines={1}
          >
            {patient.notes}
          </Text>
        ) : null}
      </View>

      <Pressable
        disabled={processing}
        onPress={onSkip}
        style={({ pressed }) => [
          styles.skipButton,

          processing &&
            styles.disabled,

          pressed &&
            !processing &&
            styles.pressed,
        ]}
      >
        {processing ? (
          <ActivityIndicator
            size="small"
          />
        ) : (
          <Text style={styles.skipText}>
            Skip
          </Text>
        )}
      </Pressable>
    </View>
  );
}

function FinishedPatientCard({
  patient,
}: {
  patient: QueuePatient;
}) {
  return (
    <View style={styles.finishedCard}>
      <View>
        <Text style={styles.finishedName}>
          #{patient.token_number} ·{" "}
          {patient.patient_name ||
            "Patient"}
        </Text>

        <Text style={styles.finishedMeta}>
          {formatTimeRange(
            patient.start_time,
            patient.end_time
          )}
        </Text>
      </View>

      <StatusBadge
        status={patient.status}
      />
    </View>
  );
}

function MiniStat({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue}>
        {value}
      </Text>

      <Text style={styles.miniStatLabel}>
        {label}
      </Text>
    </View>
  );
}

function StatusBadge({
  status,
}: {
  status: QueuePatient["status"];
}) {
  const config =
    getStatusConfig(status);

  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor:
            config.background,
        },
      ]}
    >
      <View
        style={[
          styles.statusDot,
          {
            backgroundColor:
              config.color,
          },
        ]}
      />

      <Text
        style={[
          styles.statusText,
          {
            color: config.color,
          },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

function getStatusConfig(
  status: QueuePatient["status"]
) {
  switch (status) {
    case "waiting":
      return {
        label: "Waiting",
        color: "#92400E",
        background: "#FEF3C7",
      };

    case "called":
      return {
        label: "Called",
        color: "#C2410C",
        background: "#FFEDD5",
      };

    case "in_consultation":
      return {
        label: "In Consultation",
        color: "#1D4ED8",
        background: "#DBEAFE",
      };

    case "completed":
      return {
        label: "Completed",
        color: "#166534",
        background: "#DCFCE7",
      };

    case "skipped":
      return {
        label: "No Show",
        color: "#64748B",
        background: "#E2E8F0",
      };

    default:
      return {
        label: "Unknown",
        color: "#64748B",
        background: "#E2E8F0",
      };
  }
}

function formatDate(
  value?: string
) {
  if (!value) {
    return "Today";
  }

  const [year, month, day] =
    value
      .split("-")
      .map(Number);

  return new Date(
    year,
    month - 1,
    day
  ).toLocaleDateString(
    undefined,
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function formatTimeRange(
  start?: string | null,
  end?: string | null
) {
  if (!start) {
    return "Time unavailable";
  }

  if (!end) {
    return formatTime(start);
  }

  return `${formatTime(
    start
  )} - ${formatTime(end)}`;
}

function formatTime(
  value: string
) {
  const [
    hoursText,
    minutes = "00",
  ] = value.split(":");

  const hours =
    Number(hoursText);

  const period =
    hours >= 12
      ? "PM"
      : "AM";

  const display =
    hours % 12 || 12;

  return `${display}:${minutes} ${period}`;
}

function showMessage(
  title: string,
  message: string
) {
  if (Platform.OS === "web") {
    window.alert(
      `${title}\n\n${message}`
    );

    return;
  }

  Alert.alert(
    title,
    message
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },

  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 14,
  },

  header: {
    backgroundColor: "#0F766E",
    paddingTop: 52,
    paddingBottom: 22,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor:
      "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  backIcon: {
    color: "#FFFFFF",
    fontSize: 36,
    lineHeight: 38,
  },

  headerText: {
    flex: 1,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "#CCFBF1",
    fontSize: 13,
    marginTop: 4,
  },

  content: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    padding: 18,
    paddingBottom: 45,
  },

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5EAF0",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  summaryTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#172033",
  },

  summaryDate: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },

  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#16A34A",
    marginRight: 6,
  },

  liveText: {
    color: "#166534",
    fontSize: 9,
    fontWeight: "900",
  },

  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  miniStat: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5EAF0",
  },

  miniStatValue: {
    color: "#0F766E",
    fontSize: 20,
    fontWeight: "900",
  },

  miniStatLabel: {
    color: "#64748B",
    fontSize: 9,
    marginTop: 2,
  },

  sectionTitle: {
    color: "#172033",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 25,
    marginBottom: 11,
  },

  sectionTitleNoMargin: {
    color: "#172033",
    fontSize: 18,
    fontWeight: "800",
  },

  sectionHeader: {
    marginTop: 25,
    marginBottom: 11,
  },

  sectionSubtitle: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 3,
  },

  emptyCurrent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5EAF0",
  },

  emptyIcon: {
    fontSize: 30,
  },

  emptyTitle: {
    color: "#172033",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 8,
  },

  emptyText: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },

  currentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5EAF0",
  },

  currentTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  tokenCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#CCFBF1",
    justifyContent: "center",
    alignItems: "center",
  },

  tokenLabel: {
    color: "#64748B",
    fontSize: 8,
    fontWeight: "800",
  },

  tokenNumber: {
    color: "#0F766E",
    fontSize: 20,
    fontWeight: "900",
  },

  patientInfo: {
    flex: 1,
    marginLeft: 13,
  },

  patientName: {
    color: "#172033",
    fontSize: 16,
    fontWeight: "800",
  },

  patientMeta: {
    color: "#64748B",
    fontSize: 10,
    marginTop: 3,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  statusText: {
    fontSize: 9,
    fontWeight: "800",
  },

  notesBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 11,
    marginTop: 14,
  },

  notesLabel: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "800",
  },

  notesText: {
    color: "#334155",
    fontSize: 11,
    marginTop: 4,
  },

  currentActions: {
    flexDirection: "row",
    gap: 9,
    marginTop: 13,
  },

  currentSkipButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  currentSkipText: {
    color: "#B91C1C",
    fontSize: 11,
    fontWeight: "800",
  },

  currentStartButton: {
    flex: 2,
    backgroundColor: "#0F766E",
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  startButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  consultationNotice: {
    backgroundColor: "#EFF6FF",
    borderRadius: 11,
    padding: 12,
    marginTop: 13,
  },

  consultationNoticeTitle: {
    color: "#1D4ED8",
    fontSize: 11,
    fontWeight: "800",
  },

  consultationNoticeText: {
    color: "#475569",
    fontSize: 10,
    lineHeight: 16,
    marginTop: 3,
  },

  continueButton: {
    backgroundColor: "#0F766E",
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },

  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  callNextButton: {
    backgroundColor: "#0F766E",
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 13,
  },

  callNextDisabled: {
    backgroundColor: "#94A3B8",
    opacity: 0.7,
  },

  callNextText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  loadingRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },

  emptyList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    padding: 18,
    alignItems: "center",
  },

  emptyListText: {
    color: "#94A3B8",
    fontSize: 11,
  },

  patientCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5EAF0",
  },

  smallToken: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
  },

  smallTokenText: {
    color: "#0F766E",
    fontSize: 13,
    fontWeight: "900",
  },

  waitingInfo: {
    flex: 1,
    marginLeft: 11,
  },

  waitingName: {
    color: "#172033",
    fontSize: 12,
    fontWeight: "800",
  },

  waitingMeta: {
    color: "#64748B",
    fontSize: 9,
    marginTop: 3,
  },

  waitingNotes: {
    color: "#94A3B8",
    fontSize: 9,
    marginTop: 3,
  },

  skipButton: {
    minWidth: 58,
    backgroundColor: "#FEF2F2",
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
    alignItems: "center",
  },

  skipText: {
    color: "#B91C1C",
    fontSize: 10,
    fontWeight: "800",
  },

  finishedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    padding: 13,
    marginBottom: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5EAF0",
  },

  finishedName: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "700",
  },

  finishedMeta: {
    color: "#94A3B8",
    fontSize: 9,
    marginTop: 3,
  },

  refreshNotice: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },

  refreshIcon: {
    color: "#94A3B8",
    marginRight: 6,
  },

  refreshText: {
    color: "#94A3B8",
    fontSize: 10,
  },

  errorCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 16,
  },

  errorTitle: {
    color: "#991B1B",
    fontSize: 14,
    fontWeight: "800",
  },

  errorText: {
    color: "#B91C1C",
    fontSize: 12,
    marginTop: 4,
  },

  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 8,
    marginTop: 10,
  },

  retryText: {
    color: "#991B1B",
    fontSize: 12,
    fontWeight: "800",
  },

  disabled: {
    opacity: 0.6,
  },

  pressed: {
    opacity: 0.75,
    transform: [
      {
        scale: 0.99,
      },
    ],
  },
});