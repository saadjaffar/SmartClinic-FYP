import React, {
  useCallback,
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
import {
  clearAuth,
} from "../storage/authStorage";

type DoctorInfo = {
  id: number;
  name?: string | null;
  specialization?: string | null;
  room_number?: string | null;
  working_hours?: string | null;
  duty_status: "on_duty" | "off_duty";
};

type TodayStats = {
  date?: string;
  total_appointments: number;
  completed: number;
  waiting: number;
  cancelled: number;
};

type QueueSummary = {
  current_token?: number | null;
  current_status?: string | null;
  current_queue_id?: number | null;

  next_token?: number | null;
  next_queue_id?: number | null;
};

type DashboardResponse = {
  status: string;
  message: string;
  doctor: DoctorInfo;
  today: TodayStats;
  queue: QueueSummary;
};

export default function DoctorScreen() {
  const router = useRouter();

  const [doctor, setDoctor] =
    useState<DoctorInfo | null>(null);

  const [today, setToday] =
    useState<TodayStats | null>(null);

  const [queue, setQueue] =
    useState<QueueSummary | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [changingDuty, setChangingDuty] =
    useState(false);

  const [callingNext, setCallingNext] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadDashboard = useCallback(
    async () => {
      try {
        setError("");

        const response: DashboardResponse =
          await apiRequest(
            "/api/doctors/dashboard"
          );

        setDoctor(
          response?.doctor || null
        );

        setToday(
          response?.today || null
        );

        setQueue(
          response?.queue || null
        );
      } catch (err: any) {
        setError(
          err?.message ||
            "Unable to load doctor dashboard."
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
      loadDashboard();
    }, [loadDashboard])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const handleDutyToggle = async () => {
    if (!doctor) {
      return;
    }

    const nextStatus =
      doctor.duty_status === "on_duty"
        ? "off_duty"
        : "on_duty";

    try {
      setChangingDuty(true);

      const response =
        await apiRequest(
          "/api/doctors/duty",
          {
            method: "PATCH",
            body: JSON.stringify({
              duty_status: nextStatus,
            }),
          }
        );

      setDoctor((current) =>
        current
          ? {
              ...current,
              duty_status:
                response?.duty_status ||
                nextStatus,
            }
          : current
      );

      showMessage(
        "Duty Status Updated",
        nextStatus === "on_duty"
          ? "You are now available for patients."
          : "You are now marked off duty."
      );
    } catch (err: any) {
      showMessage(
        "Update Failed",
        err?.message ||
          "Unable to update duty status."
      );
    } finally {
      setChangingDuty(false);
    }
  };

  const handleCallNext = async () => {
    if (!doctor) {
      return;
    }

    if (
      doctor.duty_status !== "on_duty"
    ) {
      showMessage(
        "Doctor Off Duty",
        "Please mark yourself on duty before calling the next patient."
      );

      return;
    }

    if (
      queue?.current_token != null
    ) {
      showMessage(
        "Current Patient Active",
        "Complete the current patient before calling the next one."
      );

      return;
    }

    if (
      !today ||
      today.waiting <= 0
    ) {
      showMessage(
        "No Waiting Patients",
        "There are no patients waiting in today's queue."
      );

      return;
    }

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

      await loadDashboard();
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

  const handleLogout = () => {
    if (Platform.OS === "web") {
      const confirmed =
        window.confirm(
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

  const performLogout = async () => {
    await clearAuth();
    router.replace("/");
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
        />

        <Text
          style={styles.loadingText}
        >
          Loading doctor dashboard...
        </Text>
      </View>
    );
  }

  const doctorName =
    doctor?.name ||
    "Doctor";

  const doctorInitials =
    getInitials(doctorName);

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text
                style={
                  styles.welcomeText
                }
              >
                Welcome back
              </Text>

              <Text
                style={
                  styles.doctorName
                }
              >
                {doctorName}
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                Manage today's clinic workflow
              </Text>
            </View>

            <View
              style={
                styles.headerAvatar
              }
            >
              <Text
                style={
                  styles.headerAvatarText
                }
              >
                {doctorInitials}
              </Text>
            </View>
          </View>

          <View style={styles.doctorMeta}>
            <Text
              style={styles.metaText}
            >
              🩺{" "}
              {doctor?.specialization ||
                "Specialist"}
            </Text>

            <Text
              style={styles.metaText}
            >
              📍{" "}
              {doctor?.room_number ||
                "Room not assigned"}
            </Text>

            <Text
              style={styles.metaText}
            >
              🕒{" "}
              {doctor?.working_hours ||
                "Hours not set"}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* ERROR */}
          {error ? (
            <View
              style={styles.errorCard}
            >
              <Text
                style={
                  styles.errorTitle
                }
              >
                Unable to load dashboard
              </Text>

              <Text
                style={
                  styles.errorText
                }
              >
                {error}
              </Text>

              <Pressable
                onPress={
                  loadDashboard
                }
                style={
                  styles.retryButton
                }
              >
                <Text
                  style={
                    styles.retryText
                  }
                >
                  Try Again
                </Text>
              </Pressable>
            </View>
          ) : null}

          {!error && doctor ? (
            <>
              {/* DUTY STATUS */}
              <View
                style={
                  styles.dutyCard
                }
              >
                <View
                  style={
                    styles.dutyLeft
                  }
                >
                  <View
                    style={[
                      styles.dutyIndicator,
                      doctor.duty_status ===
                      "on_duty"
                        ? styles.dutyOn
                        : styles.dutyOff,
                    ]}
                  />

                  <View>
                    <Text
                      style={
                        styles.dutyTitle
                      }
                    >
                      {doctor.duty_status ===
                      "on_duty"
                        ? "You are On Duty"
                        : "You are Off Duty"}
                    </Text>

                    <Text
                      style={
                        styles.dutySubtitle
                      }
                    >
                      {doctor.duty_status ===
                      "on_duty"
                        ? "Patients can currently book with you."
                        : "Patients cannot currently book with you."}
                    </Text>
                  </View>
                </View>

                <Pressable
                  disabled={
                    changingDuty
                  }
                  onPress={
                    handleDutyToggle
                  }
                  style={({ pressed }) => [
                    styles.dutyButton,
                    doctor.duty_status ===
                    "on_duty"
                      ? styles.dutyButtonOff
                      : styles.dutyButtonOn,
                    changingDuty &&
                      styles.disabled,
                    pressed &&
                      !changingDuty &&
                      styles.pressed,
                  ]}
                >
                  {changingDuty ? (
                    <ActivityIndicator
                      size="small"
                    />
                  ) : (
                    <Text
                      style={[
                        styles.dutyButtonText,
                        doctor.duty_status ===
                        "on_duty"
                          ? styles.dutyButtonTextOff
                          : styles.dutyButtonTextOn,
                      ]}
                    >
                      {doctor.duty_status ===
                      "on_duty"
                        ? "Go Off Duty"
                        : "Go On Duty"}
                    </Text>
                  )}
                </Pressable>
              </View>

              {/* TODAY */}
              <View
                style={
                  styles.sectionHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Today's Overview
                  </Text>

                  <Text
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    {formatDate(
                      today?.date
                    )}
                  </Text>
                </View>
              </View>

              <View
                style={styles.statsGrid}
              >
                <StatCard
                  icon="📅"
                  value={
                    today?.total_appointments ??
                    0
                  }
                  label="Appointments"
                />

                <StatCard
                  icon="⏳"
                  value={
                    today?.waiting ?? 0
                  }
                  label="Waiting"
                />

                <StatCard
                  icon="✓"
                  value={
                    today?.completed ?? 0
                  }
                  label="Completed"
                />

                <StatCard
                  icon="✕"
                  value={
                    today?.cancelled ?? 0
                  }
                  label="Cancelled"
                />
              </View>

              {/* QUEUE */}
              <Text
                style={
                  styles.sectionTitleStandalone
                }
              >
                Live Queue
              </Text>

              <View
                style={styles.queueCard}
              >
                <View
                  style={
                    styles.queueTop
                  }
                >
                  <View
                    style={
                      styles.queueTokenBox
                    }
                  >
                    <Text
                      style={
                        styles.queueLabel
                      }
                    >
                      CURRENT TOKEN
                    </Text>

                    <Text
                      style={
                        styles.currentToken
                      }
                    >
                      {queue?.current_token !=
                      null
                        ? `#${queue.current_token}`
                        : "—"}
                    </Text>

                    <Text
                      style={
                        styles.queueStatus
                      }
                    >
                      {queue?.current_status
                        ? formatStatus(
                            queue.current_status
                          )
                        : "No active patient"}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.queueDivider
                    }
                  />

                  <View
                    style={
                      styles.queueTokenBox
                    }
                  >
                    <Text
                      style={
                        styles.queueLabel
                      }
                    >
                      NEXT TOKEN
                    </Text>

                    <Text
                      style={
                        styles.nextToken
                      }
                    >
                      {queue?.next_token !=
                      null
                        ? `#${queue.next_token}`
                        : "—"}
                    </Text>

                    <Text
                      style={
                        styles.queueStatus
                      }
                    >
                      {today?.waiting
                        ? `${today.waiting} waiting`
                        : "Queue clear"}
                    </Text>
                  </View>
                </View>

                <Pressable
                  disabled={
                    callingNext ||
                    doctor.duty_status !==
                      "on_duty" ||
                    (today?.waiting ?? 0) ===
                      0 ||
                    queue?.current_token !=
                      null
                  }
                  onPress={
                    handleCallNext
                  }
                  style={({ pressed }) => [
                    styles.callNextButton,

                    (
                      callingNext ||
                      doctor.duty_status !==
                        "on_duty" ||
                      (today?.waiting ??
                        0) === 0 ||
                      queue?.current_token !=
                        null
                    ) &&
                      styles.callNextDisabled,

                    pressed &&
                      !callingNext &&
                      styles.pressed,
                  ]}
                >
                  {callingNext ? (
                    <View
                      style={
                        styles.buttonLoading
                      }
                    >
                      <ActivityIndicator
                        size="small"
                        color="#FFFFFF"
                      />

                      <Text
                        style={
                          styles.callNextText
                        }
                      >
                        Calling...
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={
                        styles.callNextText
                      }
                    >
                      🔔 Call Next Patient
                    </Text>
                  )}
                </Pressable>

                {queue?.current_token !=
                null ? (
                  <View
                    style={
                      styles.currentPatientNotice
                    }
                  >
                    <Text
                      style={
                        styles.currentPatientIcon
                      }
                    >
                      ℹ️
                    </Text>

                    <Text
                      style={
                        styles.currentPatientText
                      }
                    >
                      Finish the current patient
                      before calling the next token.
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* QUICK ACCESS */}
              <Text
                style={
                  styles.sectionTitleStandalone
                }
              >
                Clinic Tools
              </Text>

              <View
                style={
                  styles.toolsCard
                }
              >
                <ToolRow
                 icon="🎫"
                 title="Today's Queue"
                 subtitle="View and manage today's patients"
                onPress={() =>
                router.push("/doctor-queue")
                }
                />

                <View
                  style={
                    styles.toolDivider
                  }
                />

                <ToolRow
                  icon="🗓️"
                  title="My Schedule"
                  subtitle="Manage working days and appointment slots"
                  onPress={() =>
                    router.push("/doctor-schedule")
                  }
                />

                <View
                  style={
                    styles.toolDivider
                  }
                />

                <ToolRow
                  icon="📝"
                  title="Consultations"
                  subtitle="Record diagnosis, prescription and notes"
                />
              </View>

              {/* ACCOUNT */}
              <Text
                style={
                  styles.sectionTitleStandalone
                }
              >
                Account
              </Text>

              <Pressable
                onPress={
                  handleLogout
                }
                style={({ pressed }) => [
                  styles.logoutCard,
                  pressed &&
                    styles.pressed,
                ]}
              >
                <View
                  style={
                    styles.logoutIcon
                  }
                >
                  <Text>↪</Text>
                </View>

                <View
                  style={
                    styles.logoutContent
                  }
                >
                  <Text
                    style={
                      styles.logoutTitle
                    }
                  >
                    Logout
                  </Text>

                  <Text
                    style={
                      styles.logoutSubtitle
                    }
                  >
                    Sign out of SmartClinic
                  </Text>
                </View>

                <Text
                  style={
                    styles.logoutArrow
                  }
                >
                  ›
                </Text>
              </Pressable>

              <View
                style={styles.footer}
              >
                <Text
                  style={
                    styles.footerTitle
                  }
                >
                  SmartClinic Doctor
                </Text>

                <Text
                  style={
                    styles.footerText
                  }
                >
                  Efficient care, better workflow.
                </Text>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Text>{icon}</Text>
      </View>

      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

function ToolRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolRow,
        pressed &&
          onPress &&
          styles.pressed,
      ]}
    >
      <View style={styles.toolIcon}>
        <Text>{icon}</Text>
      </View>

      <View style={styles.toolText}>
        <Text style={styles.toolTitle}>
          {title}
        </Text>

        <Text style={styles.toolSubtitle}>
          {subtitle}
        </Text>
      </View>

      {onPress ? (
        <Text style={styles.toolArrow}>
          ›
        </Text>
      ) : (
        <Text style={styles.toolComing}>
          Soon
        </Text>
      )}
    </Pressable>
  );
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

function formatDate(
  dateString?: string
) {
  if (!dateString) {
    return "Today";
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
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
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
  name: string
) {
  const cleaned =
    name.replace(
      /^Dr\.?\s*/i,
      ""
    );

  return (
    cleaned
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part
          .charAt(0)
          .toUpperCase()
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
    paddingTop: 55,
    paddingBottom: 25,
    paddingHorizontal: 20,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  welcomeText: {
    color: "#D1FAE5",
    fontSize: 13,
  },

  doctorName: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 4,
  },

  headerSubtitle: {
    color: "#CCFBF1",
    fontSize: 12,
    marginTop: 5,
  },

  headerAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  headerAvatarText: {
    color: "#0F766E",
    fontSize: 17,
    fontWeight: "900",
  },

  doctorMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 18,
  },

  metaText: {
    color: "#ECFDF5",
    fontSize: 11,
  },

  content: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    padding: 18,
    paddingBottom: 45,
  },

  dutyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5EAF0",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
  },

  dutyLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  dutyIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 11,
  },

  dutyOn: {
    backgroundColor: "#16A34A",
  },

  dutyOff: {
    backgroundColor: "#94A3B8",
  },

  dutyTitle: {
    color: "#172033",
    fontSize: 14,
    fontWeight: "800",
  },

  dutySubtitle: {
    color: "#64748B",
    fontSize: 10,
    marginTop: 3,
    maxWidth: 360,
  },

  dutyButton: {
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    minWidth: 100,
    alignItems: "center",
  },

  dutyButtonOn: {
    backgroundColor: "#0F766E",
  },

  dutyButtonOff: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  dutyButtonText: {
    fontSize: 11,
    fontWeight: "800",
  },

  dutyButtonTextOn: {
    color: "#FFFFFF",
  },

  dutyButtonTextOff: {
    color: "#B91C1C",
  },

  sectionHeader: {
    marginTop: 25,
    marginBottom: 12,
  },

  sectionTitle: {
    color: "#172033",
    fontSize: 19,
    fontWeight: "800",
  },

  sectionSubtitle: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 3,
  },

  sectionTitleStandalone: {
    color: "#172033",
    fontSize: 19,
    fontWeight: "800",
    marginTop: 25,
    marginBottom: 12,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  statCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E5EAF0",
    padding: 15,
    marginBottom: 11,
  },

  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
  },

  statValue: {
    color: "#0F766E",
    fontSize: 25,
    fontWeight: "900",
    marginTop: 10,
  },

  statLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },

  queueCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E5EAF0",
    padding: 17,
  },

  queueTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  queueTokenBox: {
    flex: 1,
    alignItems: "center",
  },

  queueLabel: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
  },

  currentToken: {
    color: "#0F766E",
    fontSize: 38,
    fontWeight: "900",
    marginTop: 4,
  },

  nextToken: {
    color: "#172033",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 7,
  },

  queueStatus: {
    color: "#64748B",
    fontSize: 10,
    marginTop: 4,
  },

  queueDivider: {
    width: 1,
    height: 70,
    backgroundColor: "#E2E8F0",
  },

  callNextButton: {
    backgroundColor: "#0F766E",
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 17,
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

  buttonLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  currentPatientNotice: {
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    padding: 11,
    marginTop: 12,
    flexDirection: "row",
  },

  currentPatientIcon: {
    marginRight: 8,
  },

  currentPatientText: {
    flex: 1,
    color: "#475569",
    fontSize: 10,
    lineHeight: 15,
  },

  toolsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5EAF0",
    paddingHorizontal: 15,
  },

  toolRow: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
  },

  toolIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  toolText: {
    flex: 1,
  },

  toolTitle: {
    color: "#172033",
    fontSize: 12,
    fontWeight: "800",
  },

  toolSubtitle: {
    color: "#94A3B8",
    fontSize: 9,
    marginTop: 3,
  },

  toolComing: {
    color: "#0F766E",
    fontSize: 9,
    fontWeight: "800",
    backgroundColor: "#ECFDF5",
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  toolDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },

  logoutCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E5EAF0",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  logoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },

  logoutContent: {
    flex: 1,
    marginLeft: 11,
  },

  logoutTitle: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "800",
  },

  logoutSubtitle: {
    color: "#94A3B8",
    fontSize: 10,
    marginTop: 3,
  },

  logoutArrow: {
    color: "#94A3B8",
    fontSize: 26,
  },

  footer: {
    alignItems: "center",
    paddingVertical: 28,
  },

  footerTitle: {
    color: "#0F766E",
    fontSize: 13,
    fontWeight: "800",
  },

  footerText: {
    color: "#94A3B8",
    fontSize: 10,
    marginTop: 3,
  },

  errorCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
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
  toolArrow: {
  color: "#94A3B8",
  fontSize: 25,
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