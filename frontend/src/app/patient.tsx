import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Platform,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { apiRequest } from "../api/client";
import { clearAuth, getUser } from "../storage/authStorage";

type Appointment = {
  id: number;
  appointment_date?: string;
  appointment_time?: string;
  status?: string;
  appointment_type?: string;
  notes?: string;
  doctor?: {
    id?: number;
    name?: string;
    specialization?: string;
  };
  doctor_name?: string;
  specialization?: string;
  token_number?: number;
  queue_token?: number;
};

export default function PatientScreen() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setError("");

      const storedUser = await getUser();
      setUser(storedUser);

      const appointmentResponse = await apiRequest(
        "/api/appointments/my"
      );

      const appointmentData =
        appointmentResponse?.appointments ??
        appointmentResponse?.data ??
        appointmentResponse;

      setAppointments(
        Array.isArray(appointmentData) ? appointmentData : []
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to load your dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const performLogout = async () => {
  await clearAuth();
  router.replace("/");
};

const handleLogout = () => {
  if (Platform.OS === "web") {
    const confirmed = window.confirm(
      "Are you sure you want to logout?"
    );

    if (confirmed) {
      performLogout();
    }

    return;
  }

  Alert.alert(
    "Logout",
    "Are you sure you want to logout?",
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: performLogout,
      },
    ]
  );
};

  const upcomingAppointments = appointments
  .filter(
    (appointment) =>
      appointment.status !== "completed" &&
      appointment.status !== "cancelled" &&
      appointment.status !== "no_show"
  )
  .sort((a, b) => {
    const dateTimeA = new Date(
      `${a.appointment_date}T${a.appointment_time || "00:00"}:00`
    ).getTime();

    const dateTimeB = new Date(
      `${b.appointment_date}T${b.appointment_time || "00:00"}:00`
    ).getTime();

    return dateTimeA - dateTimeB;
  });

