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

type Appointment = {
  id: number;
  doctor_id: number;
  doctor_name?: string | null;
  specialization?: string | null;
  room_number?: string | null;
  working_hours?: string | null;
  slot_id: number;
  appointment_date: string;
  appointment_time?: string | null;
  appointment_end_time?: string | null;
  appointment_type: "in_person" | "video";
  status:
    | "pending"
    | "confirmed"
    | "in_progress"
    | "completed"
    | "no_show"
    | "cancelled";
  notes?: string | null;
  queue_token?: number | null;
  queue_status?: string | null;
};

export default function AppointmentsScreen() {
  const router = useRouter();

  const [appointments, setAppointments] =
    useState<Appointment[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] =
    useState<number | null>(null);

  const loadAppointments = useCallback(
    async () => {
      try {
        setError("");

        const response = await apiRequest(
          "/api/appointments/my"
        );

        const list = Array.isArray(
          response?.appointments
        )
          ? response.appointments
          : [];

        setAppointments(list);
      } catch (err: any) {
        setError(
          err?.message ||
            "Unable to load appointments."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadAppointments();
    }, [loadAppointments])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadAppointments();
  };

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter((appointment) =>
        [
          "pending",
          "confirmed",
          "in_progress",
        ].includes(appointment.status)
      )
      .sort(compareAppointmentsAscending);
  }, [appointments]);

  const historyAppointments = useMemo(() => {
    return appointments
      .filter((appointment) =>
        [
          "completed",
          "cancelled",
          "no_show",
        ].includes(appointment.status)
      )
      .sort(compareAppointmentsDescending);
  }, [appointments]);

  const cancelAppointment = async (
    appointment: Appointment
  ) => {
    try {
      setCancellingId(appointment.id);

      await apiRequest(
        `/api/appointments/${appointment.id}/cancel`,
        {
          method: "PATCH",
        }
      );

      if (Platform.OS === "web") {
        window.alert(
          "Appointment cancelled successfully."
        );
      } else {
        Alert.alert(
          "Appointment Cancelled",
          "Your appointment has been cancelled successfully."
        );
      }

      await loadAppointments();
    } catch (err: any) {
      const message =
        err?.message ||
        "Unable to cancel appointment.";

      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert(
          "Cancellation Failed",
          message
        );
      }
    } finally {
      setCancellingId(null);
    }
  };

  const requestCancel = (
    appointment: Appointment
  ) => {
    const message =
      `Cancel your appointment with ` +
      `${appointment.doctor_name || "this doctor"} ` +
      `on ${formatDate(
        appointment.appointment_date
      )}?`;

    if (Platform.OS === "web") {
      const confirmed =
        window.confirm(message);

      if (confirmed) {
        cancelAppointment(appointment);
      }

      return;
    }

    Alert.alert(
      "Cancel Appointment",
      message,
      [
        {
          text: "Keep Appointment",
          style: "cancel",
        },
        {
          text: "Cancel Appointment",
          style: "destructive",
          onPress: () =>
            cancelAppointment(appointment),
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading your appointments...
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

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            My Appointments
          </Text>

          <Text style={styles.headerSubtitle}>
            Manage your clinic visits
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
        {/* ERROR */}
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              Unable to load appointments
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>

            <Pressable
              onPress={loadAppointments}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>
                Try Again
              </Text>
            </Pressable>
          </View>
        ) : null}

        {!error ? (
          <>
            {/* SUMMARY */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text
                  style={styles.summaryNumber}
                >
                  {upcomingAppointments.length}
                </Text>

                <Text
                  style={styles.summaryLabel}
                >
                  Upcoming
                </Text>
              </View>

              <View
                style={styles.summaryDivider}
              />

              <View style={styles.summaryItem}>
                <Text
                  style={styles.summaryNumber}
                >
                  {historyAppointments.length}
                </Text>

                <Text
                  style={styles.summaryLabel}
                >
                  History
                </Text>
              </View>

              <View
                style={styles.summaryDivider}
              />

              <View style={styles.summaryItem}>
                <Text
                  style={styles.summaryNumber}
                >
                  {appointments.length}
                </Text>

                <Text
                  style={styles.summaryLabel}
                >
                  Total
                </Text>
              </View>
            </View>

            {/* UPCOMING */}
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Upcoming
                </Text>

                <Text
                  style={styles.sectionSubtitle}
                >
                  Your scheduled clinic visits
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  router.push("/doctors")
                }
                style={styles.newButton}
              >
                <Text
                  style={styles.newButtonText}
                >
                  + Book New
                </Text>
              </Pressable>
            </View>

            {upcomingAppointments.length ===
            0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>
                  📅
                </Text>

                <Text style={styles.emptyTitle}>
                  No upcoming appointments
                </Text>

                <Text style={styles.emptyText}>
                  Book an appointment with an
                  available doctor when you need
                  medical care.
                </Text>

                <Pressable
                  onPress={() =>
                    router.push("/doctors")
                  }
                  style={
                    styles.bookAppointmentButton
                  }
                >
                  <Text
                    style={
                      styles.bookAppointmentText
                    }
                  >
                    Find a Doctor
                  </Text>
                </Pressable>
              </View>
            ) : (
              upcomingAppointments.map(
                (appointment, index) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    isNext={index === 0}
                    cancelling={
                      cancellingId ===
                      appointment.id
                    }
                    onCancel={() =>
                      requestCancel(appointment)
                    }
                  />
                )
              )
            )}

            {/* HISTORY */}
            <View
              style={[
                styles.sectionHeader,
                styles.historyHeader,
              ]}
            >
              <View>
                <Text style={styles.sectionTitle}>
                  Appointment History
                </Text>

                <Text
                  style={styles.sectionSubtitle}
                >
                  Completed, cancelled and missed
                  visits
                </Text>
              </View>
            </View>

            {historyAppointments.length ===
            0 ? (
              <View
                style={styles.historyEmpty}
              >
                <Text
                  style={styles.historyEmptyText}
                >
                  No appointment history yet.
                </Text>
              </View>
            ) : (
              historyAppointments.map(
                (appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    isNext={false}
                    cancelling={false}
                    onCancel={() => {}}
                  />
                )
              )
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function AppointmentCard({
  appointment,
  isNext,
  cancelling,
  onCancel,
}: {
  appointment: Appointment;
  isNext: boolean;
  cancelling: boolean;
  onCancel: () => void;
}) {
  const canCancel =
    appointment.status === "pending" ||
    appointment.status === "confirmed";

  return (
    <View style={styles.appointmentCard}>
      {isNext ? (
        <View style={styles.nextBanner}>
          <Text style={styles.nextBannerText}>
            NEXT APPOINTMENT
          </Text>
        </View>
      ) : null}

      <View style={styles.cardTopRow}>
        <View style={styles.doctorArea}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(
                appointment.doctor_name
              )}
            </Text>
          </View>

          <View style={styles.doctorText}>
            <Text style={styles.doctorName}>
              {appointment.doctor_name ||
                "Doctor"}
            </Text>

            <Text
              style={styles.specialization}
            >
              {appointment.specialization ||
                "Medical Consultation"}
            </Text>
          </View>
        </View>

        <StatusBadge
          status={appointment.status}
        />
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.detailsGrid}>
        <DetailItem
          label="DATE"
          value={formatDate(
            appointment.appointment_date
          )}
        />

        <DetailItem
          label="TIME"
          value={formatTimeRange(
            appointment.appointment_time,
            appointment.appointment_end_time
          )}
        />

        <DetailItem
          label="TOKEN"
          value={
            appointment.queue_token != null
              ? `#${appointment.queue_token}`
              : "—"
          }
          highlight={
            appointment.queue_token != null
          }
        />
      </View>

      <View style={styles.secondaryDetails}>
        <View style={styles.secondaryRow}>
          <Text
            style={styles.secondaryLabel}
          >
            Visit type
          </Text>

          <Text
            style={styles.secondaryValue}
          >
            {appointment.appointment_type ===
            "video"
              ? "Video Consultation"
              : "In-Person"}
          </Text>
        </View>

        {appointment.room_number ? (
          <View style={styles.secondaryRow}>
            <Text
              style={styles.secondaryLabel}
            >
              Room
            </Text>

            <Text
              style={styles.secondaryValue}
            >
              {appointment.room_number}
            </Text>
          </View>
        ) : null}

        {appointment.queue_status ? (
          <View style={styles.secondaryRow}>
            <Text
              style={styles.secondaryLabel}
            >
              Queue status
            </Text>

            <Text
              style={styles.secondaryValue}
            >
              {formatStatus(
                appointment.queue_status
              )}
            </Text>
          </View>
        ) : null}
      </View>

      {appointment.notes ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>
            Reason for visit
          </Text>

          <Text style={styles.notesText}>
            {appointment.notes}
          </Text>
        </View>
      ) : null}

      {canCancel ? (
        <Pressable
          disabled={cancelling}
          onPress={onCancel}
          style={({ pressed }) => [
            styles.cancelButton,
            cancelling &&
              styles.cancelButtonDisabled,
            pressed &&
              !cancelling &&
              styles.pressed,
          ]}
        >
          {cancelling ? (
            <View
              style={styles.cancelLoading}
            >
              <ActivityIndicator
                size="small"
                color="#B91C1C"
              />

              <Text
                style={styles.cancelButtonText}
              >
                Cancelling...
              </Text>
            </View>
          ) : (
            <Text
              style={styles.cancelButtonText}
            >
              Cancel Appointment
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

function DetailItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text
        style={[
          styles.detailValue,
          highlight &&
            styles.detailValueHighlight,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function StatusBadge({
  status,
}: {
  status: Appointment["status"];
}) {
  const config = getStatusConfig(status);

  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor:
            config.backgroundColor,
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
  status: Appointment["status"]
) {
  switch (status) {
    case "confirmed":
      return {
        label: "Confirmed",
        color: "#166534",
        backgroundColor: "#DCFCE7",
      };

    case "pending":
      return {
        label: "Pending",
        color: "#92400E",
        backgroundColor: "#FEF3C7",
      };

    case "in_progress":
      return {
        label: "In Progress",
        color: "#075985",
        backgroundColor: "#E0F2FE",
      };

    case "completed":
      return {
        label: "Completed",
        color: "#1E40AF",
        backgroundColor: "#DBEAFE",
      };

    case "cancelled":
      return {
        label: "Cancelled",
        color: "#991B1B",
        backgroundColor: "#FEE2E2",
      };

    case "no_show":
      return {
        label: "No Show",
        color: "#475569",
        backgroundColor: "#E2E8F0",
      };

    default:
      return {
        label: formatStatus(status),
        color: "#475569",
        backgroundColor: "#E2E8F0",
      };
  }
}

function compareAppointmentsAscending(
  a: Appointment,
  b: Appointment
) {
  return (
    getAppointmentTimestamp(a) -
    getAppointmentTimestamp(b)
  );
}

function compareAppointmentsDescending(
  a: Appointment,
  b: Appointment
) {
  return (
    getAppointmentTimestamp(b) -
    getAppointmentTimestamp(a)
  );
}

function getAppointmentTimestamp(
  appointment: Appointment
) {
  const date =
    appointment.appointment_date ||
    "1970-01-01";

  const time =
    appointment.appointment_time ||
    "00:00";

  return new Date(
    `${date}T${time}:00`
  ).getTime();
}

function formatDate(dateString: string) {
  if (!dateString) {
    return "Not available";
  }

  const [year, month, day] =
    dateString.split("-").map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

  return date.toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function formatTimeRange(
  start?: string | null,
  end?: string | null
) {
  if (!start) {
    return "Not available";
  }

  if (!end) {
    return formatTime(start);
  }

  return `${formatTime(
    start
  )} - ${formatTime(end)}`;
}

function formatTime(time: string) {
  const [hourString, minute = "00"] =
    time.split(":");

  const hour = Number(hourString);

  const period =
    hour >= 12 ? "PM" : "AM";

  const displayHour =
    hour % 12 || 12;

  return `${displayHour}:${minute} ${period}`;
}

function formatStatus(status: string) {
  return status
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

  const cleaned = name.replace(
    /^Dr\.?\s*/i,
    ""
  );

  return (
    cleaned
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part.charAt(0).toUpperCase()
      )
      .join("") || "DR"
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  center: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 12,
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

  headerContent: {
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
    paddingVertical: 17,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8EDF2",
  },

  summaryItem: {
    flex: 1,
    alignItems: "center",
  },

  summaryNumber: {
    color: "#0F766E",
    fontSize: 22,
    fontWeight: "800",
  },

  summaryLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },

  summaryDivider: {
    width: 1,
    height: 34,
    backgroundColor: "#E2E8F0",
  },

  sectionHeader: {
    marginTop: 25,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  sectionTitle: {
    color: "#172033",
    fontSize: 19,
    fontWeight: "800",
  },

  sectionSubtitle: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 3,
  },

  newButton: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
  },

  newButtonText: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "800",
  },

  appointmentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 17,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#E5EAF0",
    overflow: "hidden",
  },

  nextBanner: {
    backgroundColor: "#ECFDF5",
    marginHorizontal: -17,
    marginTop: -17,
    paddingHorizontal: 17,
    paddingVertical: 8,
    marginBottom: 15,
  },

  nextBannerText: {
    color: "#0F766E",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
  },

  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  doctorArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#CCFBF1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  avatarText: {
    color: "#0F766E",
    fontSize: 15,
    fontWeight: "800",
  },

  doctorText: {
    flex: 1,
  },

  doctorName: {
    color: "#172033",
    fontSize: 16,
    fontWeight: "800",
  },

  specialization: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },

  statusBadge: {
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },

  cardDivider: {
    height: 1,
    backgroundColor: "#EEF2F6",
    marginVertical: 15,
  },

  detailsGrid: {
    flexDirection: "row",
  },

  detailItem: {
    flex: 1,
  },

  detailLabel: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "800",
    marginBottom: 4,
  },

  detailValue: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
  },

  detailValueHighlight: {
    color: "#0F766E",
    fontSize: 15,
    fontWeight: "800",
  },

  secondaryDetails: {
    backgroundColor: "#F8FAFC",
    borderRadius: 11,
    padding: 12,
    marginTop: 15,
  },

  secondaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginVertical: 3,
  },

  secondaryLabel: {
    color: "#64748B",
    fontSize: 11,
  },

  secondaryValue: {
    flex: 1,
    textAlign: "right",
    color: "#334155",
    fontSize: 11,
    fontWeight: "700",
  },

  notesBox: {
    marginTop: 13,
    borderLeftWidth: 3,
    borderLeftColor: "#0F766E",
    backgroundColor: "#F8FAFC",
    padding: 11,
    borderRadius: 6,
  },

  notesLabel: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  notesText: {
    color: "#334155",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },

  cancelButton: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FFF7F7",
    borderRadius: 11,
    alignItems: "center",
    paddingVertical: 11,
  },

  cancelButtonDisabled: {
    opacity: 0.6,
  },

  cancelButtonText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "800",
  },

  cancelLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5EAF0",
  },

  emptyIcon: {
    fontSize: 37,
  },

  emptyTitle: {
    color: "#172033",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 9,
  },

  emptyText: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 400,
    marginTop: 5,
  },

  bookAppointmentButton: {
    backgroundColor: "#0F766E",
    borderRadius: 10,
    paddingHorizontal: 17,
    paddingVertical: 11,
    marginTop: 14,
  },

  bookAppointmentText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  historyHeader: {
    marginTop: 30,
  },

  historyEmpty: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
  },

  historyEmptyText: {
    color: "#94A3B8",
    fontSize: 12,
  },

  errorCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 16,
    marginBottom: 15,
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
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 13,
    paddingVertical: 8,
    marginTop: 10,
  },

  retryText: {
    color: "#991B1B",
    fontSize: 12,
    fontWeight: "800",
  },

  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },
});