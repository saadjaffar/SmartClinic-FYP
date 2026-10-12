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
  Ionicons,
} from "@expo/vector-icons";

import {
  useFocusEffect,
  useRouter,
} from "expo-router";

import {
  apiRequest,
} from "../api/client";


type PatientInfo = {
  id?: number | null;
  name?: string | null;
  email?: string | null;
  contact?: string | null;
  age?: number | null;
  gender?: string | null;
};


type DoctorInfo = {
  id?: number | null;
  name?: string | null;
  specialization?: string | null;
  room_number?: string | null;
};


type SlotInfo = {
  start_time?: string | null;
  end_time?: string | null;
};


type QueueInfo = {
  id?: number | null;
  token_number?: number | null;
  status?: string | null;
  priority?: string | null;
  checked_in?: boolean;
  check_in_time?: string | null;
};


type Appointment = {
  id: number;
  appointment_date: string;
  appointment_type?: string;
  status?: string;
  notes?: string | null;
  patient?: PatientInfo;
  doctor?: DoctorInfo;
  slot?: SlotInfo;
  queue?: QueueInfo;
};


export default function ReceptionistAppointmentsScreen() {
  const router =
    useRouter();


  const [
    appointments,
    setAppointments,
  ] = useState<
    Appointment[]
  >([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    refreshing,
    setRefreshing,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    checkingInId,
    setCheckingInId,
  ] = useState<
    number | null
  >(null);


  // =========================================================
  // LOAD APPOINTMENTS
  // =========================================================

  const loadAppointments =
    useCallback(async () => {
      try {
        setError("");

        const response =
          await apiRequest(
            "/api/receptionist/appointments/today"
          );


        setAppointments(
          Array.isArray(
            response?.appointments
          )
            ? response.appointments
            : []
        );

      } catch (err: any) {
        setError(
          err?.message ||
            "Unable to load today's appointments."
        );

      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);


  useFocusEffect(
    useCallback(() => {
      loadAppointments();
    }, [loadAppointments])
  );


  // =========================================================
  // SUMMARY
  // =========================================================

  const summary =
    useMemo(() => {
      const total =
        appointments.length;


      const checkedIn =
        appointments.filter(
          (item) =>
            item.queue
              ?.checked_in
        ).length;


      // Only arrived/check-in patients
      // should count as live waiting.
      const waiting =
        appointments.filter(
          (item) =>
            item.queue
              ?.checked_in &&
            item.queue
              ?.status ===
                "waiting"
        ).length;


      const completed =
        appointments.filter(
          (item) =>
            item.status ===
              "completed"
        ).length;


      return {
        total,
        checkedIn,
        waiting,
        completed,
      };

    }, [appointments]);


  // =========================================================
  // REFRESH
  // =========================================================

  const onRefresh = () => {
    setRefreshing(true);

    loadAppointments();
  };


  // =========================================================
  // MESSAGE
  // =========================================================

  const showMessage = (
    title: string,
    message: string
  ) => {
    if (
      Platform.OS === "web"
    ) {
      window.alert(
        `${title}\n\n${message}`
      );

      return;
    }


    Alert.alert(
      title,
      message
    );
  };


  // =========================================================
  // CHECK IN
  // =========================================================

  const checkInPatient =
    async (
      appointment: Appointment
    ) => {
      const patientName =
        appointment
          .patient
          ?.name ||
        "this patient";


      const performCheckIn =
        async () => {
          try {
            setCheckingInId(
              appointment.id
            );


            await apiRequest(
              `/api/receptionist/appointments/${appointment.id}/check-in`,
              {
                method: "PATCH",
              }
            );


            await loadAppointments();


            showMessage(
              "Check-In Successful",
              `${patientName} has been checked in successfully.`
            );

          } catch (err: any) {
            showMessage(
              "Check-In Failed",
              err?.message ||
                "Unable to check in patient."
            );

          } finally {
            setCheckingInId(
              null
            );
          }
        };


      if (
        Platform.OS === "web"
      ) {
        const confirmed =
          window.confirm(
            `Check in ${patientName}?`
          );

        if (confirmed) {
          performCheckIn();
        }

        return;
      }


      Alert.alert(
        "Patient Check-In",
        `Check in ${patientName}?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Check In",
            onPress:
              performCheckIn,
          },
        ]
      );
    };


  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <View
        style={
          styles
            .centerContainer
        }
      >
        <ActivityIndicator
          size="large"
          color="#0F766E"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading today's appointments...
        </Text>
      </View>
    );
  }


  return (
    <View
      style={
        styles.screen
      }
    >
      <ScrollView
        contentContainerStyle={
          styles.container
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              onRefresh
            }
          />
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <View
          style={
            styles.header
          }
        >
          <Pressable
            onPress={() =>
              router.back()
            }
            style={({
              pressed,
            }) => [
              styles.backButton,

              pressed &&
                styles.pressed,
            ]}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color="#0F766E"
            />
          </Pressable>


          <View
            style={
              styles.headerContent
            }
          >
            <Text
              style={
                styles.headerTitle
              }
            >
              Today's Appointments
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              Front desk patient schedule
              and check-in
            </Text>
          </View>
        </View>


        {/* ================================================= */}
        {/* SUMMARY */}
        {/* ================================================= */}

        <View
          style={
            styles.summaryGrid
          }
        >
          <SummaryCard
            label="Appointments"
            value={
              summary.total
            }
            icon="calendar-outline"
          />

          <SummaryCard
            label="Checked In"
            value={
              summary.checkedIn
            }
            icon="checkmark-circle-outline"
          />

          <SummaryCard
            label="Waiting"
            value={
              summary.waiting
            }
            icon="time-outline"
          />

          <SummaryCard
            label="Completed"
            value={
              summary.completed
            }
            icon="checkmark-done-outline"
          />
        </View>


        {/* ================================================= */}
        {/* ERROR */}
        {/* ================================================= */}

        {error ? (
          <View
            style={
              styles.errorCard
            }
          >
            <Text
              style={
                styles.errorTitle
              }
            >
              Unable to load appointments
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
                loadAppointments
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


        {/* ================================================= */}
        {/* SCHEDULE */}
        {/* ================================================= */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Patient Schedule
        </Text>

        <Text
          style={
            styles.sectionSubtitle
          }
        >
          Patients booked for today's
          clinic
        </Text>


        {appointments.length ===
        0 ? (
          <View
            style={
              styles.emptyCard
            }
          >
            <Ionicons
              name="calendar-outline"
              size={38}
              color="#94A3B8"
            />

            <Text
              style={
                styles.emptyTitle
              }
            >
              No Appointments Today
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              There are no patients
              scheduled for today.
            </Text>
          </View>

        ) : (
          appointments.map(
            (
              appointment
            ) => (
              <AppointmentCard
                key={
                  appointment.id
                }
                appointment={
                  appointment
                }
                checkingIn={
                  checkingInId ===
                  appointment.id
                }
                onCheckIn={() =>
                  checkInPatient(
                    appointment
                  )
                }
              />
            )
          )
        )}
      </ScrollView>
    </View>
  );
}


// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon:
    keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View
      style={
        styles.summaryCard
      }
    >
      <View
        style={
          styles.summaryIcon
        }
      >
        <Ionicons
          name={icon}
          size={19}
          color="#0F766E"
        />
      </View>

      <Text
        style={
          styles.summaryValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.summaryLabel
        }
      >
        {label}
      </Text>
    </View>
  );
}


// ============================================================
// APPOINTMENT CARD
// ============================================================

function AppointmentCard({
  appointment,
  checkingIn,
  onCheckIn,
}: {
  appointment: Appointment;
  checkingIn: boolean;
  onCheckIn: () => void;
}) {
  const patientName =
    appointment
      .patient
      ?.name ||
    "Unknown Patient";


  const appointmentStatus =
    appointment.status ||
    "unknown";


  const queueStatus =
    appointment
      .queue
      ?.status ||
    "unknown";


  const checkedIn =
    Boolean(
      appointment
        .queue
        ?.checked_in
    );


  const canCheckIn =
    !checkedIn &&
    (
      appointmentStatus ===
        "pending" ||
      appointmentStatus ===
        "confirmed"
    ) &&
    queueStatus ===
      "waiting";


  return (
    <View
      style={
        styles.appointmentCard
      }
    >
      {/* ================================================= */}
      {/* PATIENT */}
      {/* ================================================= */}

      <View
        style={
          styles.cardTop
        }
      >
        <View
          style={
            styles.patientAvatar
          }
        >
          <Ionicons
            name="person-outline"
            size={22}
            color="#0F766E"
          />
        </View>


        <View
          style={{
            flex: 1,
          }}
        >
          <Text
            style={
              styles.patientName
            }
          >
            {patientName}
          </Text>

          <Text
            style={
              styles.patientDetails
            }
          >
            {appointment
              .patient
              ?.contact ||
              "No contact"}
          </Text>
        </View>


        <StatusBadge
          status={
            appointmentStatus
          }
        />
      </View>


      {/* ================================================= */}
      {/* DETAILS */}
      {/* ================================================= */}

      <View
        style={
          styles.infoGrid
        }
      >
        <InfoItem
          icon="time-outline"
          label="Time"
          value={
            appointment
              .slot
              ?.start_time ||
            "--:--"
          }
        />

        <InfoItem
          icon="medkit-outline"
          label="Doctor"
          value={
            appointment
              .doctor
              ?.name ||
            "Unknown"
          }
        />

        <InfoItem
          icon="location-outline"
          label="Room"
          value={
            appointment
              .doctor
              ?.room_number ||
            "Not set"
          }
        />

        <InfoItem
          icon="ticket-outline"
          label="Token"
          value={
            appointment
              .queue
              ?.token_number
              ? `#${appointment.queue.token_number}`
              : "N/A"
          }
        />
      </View>


      {/* ================================================= */}
      {/* QUEUE / CHECK-IN */}
      {/* ================================================= */}

      <View
        style={
          styles.bottomRow
        }
      >
        <View>
          <Text
            style={
              styles.queueLabel
            }
          >
            Queue Status
          </Text>

          <Text
            style={
              styles.queueValue
            }
          >
            {checkedIn
              ? formatStatus(
                  queueStatus
                )
              : "Not Checked In"}
          </Text>
        </View>


        {checkedIn ? (
          <View
            style={
              styles.checkedInBadge
            }
          >
            <Ionicons
              name="checkmark-circle"
              size={16}
              color="#15803D"
            />

            <Text
              style={
                styles.checkedInText
              }
            >
              Checked In
            </Text>
          </View>

        ) : canCheckIn ? (
          <Pressable
            onPress={
              onCheckIn
            }
            disabled={
              checkingIn
            }
            style={({
              pressed,
            }) => [
              styles.checkInButton,

              checkingIn &&
                styles.disabled,

              pressed &&
                styles.pressed,
            ]}
          >
            {checkingIn ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

            ) : (
              <>
                <Ionicons
                  name="log-in-outline"
                  size={17}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.checkInText
                  }
                >
                  Check In
                </Text>
              </>
            )}
          </Pressable>

        ) : (
          <View
            style={
              styles.unavailableBadge
            }
          >
            <Text
              style={
                styles.unavailableText
              }
            >
              Not Available
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}


// ============================================================
// INFO ITEM
// ============================================================

function InfoItem({
  icon,
  label,
  value,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View
      style={
        styles.infoItem
      }
    >
      <Ionicons
        name={icon}
        size={16}
        color="#0F766E"
      />

      <View
        style={{
          flex: 1,
        }}
      >
        <Text
          style={
            styles.infoLabel
          }
        >
          {label}
        </Text>

        <Text
          style={
            styles.infoValue
          }
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}


// ============================================================
// STATUS BADGE
// ============================================================

function StatusBadge({
  status,
}: {
  status: string;
}) {
  return (
    <View
      style={
        styles.statusBadge
      }
    >
      <Text
        style={
          styles.statusText
        }
      >
        {formatStatus(
          status
        )}
      </Text>
    </View>
  );
}


// ============================================================
// FORMAT STATUS
// ============================================================

function formatStatus(
  value?: string | null
) {
  if (!value) {
    return "Unknown";
  }

  return value
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}


// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        "#F6F8FB",
    },

    container: {
      width: "100%",
      maxWidth: 1050,
      alignSelf: "center",
      paddingHorizontal: 18,
      paddingTop: 22,
      paddingBottom: 40,
    },

    centerContainer: {
      flex: 1,
      justifyContent:
        "center",
      alignItems: "center",
      backgroundColor:
        "#F6F8FB",
    },

    loadingText: {
      color: "#64748B",
      fontSize: 11,
      marginTop: 10,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#E5EAF0",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 12,
    },

    headerContent: {
      flex: 1,
    },

    headerTitle: {
      color: "#172033",
      fontSize: 21,
      fontWeight: "900",
    },

    headerSubtitle: {
      color: "#94A3B8",
      fontSize: 10,
      marginTop: 3,
    },

    summaryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 22,
    },

    summaryCard: {
      flexGrow: 1,
      minWidth: 150,
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#E5EAF0",
      borderRadius: 15,
      padding: 14,
    },

    summaryIcon: {
      width: 35,
      height: 35,
      borderRadius: 10,
      backgroundColor:
        "#ECFDF5",
      justifyContent:
        "center",
      alignItems: "center",
    },

    summaryValue: {
      color: "#172033",
      fontSize: 21,
      fontWeight: "900",
      marginTop: 9,
    },

    summaryLabel: {
      color: "#64748B",
      fontSize: 9,
      fontWeight: "700",
      marginTop: 2,
    },

    sectionTitle: {
      color: "#172033",
      fontSize: 16,
      fontWeight: "900",
    },

    sectionSubtitle: {
      color: "#94A3B8",
      fontSize: 10,
      marginTop: 3,
      marginBottom: 12,
    },

    appointmentCard: {
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#E5EAF0",
      borderRadius: 17,
      padding: 16,
      marginBottom: 11,
    },

    cardTop: {
      flexDirection: "row",
      alignItems: "center",
    },

    patientAvatar: {
      width: 45,
      height: 45,
      borderRadius: 14,
      backgroundColor:
        "#ECFDF5",
      justifyContent:
        "center",
      alignItems: "center",
      marginRight: 12,
    },

    patientName: {
      color: "#172033",
      fontSize: 13,
      fontWeight: "900",
    },

    patientDetails: {
      color: "#94A3B8",
      fontSize: 9,
      marginTop: 3,
    },

    statusBadge: {
      backgroundColor:
        "#EFF6FF",
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 20,
    },

    statusText: {
      color: "#2563EB",
      fontSize: 8,
      fontWeight: "900",
    },

    infoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor:
        "#F1F5F9",
    },

    infoItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      minWidth: 135,
      flexGrow: 1,
    },

    infoLabel: {
      color: "#94A3B8",
      fontSize: 8,
    },

    infoValue: {
      color: "#334155",
      fontSize: 10,
      fontWeight: "800",
      marginTop: 2,
    },

    bottomRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor:
        "#F1F5F9",
      gap: 10,
    },

    queueLabel: {
      color: "#94A3B8",
      fontSize: 8,
    },

    queueValue: {
      color: "#334155",
      fontSize: 10,
      fontWeight: "800",
      marginTop: 2,
    },

    checkInButton: {
      minHeight: 39,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor:
        "#0F766E",
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 6,
    },

    checkInText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "900",
    },

    checkedInBadge: {
      backgroundColor:
        "#DCFCE7",
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    checkedInText: {
      color: "#15803D",
      fontSize: 9,
      fontWeight: "900",
    },

    unavailableBadge: {
      backgroundColor:
        "#F1F5F9",
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 20,
    },

    unavailableText: {
      color: "#64748B",
      fontSize: 9,
      fontWeight: "800",
    },

    emptyCard: {
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#E5EAF0",
      borderRadius: 17,
      padding: 35,
      alignItems: "center",
    },

    emptyTitle: {
      color: "#334155",
      fontSize: 14,
      fontWeight: "900",
      marginTop: 10,
    },

    emptyText: {
      color: "#94A3B8",
      fontSize: 10,
      marginTop: 4,
      textAlign: "center",
    },

    errorCard: {
      backgroundColor:
        "#FEF2F2",
      borderWidth: 1,
      borderColor:
        "#FECACA",
      borderRadius: 14,
      padding: 14,
      marginBottom: 18,
    },

    errorTitle: {
      color: "#991B1B",
      fontSize: 12,
      fontWeight: "900",
    },

    errorText: {
      color: "#B91C1C",
      fontSize: 10,
      marginTop: 4,
    },

    retryButton: {
      alignSelf:
        "flex-start",
      backgroundColor:
        "#FFFFFF",
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 8,
      marginTop: 9,
    },

    retryText: {
      color: "#991B1B",
      fontSize: 9,
      fontWeight: "900",
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