const upcomingAppointment =
  upcomingAppointments[0];

  const patientName =
    user?.name ||
    user?.full_name ||
    "Patient";

  const firstName = patientName.split(" ")[0];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>
          Loading your dashboard...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Welcome back
            </Text>

            <Text style={styles.patientName}>
              {patientName}
            </Text>

            <Text style={styles.headerSubtitle}>
              Manage your healthcare with SmartClinic
            </Text>
          </View>

          <Pressable
            style={styles.profileButton}
            onPress={() => router.push("/profile")}
          >
            <Text style={styles.profileInitial}>
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          {/* Error */}
          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>
                Unable to load data
              </Text>

              <Text style={styles.errorText}>
                {error}
              </Text>

              <Pressable
                style={styles.retryButton}
                onPress={loadDashboard}
              >
                <Text style={styles.retryText}>
                  Try Again
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Upcoming appointment */}
          <Text style={styles.sectionTitle}>
            Upcoming appointment
          </Text>

          {upcomingAppointment ? (
            <View style={styles.appointmentCard}>
              <View style={styles.appointmentTop}>
                <View>
                  <Text style={styles.appointmentLabel}>
                    NEXT APPOINTMENT
                  </Text>

                  <Text style={styles.doctorName}>
                    {upcomingAppointment.doctor?.name ||
                      upcomingAppointment.doctor_name ||
                      "Doctor"}
                  </Text>

                  <Text style={styles.specialization}>
                    {upcomingAppointment.doctor?.specialization ||
                      upcomingAppointment.specialization ||
                      "Medical Consultation"}
                  </Text>
                </View>

                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {upcomingAppointment.status || "Booked"}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.appointmentInfo}>
                <View>
                  <Text style={styles.infoLabel}>
                    Date
                  </Text>

                  <Text style={styles.infoValue}>
                    {upcomingAppointment.appointment_date ||
                      "Not available"}
                  </Text>
                </View>

                <View>
                  <Text style={styles.infoLabel}>
                    Time
                  </Text>

                  <Text style={styles.infoValue}>
                    {upcomingAppointment.appointment_time ||
                      "Not available"}
                  </Text>
                </View>

                {(upcomingAppointment.token_number ||
                  upcomingAppointment.queue_token) ? (
                  <View>
                    <Text style={styles.infoLabel}>
                      Token
                    </Text>

                    <Text style={styles.tokenValue}>
                      #
                      {upcomingAppointment.token_number ||
                        upcomingAppointment.queue_token}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Pressable
                style={styles.primaryButton}
                onPress={() =>
                  router.push("/appointments")
                }
              >
                <Text style={styles.primaryButtonText}>
                  View Appointment
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>
                📅
              </Text>

              <Text style={styles.emptyTitle}>
                No upcoming appointments
              </Text>

              <Text style={styles.emptyText}>
                Book an appointment with a doctor to get
                started.
              </Text>

              <Pressable
                style={styles.primaryButton}
                onPress={() => router.push("/doctors")}
              >
                <Text style={styles.primaryButtonText}>
                  Book Appointment
                </Text>
              </Pressable>
            </View>
          )}

          {/* Quick actions */}
          <Text style={styles.sectionTitle}>
            Quick actions
          </Text>

          <View style={styles.actionGrid}>
            <ActionCard
              icon="🩺"
              title="Book Appointment"
              subtitle="Find a doctor"
              onPress={() => router.push("/doctors")}
            />

            <ActionCard
              icon="📋"
              title="My Appointments"
              subtitle="View bookings"
              onPress={() => router.push("/appointments")}
            />

            <ActionCard
              icon="🎫"
              title="Queue Status"
              subtitle="Track your token"
              onPress={() => router.push("/queue")}
            />

            <ActionCard
              icon="📄"
              title="Consultations"
              subtitle="Medical history"
              onPress={() =>
                router.push("/consultations")
              }
            />
          </View>

          {/* Account */}
          <Text style={styles.sectionTitle}>
            Account
          </Text>

          <View style={styles.accountCard}>
            <Pressable
              style={styles.accountRow}
              onPress={() => router.push("/profile")}
            >
              <View style={styles.accountIcon}>
                <Text>👤</Text>
              </View>

              <View style={styles.accountText}>
                <Text style={styles.accountTitle}>
                  My Profile
                </Text>

                <Text style={styles.accountSubtitle}>
                  Personal information
                </Text>
              </View>

              <Text style={styles.arrow}>
                ›
              </Text>
            </Pressable>

            <View style={styles.accountDivider} />

            <Pressable
              style={styles.accountRow}
              onPress={handleLogout}
            >
              <View style={styles.accountIcon}>
                <Text>↪</Text>
              </View>

              <View style={styles.accountText}>
                <Text style={styles.logoutTitle}>
                  Logout
                </Text>

                <Text style={styles.accountSubtitle}>
                  Sign out of SmartClinic
                </Text>
              </View>

              <Text style={styles.arrow}>
                ›
              </Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              SmartClinic
            </Text>

            <Text style={styles.footerSubtext}>
              Your healthcare, simplified.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ActionCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionCard,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.actionIcon}>
        <Text style={styles.actionIconText}>
          {icon}
        </Text>
      </View>

      <Text style={styles.actionTitle}>
        {title}
      </Text>

      <Text style={styles.actionSubtitle}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F8FA",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F6F8FA",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#64748B",
  },

  header: {
    backgroundColor: "#0F766E",
    paddingTop: 58,
    paddingBottom: 28,
    paddingHorizontal: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  greeting: {
    color: "#D1FAE5",
    fontSize: 14,
    marginBottom: 4,
  },

  patientName: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "#CCFBF1",
    fontSize: 13,
    marginTop: 5,
    maxWidth: 250,
  },

  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  profileInitial: {
    color: "#0F766E",
    fontSize: 20,
    fontWeight: "800",
  },

  content: {
    padding: 18,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#172033",
    marginTop: 8,
    marginBottom: 12,
  },

  appointmentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 10,
    elevation: 2,
  },

  appointmentTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  appointmentLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F766E",
    letterSpacing: 0.7,
    marginBottom: 6,
  },

  doctorName: {
    fontSize: 19,
    fontWeight: "800",
    color: "#172033",
  },

  specialization: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 3,
  },

  statusBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  statusText: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "800",
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 16,
  },

  appointmentInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  infoLabel: {
    fontSize: 11,
    color: "#94A3B8",
    marginBottom: 4,
  },

  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },

  tokenValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F766E",
  },

  primaryButton: {
    backgroundColor: "#0F766E",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 18,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
  },

  emptyIcon: {
    fontSize: 34,
    marginBottom: 8,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#172033",
  },

  emptyText: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
    marginTop: 5,
  },

  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  actionCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
  },

  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },

  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  actionIconText: {
    fontSize: 21,
  },

  actionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#172033",
  },

  actionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },

  accountCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 15,
  },

  accountRow: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
  },

  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },

  accountText: {
    flex: 1,
    marginLeft: 12,
  },

  accountTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#172033",
  },

  logoutTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },

  accountSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 3,
  },

  arrow: {
    fontSize: 27,
    color: "#94A3B8",
  },

  accountDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
  },

  errorCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,
  },

  errorTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#991B1B",
  },

  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    marginTop: 4,
  },

  retryButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
  },

  retryText: {
    color: "#991B1B",
    fontWeight: "700",
  },

  footer: {
    alignItems: "center",
    paddingVertical: 30,
  },

  footerText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F766E",
  },

  footerSubtext: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 3,
  },
});