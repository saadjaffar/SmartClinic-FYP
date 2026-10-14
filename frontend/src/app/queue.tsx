import React, {
  useCallback,
  useState,
} from "react";
import {
  ActivityIndicator,
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

type QueueAppointment = {
  id: number;
  doctor_id: number;
  doctor_name?: string | null;
  specialization?: string | null;
  room_number?: string | null;
  appointment_date: string;
  appointment_time?: string | null;
  appointment_end_time?: string | null;
  appointment_type?: string | null;
  status?: string | null;
  booking_source?: string | null;
  emergency_reason?: string | null;
};

type QueueInfo = {
  id: number;
  token_number: number;
  status:
    | "waiting"
    | "called"
    | "in_consultation"
    | "completed"
    | "skipped"
    | "no_show";

  priority?: string | null;

  queue_active: boolean;

  people_ahead?: number | null;
  now_serving?: number | null;

  called_at?: string | null;
  consultation_started_at?: string | null;
  completed_at?: string | null;
};

type QueueResponse = {
  status: string;
  message: string;
  appointment: QueueAppointment | null;
  queue: QueueInfo | null;
};

export default function QueueScreen() {
  const router = useRouter();

  const [appointment, setAppointment] =
    useState<QueueAppointment | null>(null);

  const [queue, setQueue] =
    useState<QueueInfo | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadQueue = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setError("");
        }

        const response: QueueResponse =
          await apiRequest(
            "/api/queue/my"
          );

        setAppointment(
          response?.appointment || null
        );

        setQueue(
          response?.queue || null
        );
      } catch (err: any) {
        if (!silent) {
          setError(
            err?.message ||
              "Unable to load queue status."
          );
        }
      } finally {
        if (!silent) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    []
  );

  /*
    Refresh every time screen becomes active.
  */
  useFocusEffect(
  useCallback(() => {
    loadQueue();

    const interval = setInterval(() => {
      loadQueue(true);
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [loadQueue])
);

  const handleRefresh = () => {
    setRefreshing(true);
    loadQueue();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Checking your queue status...
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
            Queue Status
          </Text>

          <Text style={styles.headerSubtitle}>
            Track your clinic visit
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        contentContainerStyle={
          styles.content
        }
      >
        {/* ERROR */}
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              Unable to load queue
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>

            <Pressable
              onPress={() => loadQueue()}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>
                Try Again
              </Text>
            </Pressable>
          </View>
        ) : null}

        {!error &&
        !appointment ? (
          <NoQueueState
            onBook={() =>
              router.push("/doctors")
            }
          />
        ) : null}

        {!error &&
        appointment &&
        queue ? (
          <>
            {/* APPOINTMENT INFO */}
            <View style={styles.doctorCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(
                    appointment.doctor_name
                  )}
                </Text>
              </View>

              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>
                  {appointment.doctor_name ||
                    "Doctor"}
                </Text>

                <Text
                  style={
                    styles.specialization
                  }
                >
                  {appointment.specialization ||
                    "Medical Consultation"}
                </Text>

                <View
                  style={
                    styles.doctorMetaRow
                  }
                >
                  {appointment.room_number ? (
                    <Text
                      style={
                        styles.doctorMeta
                      }
                    >
                      📍{" "}
                      {
                        appointment.room_number
                      }
                    </Text>
                  ) : null}

                  <Text
                    style={styles.doctorMeta}
                  >
                    📅{" "}
                    {formatDate(
                      appointment.appointment_date
                    )}
                  </Text>
                </View>

                <Text style={styles.timeText}>
  {appointment.booking_source === "walk_in"
    ? "Walk-In • In-Person"
    : formatTimeRange(
        appointment.appointment_time,
        appointment.appointment_end_time
      )}
</Text>
              </View>
            </View>
            
            
{appointment.booking_source === "walk_in" &&
appointment.emergency_reason ? (
  <View style={styles.emergencyReasonCard}>
    <Text style={styles.emergencyReasonTitle}>
      ⚠ Emergency Reason
    </Text>

    <Text style={styles.emergencyReasonText}>
      {appointment.emergency_reason}
    </Text>
  </View>
) : null}

            {/* FUTURE APPOINTMENT */}
            {!queue.queue_active ? (
              <FutureQueueCard
                appointment={appointment}
                token={queue.token_number}
              />
            ) : (
              <LiveQueueCard
                queue={queue}
              />
            )}

            {queue.queue_active ? (
  <>
    {/* LIVE VISIT PROGRESS */}
    <Text style={styles.sectionTitle}>
      Visit Progress
    </Text>

    <QueueProgress
      status={queue.status}
    />

    <Text style={styles.sectionTitle}>
      Queue Details
    </Text>

    <View style={styles.detailsCard}>
      <DetailRow
        label="Your token"
        value={`#${queue.token_number}`}
        highlight
      />

      <Divider />

      <DetailRow
        label="Queue status"
        value={formatStatus(queue.status)}
      />

      <Divider />

      <DetailRow
        label="People ahead"
        value={
          queue.people_ahead != null
            ? String(queue.people_ahead)
            : "—"
        }
      />

      <Divider />

      <DetailRow
        label="Now serving"
        value={
          queue.now_serving != null
            ? `#${queue.now_serving}`
            : "Not started"
        }
      />

      <Divider />

      <DetailRow
        label="Appointment type"
        value={
          appointment.appointment_type === "video"
            ? "Video Consultation"
            : "In-Person"
        }
      />

      <Divider />

      <DetailRow
        label="Priority"
        value={formatStatus(
          queue.priority || "normal"
        )}
      />
    </View>
  </>
) : (
  <>
    {/* FUTURE APPOINTMENT STATUS */}
    <Text style={styles.sectionTitle}>
      Appointment Status
    </Text>

    <View style={styles.detailsCard}>
      <DetailRow
        label="Status"
        value="Scheduled"
      />

      <Divider />

      <DetailRow
        label="Your token"
        value={`#${queue.token_number}`}
        highlight
      />

      <Divider />

      <DetailRow
        label="Appointment type"
        value={
          appointment.appointment_type === "video"
            ? "Video Consultation"
            : "In-Person"
        }
      />

      <Divider />

      <DetailRow
        label="Priority"
        value={formatStatus(
          queue.priority || "normal"
        )}
      />
    </View>

    <View style={styles.scheduledNotice}>
      <Text style={styles.scheduledNoticeIcon}>
        ℹ️
      </Text>

      <View style={styles.scheduledNoticeContent}>
        <Text style={styles.scheduledNoticeTitle}>
          Queue not started yet
        </Text>

        <Text style={styles.scheduledNoticeText}>
          Live queue position, people ahead and now-serving
          information will appear on your appointment day.
        </Text>
      </View>
    </View>
  </>
)}

            {/* LIVE INFO */}
            {queue.queue_active ? (
              <View
                style={styles.infoNotice}
              >
                <Text
                  style={styles.infoIcon}
                >
                  ℹ️
                </Text>

                <View
                  style={
                    styles.infoNoticeText
                  }
                >
                  <Text
                    style={styles.infoTitle}
                  >
                    Queue updates automatically
                  </Text>

                  <Text
                    style={styles.infoText}
                  >
                    This screen checks for
                    updates every 10 seconds.
                    You can also pull down to
                    refresh.
                  </Text>
                </View>
              </View>
            ) : null}

            <Pressable
              onPress={() =>
                router.push(
                  "/appointments"
                )
              }
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={
                  styles.secondaryButtonText
                }
              >
                View My Appointments
              </Text>
            </Pressable>
          </>
        ) : null}

        {!error &&
        appointment &&
        !queue ? (
          <View style={styles.noTokenCard}>
            <Text style={styles.noTokenIcon}>
              🎫
            </Text>

            <Text style={styles.noTokenTitle}>
              Queue token unavailable
            </Text>

            <Text style={styles.noTokenText}>
              Your appointment exists, but
              queue information is currently
              unavailable.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function FutureQueueCard({
  appointment,
  token,
}: {
  appointment: QueueAppointment;
  token: number;
}) {
  return (
    <View style={styles.futureCard}>
      <View
        style={styles.futureIconContainer}
      >
        <Text style={styles.futureIcon}>
          📅
        </Text>
      </View>

      <Text style={styles.futureTitle}>
        Your appointment is scheduled
      </Text>

      <Text style={styles.futureText}>
        Live queue tracking will become
        available on your appointment day.
      </Text>

      <View style={styles.futureTokenBox}>
        <Text
          style={styles.futureTokenLabel}
        >
          YOUR TOKEN
        </Text>

        <Text
          style={styles.futureTokenNumber}
        >
          #{token}
        </Text>
      </View>

      <View
        style={styles.futureDateBox}
      >
        <Text
          style={styles.futureDateLabel}
        >
          Appointment
        </Text>

        <Text
          style={styles.futureDateValue}
        >
          {formatDate(
            appointment.appointment_date
          )}
          {" • "}
          {formatTime(
            appointment.appointment_time
          )}
        </Text>
      </View>
    </View>
  );
}

function LiveQueueCard({
  queue,
}: {
  queue: QueueInfo;
}) {
  const status =
    queue.status;

  if (status === "called") {
    return (
      <View
        style={[
          styles.liveCard,
          styles.calledCard,
        ]}
      >
        <Text style={styles.liveIcon}>
          🔔
        </Text>

        <Text
          style={styles.calledTitle}
        >
          It's your turn!
        </Text>

        <Text
          style={styles.liveDescription}
        >
          Token #{queue.token_number} has
          been called. Please proceed to
          the doctor's room.
        </Text>
      </View>
    );
  }

  if (
    status ===
    "in_consultation"
  ) {
    return (
      <View
        style={[
          styles.liveCard,
          styles.consultationCard,
        ]}
      >
        <Text style={styles.liveIcon}>
          🩺
        </Text>

        <Text
          style={
            styles.consultationTitle
          }
        >
          Consultation in progress
        </Text>

        <Text
          style={styles.liveDescription}
        >
          Your consultation with the
          doctor is currently in
          progress.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.liveCard}>
      <View style={styles.liveBadge}>
        <View style={styles.liveDot} />

        <Text style={styles.liveBadgeText}>
          LIVE QUEUE
        </Text>
      </View>

      <View style={styles.tokenArea}>
        <View
          style={styles.tokenColumn}
        >
          <Text
            style={styles.tokenLabel}
          >
            YOUR TOKEN
          </Text>

          <Text
            style={styles.tokenNumber}
          >
            #{queue.token_number}
          </Text>
        </View>

        <View
          style={styles.verticalDivider}
        />

        <View
          style={styles.tokenColumn}
        >
          <Text
            style={styles.tokenLabel}
          >
            NOW SERVING
          </Text>

          <Text
            style={styles.servingNumber}
          >
            {queue.now_serving != null
              ? `#${queue.now_serving}`
              : "—"}
          </Text>
        </View>
      </View>

      <View
        style={styles.peopleAheadBox}
      >
        <Text
          style={
            styles.peopleAheadNumber
          }
        >
          {queue.people_ahead ?? 0}
        </Text>

        <Text
          style={
            styles.peopleAheadLabel
          }
        >
          {queue.people_ahead === 1
            ? "person ahead of you"
            : "people ahead of you"}
        </Text>
      </View>

      {queue.now_serving == null ? (
        <Text style={styles.queueHint}>
          The doctor has not started
          calling patients yet.
        </Text>
      ) : null}
    </View>
  );
}

function QueueProgress({
  status,
}: {
  status: QueueInfo["status"];
}) {
  const steps = [
    {
      key: "waiting",
      label: "Waiting",
      icon: "⏳",
    },
    {
      key: "called",
      label: "Called",
      icon: "🔔",
    },
    {
      key: "in_consultation",
      label: "Consultation",
      icon: "🩺",
    },
    {
      key: "completed",
      label: "Completed",
      icon: "✓",
    },
  ];

  const currentIndex =
    status === "waiting"
      ? 0
      : status === "called"
      ? 1
      : status ===
        "in_consultation"
      ? 2
      : status === "completed"
      ? 3
      : -1;

  return (
    <View style={styles.progressCard}>
      {steps.map((step, index) => {
        const completed =
          currentIndex >= index;

        const current =
          currentIndex === index;

        return (
          <React.Fragment
            key={step.key}
          >
            <View
              style={styles.progressItem}
            >
              <View
                style={[
                  styles.progressCircle,
                  completed &&
                    styles.progressCircleActive,
                  current &&
                    styles.progressCircleCurrent,
                ]}
              >
                <Text
                  style={[
                    styles.progressIcon,
                    completed &&
                      styles.progressIconActive,
                  ]}
                >
                  {step.icon}
                </Text>
              </View>

              <Text
                style={[
                  styles.progressLabel,
                  completed &&
                    styles.progressLabelActive,
                ]}
              >
                {step.label}
              </Text>
            </View>

            {index <
            steps.length - 1 ? (
              <View
                style={[
                  styles.progressLine,
                  currentIndex > index &&
                    styles.progressLineActive,
                ]}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function DetailRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text
        style={[
          styles.detailValue,
          highlight &&
            styles.detailHighlight,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return (
    <View style={styles.divider} />
  );
}

function NoQueueState({
  onBook,
}: {
  onBook: () => void;
}) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyIcon}>
        🎫
      </Text>

      <Text style={styles.emptyTitle}>
        No active queue
      </Text>

      <Text style={styles.emptyText}>
        You don't currently have an
        upcoming appointment with an
        active queue token.
      </Text>

      <Pressable
        onPress={onBook}
        style={styles.primaryButton}
      >
        <Text
          style={styles.primaryButtonText}
        >
          Book Appointment
        </Text>
      </Pressable>
    </View>
  );
}

function formatDate(
  dateString?: string | null
) {
  if (!dateString) {
    return "Not available";
  }

  const [year, month, day] =
    dateString
      .split("-")
      .map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

  return date.toLocaleDateString(
    undefined,
    {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function formatTime(
  time?: string | null
) {
  if (!time) {
    return "Not available";
  }

  const [hourText, minute = "00"] =
    time.split(":");

  const hour =
    Number(hourText);

  const period =
    hour >= 12 ? "PM" : "AM";

  const displayHour =
    hour % 12 || 12;

  return `${displayHour}:${minute} ${period}`;
}

function formatTimeRange(
  start?: string | null,
  end?: string | null
) {
  if (!start) {
    return "Time not available";
  }

  if (!end) {
    return formatTime(start);
  }

  return `${formatTime(
    start
  )} - ${formatTime(end)}`;
}

function formatStatus(
  value: string
) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function getInitials(
  name?: string | null
) {
  if (!name) {
    return "DR";
  }

  const cleaned =
    name.replace(/^Dr\.?\s*/i, "");

  return (
    cleaned
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part[0].toUpperCase()
      )
      .join("") || "DR"
  );
}

const styles =
  StyleSheet.create({
    emergencyReasonCard: {
  marginTop: 12,
  backgroundColor: "#FFF7ED",
  borderWidth: 1,
  borderColor: "#FED7AA",
  borderRadius: 13,
  padding: 14,
},

emergencyReasonTitle: {
  color: "#B91C1C",
  fontSize: 11,
  fontWeight: "900",
},

emergencyReasonText: {
  color: "#7C2D12",
  fontSize: 11,
  lineHeight: 17,
  marginTop: 5,
},
    screen: {
      flex: 1,
      backgroundColor: "#F5F7FA",
    },

    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#F5F7FA",
    },

    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: "#64748B",
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
      justifyContent: "center",
      alignItems: "center",
      marginRight: 13,
    },

    backIcon: {
      color: "#FFFFFF",
      fontSize: 36,
      lineHeight: 38,
      marginTop: -3,
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
      maxWidth: 850,
      alignSelf: "center",
      padding: 18,
      paddingBottom: 45,
    },

    doctorCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 17,
      padding: 17,
      borderWidth: 1,
      borderColor: "#E5EAF0",
      flexDirection: "row",
      alignItems: "center",
    },

    avatar: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: "#CCFBF1",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 13,
    },

    avatarText: {
      color: "#0F766E",
      fontSize: 18,
      fontWeight: "800",
    },

    doctorInfo: {
      flex: 1,
    },

    doctorName: {
      color: "#172033",
      fontSize: 17,
      fontWeight: "800",
    },

    specialization: {
      color: "#0F766E",
      fontSize: 12,
      fontWeight: "700",
      marginTop: 3,
    },

    doctorMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginTop: 7,
    },

    doctorMeta: {
      color: "#64748B",
      fontSize: 11,
    },

    timeText: {
      color: "#334155",
      fontSize: 12,
      fontWeight: "700",
      marginTop: 6,
    },

    futureCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
      padding: 23,
      alignItems: "center",
      marginTop: 16,
      borderWidth: 1,
      borderColor: "#E5EAF0",
    },

    futureIconContainer: {
      width: 55,
      height: 55,
      borderRadius: 28,
      backgroundColor: "#ECFDF5",
      justifyContent: "center",
      alignItems: "center",
    },

    futureIcon: {
      fontSize: 25,
    },

    futureTitle: {
      color: "#172033",
      fontSize: 18,
      fontWeight: "800",
      marginTop: 13,
    },

    futureText: {
      color: "#64748B",
      fontSize: 12,
      textAlign: "center",
      lineHeight: 18,
      maxWidth: 430,
      marginTop: 6,
    },

    futureTokenBox: {
      alignItems: "center",
      marginTop: 20,
    },

    futureTokenLabel: {
      color: "#64748B",
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1,
    },

    futureTokenNumber: {
      color: "#0F766E",
      fontSize: 42,
      fontWeight: "900",
      marginTop: 2,
    },

    futureDateBox: {
      width: "100%",
      backgroundColor: "#F8FAFC",
      borderRadius: 12,
      padding: 13,
      alignItems: "center",
      marginTop: 17,
    },

    futureDateLabel: {
      color: "#94A3B8",
      fontSize: 10,
      fontWeight: "700",
    },

    futureDateValue: {
      color: "#334155",
      fontSize: 13,
      fontWeight: "800",
      marginTop: 3,
    },

    liveCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
      padding: 20,
      marginTop: 16,
      borderWidth: 1,
      borderColor: "#E5EAF0",
    },

    liveBadge: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#DCFCE7",
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 20,
    },

    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: "#16A34A",
      marginRight: 6,
    },

    liveBadgeText: {
      color: "#166534",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.5,
    },

    tokenArea: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 22,
      marginBottom: 18,
    },

    tokenColumn: {
      flex: 1,
      alignItems: "center",
    },

    tokenLabel: {
      color: "#94A3B8",
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 0.8,
    },

    tokenNumber: {
      color: "#0F766E",
      fontSize: 42,
      fontWeight: "900",
      marginTop: 3,
    },

    servingNumber: {
      color: "#172033",
      fontSize: 34,
      fontWeight: "900",
      marginTop: 5,
    },

    verticalDivider: {
      height: 65,
      width: 1,
      backgroundColor: "#E2E8F0",
    },

    peopleAheadBox: {
      backgroundColor: "#F0FDFA",
      borderRadius: 13,
      padding: 14,
      alignItems: "center",
    },

    peopleAheadNumber: {
      color: "#0F766E",
      fontSize: 24,
      fontWeight: "900",
    },

    peopleAheadLabel: {
      color: "#475569",
      fontSize: 11,
      marginTop: 2,
    },

    queueHint: {
      color: "#94A3B8",
      textAlign: "center",
      fontSize: 11,
      marginTop: 13,
    },

    calledCard: {
      backgroundColor: "#FFF7ED",
      borderColor: "#FED7AA",
      alignItems: "center",
    },

    consultationCard: {
      backgroundColor: "#EFF6FF",
      borderColor: "#BFDBFE",
      alignItems: "center",
    },

    liveIcon: {
      fontSize: 38,
    },

    calledTitle: {
      color: "#C2410C",
      fontSize: 21,
      fontWeight: "900",
      marginTop: 10,
    },

    consultationTitle: {
      color: "#1D4ED8",
      fontSize: 20,
      fontWeight: "900",
      marginTop: 10,
    },

    liveDescription: {
      color: "#475569",
      fontSize: 12,
      textAlign: "center",
      lineHeight: 18,
      maxWidth: 430,
      marginTop: 6,
    },

    sectionTitle: {
      color: "#172033",
      fontSize: 18,
      fontWeight: "800",
      marginTop: 25,
      marginBottom: 11,
    },

    progressCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: "#E5EAF0",
      flexDirection: "row",
      alignItems: "flex-start",
    },

    progressItem: {
      alignItems: "center",
      width: 75,
    },

    progressCircle: {
      width: 39,
      height: 39,
      borderRadius: 20,
      backgroundColor: "#F1F5F9",
      justifyContent: "center",
      alignItems: "center",
    },

    progressCircleActive: {
      backgroundColor: "#CCFBF1",
    },

    progressCircleCurrent: {
      borderWidth: 2,
      borderColor: "#0F766E",
    },

    progressIcon: {
      fontSize: 15,
      opacity: 0.55,
    },

    progressIconActive: {
      opacity: 1,
    },

    progressLabel: {
      color: "#94A3B8",
      fontSize: 9,
      textAlign: "center",
      marginTop: 7,
      fontWeight: "600",
    },

    progressLabelActive: {
      color: "#0F766E",
      fontWeight: "800",
    },

    progressLine: {
      flex: 1,
      height: 2,
      backgroundColor: "#E2E8F0",
      marginTop: 19,
    },

    progressLineActive: {
      backgroundColor: "#0F766E",
    },

    detailsCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: "#E5EAF0",
    },

    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      minHeight: 48,
      gap: 15,
    },

    detailLabel: {
      color: "#64748B",
      fontSize: 12,
    },

    detailValue: {
      flex: 1,
      textAlign: "right",
      color: "#334155",
      fontSize: 12,
      fontWeight: "700",
    },

    detailHighlight: {
      color: "#0F766E",
      fontSize: 17,
      fontWeight: "900",
    },

    divider: {
      height: 1,
      backgroundColor: "#F1F5F9",
    },

    infoNotice: {
      marginTop: 16,
      backgroundColor: "#EFF6FF",
      borderRadius: 13,
      padding: 14,
      flexDirection: "row",
      borderWidth: 1,
      borderColor: "#DBEAFE",
    },

    infoIcon: {
      fontSize: 19,
      marginRight: 10,
    },

    infoNoticeText: {
      flex: 1,
    },

    infoTitle: {
      color: "#1E40AF",
      fontSize: 12,
      fontWeight: "800",
    },

    infoText: {
      color: "#475569",
      fontSize: 11,
      lineHeight: 16,
      marginTop: 3,
    },

    secondaryButton: {
      borderWidth: 1,
      borderColor: "#0F766E",
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: "center",
      marginTop: 17,
    },

    secondaryButtonText: {
      color: "#0F766E",
      fontSize: 13,
      fontWeight: "800",
    },

    emptyCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
      padding: 30,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#E5EAF0",
    },

    emptyIcon: {
      fontSize: 40,
    },

    emptyTitle: {
      color: "#172033",
      fontSize: 18,
      fontWeight: "800",
      marginTop: 10,
    },

    emptyText: {
      color: "#64748B",
      fontSize: 12,
      textAlign: "center",
      lineHeight: 18,
      maxWidth: 400,
      marginTop: 5,
    },

    primaryButton: {
      backgroundColor: "#0F766E",
      borderRadius: 11,
      paddingHorizontal: 18,
      paddingVertical: 12,
      marginTop: 16,
    },

    primaryButtonText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "800",
    },

    noTokenCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 17,
      padding: 25,
      alignItems: "center",
    },

    noTokenIcon: {
      fontSize: 35,
    },

    noTokenTitle: {
      color: "#172033",
      fontSize: 16,
      fontWeight: "800",
      marginTop: 8,
    },

    noTokenText: {
      color: "#64748B",
      fontSize: 12,
      textAlign: "center",
      marginTop: 5,
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
    scheduledNotice: {
  marginTop: 16,
  backgroundColor: "#F0FDFA",
  borderRadius: 13,
  borderWidth: 1,
  borderColor: "#CCFBF1",
  padding: 14,
  flexDirection: "row",
},

scheduledNoticeIcon: {
  fontSize: 18,
  marginRight: 10,
},

scheduledNoticeContent: {
  flex: 1,
},

scheduledNoticeTitle: {
  color: "#0F766E",
  fontSize: 12,
  fontWeight: "800",
},

scheduledNoticeText: {
  color: "#475569",
  fontSize: 11,
  lineHeight: 17,
  marginTop: 3,
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