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
  Ionicons,
} from "@expo/vector-icons";

import {
  useFocusEffect,
  useRouter,
} from "expo-router";

import {
  apiRequest,
} from "../api/client";


type QueuePatient = {
  id?: number | null;
  name?: string | null;
  contact?: string | null;
};


type QueueDoctor = {
  id?: number | null;
  name?: string | null;
  specialization?: string | null;
  room_number?: string | null;
};


type QueueSlot = {
  start_time?: string | null;
  end_time?: string | null;
};


type QueueItem = {
  queue_id: number;
  appointment_id: number;
  token_number: number;
  priority?: string | null;
  status: string;

  check_in_time?: string | null;
  called_at?: string | null;
  consultation_started_at?: string | null;
  completed_at?: string | null;

  appointment_status?: string | null;
  appointment_type?: string | null;

  patient?: QueuePatient;
  doctor?: QueueDoctor;
  slot?: QueueSlot;
};


type QueueSummary = {
  total_checked_in: number;
  waiting: number;
  called: number;
  in_consultation: number;
  completed: number;
};


export default function ReceptionistLiveQueueScreen() {
  const router =
    useRouter();


  const [
    queue,
    setQueue,
  ] = useState<
    QueueItem[]
  >([]);


  const [
    summary,
    setSummary,
  ] = useState<
    QueueSummary
  >({
    total_checked_in: 0,
    waiting: 0,
    called: 0,
    in_consultation: 0,
    completed: 0,
  });


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


  // =========================================================
  // LOAD LIVE QUEUE
  // =========================================================

  const loadQueue =
    useCallback(async () => {
      try {
        setError("");

        const response =
          await apiRequest(
            "/api/receptionist/queue/today"
          );


        setQueue(
          Array.isArray(
            response?.queue
          )
            ? response.queue
            : []
        );


        setSummary(
          response?.summary || {
            total_checked_in: 0,
            waiting: 0,
            called: 0,
            in_consultation: 0,
            completed: 0,
          }
        );

      } catch (err: any) {
        setError(
          err?.message ||
            "Unable to load live queue."
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


  // =========================================================
  // REFRESH
  // =========================================================

  const onRefresh = () => {
    setRefreshing(true);

    loadQueue();
  };


  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <View
        style={
          styles.centerContainer
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
          Loading live queue...
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
              Live Queue
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              Monitor today's checked-in patients
            </Text>
          </View>


          <View
            style={
              styles.liveBadge
            }
          >
            <View
              style={
                styles.liveDot
              }
            />

            <Text
              style={
                styles.liveText
              }
            >
              LIVE
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
            label="Checked In"
            value={
              summary.total_checked_in
            }
            icon="people-outline"
          />

          <SummaryCard
            label="Waiting"
            value={
              summary.waiting
            }
            icon="time-outline"
          />

          <SummaryCard
            label="Called"
            value={
              summary.called
            }
            icon="notifications-outline"
          />

          <SummaryCard
            label="Consulting"
            value={
              summary.in_consultation
            }
            icon="medkit-outline"
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
              Unable to load queue
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
                loadQueue
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
        {/* QUEUE */}
        {/* ================================================= */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Today's Checked-In Patients
        </Text>

        <Text
          style={
            styles.sectionSubtitle
          }
        >
          Current clinic queue across doctors
        </Text>


        {queue.length === 0 ? (
          <View
            style={
              styles.emptyCard
            }
          >
            <Ionicons
              name="people-outline"
              size={38}
              color="#94A3B8"
            />

            <Text
              style={
                styles.emptyTitle
              }
            >
              Queue Is Empty
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              No patients have checked in today.
            </Text>
          </View>

        ) : (
          queue.map(
            (item) => (
              <QueueCard
                key={
                  item.queue_id
                }
                item={
                  item
                }
              />
            )
          )
        )}


        <Text
          style={
            styles.refreshHint
          }
        >
          Pull down to refresh the latest queue status.
        </Text>
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
          size={18}
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
// QUEUE CARD
// ============================================================

function QueueCard({
  item,
}: {
  item: QueueItem;
}) {
  const patientName =
    item.patient?.name ||
    "Unknown Patient";


  const doctorName =
    item.doctor?.name ||
    "Unknown Doctor";


  return (
    <View
      style={
        styles.queueCard
      }
    >
      <View
        style={
          styles.queueTop
        }
      >
        <View
          style={
            styles.tokenBox
          }
        >
          <Text
            style={
              styles.tokenLabel
            }
          >
            TOKEN
          </Text>

          <Text
            style={
              styles.tokenNumber
            }
          >
            #{item.token_number}
          </Text>
        </View>


        <View
          style={
            styles.patientContent
          }
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
              styles.contactText
            }
          >
            {item.patient?.contact ||
              "No contact"}
          </Text>
        </View>


        <QueueStatusBadge
          status={
            item.status
          }
        />
      </View>


      <View
        style={
          styles.detailsGrid
        }
      >
        <DetailItem
          icon="medkit-outline"
          label="Doctor"
          value={
            doctorName
          }
        />

        <DetailItem
          icon="location-outline"
          label="Room"
          value={
            item.doctor?.room_number ||
            "Not set"
          }
        />

        <DetailItem
          icon="time-outline"
          label="Appointment"
          value={
            item.slot?.start_time ||
            "--:--"
          }
        />

        <DetailItem
          icon="medical-outline"
          label="Type"
          value={
            formatStatus(
              item.appointment_type
            )
          }
        />
      </View>


      <View
        style={
          styles.bottomRow
        }
      >
        <View>
          <Text
            style={
              styles.bottomLabel
            }
          >
            Appointment Status
          </Text>

          <Text
            style={
              styles.bottomValue
            }
          >
            {formatStatus(
              item.appointment_status
            )}
          </Text>
        </View>


        <View
          style={
            styles.priorityBadge
          }
        >
          <Text
            style={
              styles.priorityText
            }
          >
            {formatStatus(
              item.priority ||
                "normal"
            )}
          </Text>
        </View>
      </View>
    </View>
  );
}


// ============================================================
// DETAIL ITEM
// ============================================================

function DetailItem({
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
        styles.detailItem
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
            styles.detailLabel
          }
        >
          {label}
        </Text>

        <Text
          style={
            styles.detailValue
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

function QueueStatusBadge({
  status,
}: {
  status: string;
}) {
  let badgeStyle =
    styles.waitingBadge;

  let textStyle =
    styles.waitingText;


  if (
    status === "called"
  ) {
    badgeStyle =
      styles.calledBadge;

    textStyle =
      styles.calledText;
  }


  if (
    status ===
    "in_consultation"
  ) {
    badgeStyle =
      styles.consultingBadge;

    textStyle =
      styles.consultingText;
  }


  if (
    status === "completed"
  ) {
    badgeStyle =
      styles.completedBadge;

    textStyle =
      styles.completedText;
  }


  return (
    <View
      style={[
        styles.statusBadge,
        badgeStyle,
      ]}
    >
      <Text
        style={[
          styles.statusText,
          textStyle,
        ]}
      >
        {formatStatus(
          status
        )}
      </Text>
    </View>
  );
}


// ============================================================
// FORMAT
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
      alignItems: "center",
      justifyContent: "center",
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
      justifyContent: "center",
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

    liveBadge: {
      backgroundColor:
        "#DCFCE7",
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 7,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor:
        "#16A34A",
    },

    liveText: {
      color: "#15803D",
      fontSize: 8,
      fontWeight: "900",
    },

    summaryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 22,
    },

    summaryCard: {
      flexGrow: 1,
      minWidth: 135,
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#E5EAF0",
      borderRadius: 15,
      padding: 13,
    },

    summaryIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor:
        "#ECFDF5",
      alignItems: "center",
      justifyContent: "center",
    },

    summaryValue: {
      color: "#172033",
      fontSize: 20,
      fontWeight: "900",
      marginTop: 8,
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

    queueCard: {
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#E5EAF0",
      borderRadius: 17,
      padding: 16,
      marginBottom: 11,
    },

    queueTop: {
      flexDirection: "row",
      alignItems: "center",
    },

    tokenBox: {
      width: 58,
      height: 52,
      borderRadius: 13,
      backgroundColor:
        "#ECFDF5",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },

    tokenLabel: {
      color: "#64748B",
      fontSize: 7,
      fontWeight: "800",
    },

    tokenNumber: {
      color: "#0F766E",
      fontSize: 17,
      fontWeight: "900",
      marginTop: 2,
    },

    patientContent: {
      flex: 1,
    },

    patientName: {
      color: "#172033",
      fontSize: 13,
      fontWeight: "900",
    },

    contactText: {
      color: "#94A3B8",
      fontSize: 9,
      marginTop: 3,
    },

    statusBadge: {
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 20,
    },

    statusText: {
      fontSize: 8,
      fontWeight: "900",
    },

    waitingBadge: {
      backgroundColor:
        "#FEF3C7",
    },

    waitingText: {
      color: "#A16207",
    },

    calledBadge: {
      backgroundColor:
        "#DBEAFE",
    },

    calledText: {
      color: "#1D4ED8",
    },

    consultingBadge: {
      backgroundColor:
        "#EDE9FE",
    },

    consultingText: {
      color: "#6D28D9",
    },

    completedBadge: {
      backgroundColor:
        "#DCFCE7",
    },

    completedText: {
      color: "#15803D",
    },

    detailsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 15,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor:
        "#F1F5F9",
    },

    detailItem: {
      minWidth: 135,
      flexGrow: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },

    detailLabel: {
      color: "#94A3B8",
      fontSize: 8,
    },

    detailValue: {
      color: "#334155",
      fontSize: 10,
      fontWeight: "800",
      marginTop: 2,
    },

    bottomRow: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      marginTop: 15,
      paddingTop: 13,
      borderTopWidth: 1,
      borderTopColor:
        "#F1F5F9",
    },

    bottomLabel: {
      color: "#94A3B8",
      fontSize: 8,
    },

    bottomValue: {
      color: "#334155",
      fontSize: 10,
      fontWeight: "800",
      marginTop: 2,
    },

    priorityBadge: {
      backgroundColor:
        "#F8FAFC",
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },

    priorityText: {
      color: "#64748B",
      fontSize: 8,
      fontWeight: "900",
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

    refreshHint: {
      color: "#94A3B8",
      fontSize: 9,
      textAlign: "center",
      marginTop: 15,
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