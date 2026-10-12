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
  useWindowDimensions,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import {
  useFocusEffect,
  useRouter,
} from "expo-router";

import { apiRequest } from "../api/client";

import {
  clearAuth,
  getUser,
} from "../storage/authStorage";


type AdminStats = {
  total_users: number;
  patients: number;
  doctors: number;
  receptionists: number;
  active_users: number;
  inactive_users: number;
  doctors_on_duty: number;
  doctors_off_duty: number;
};


export default function AdminScreen() {
  const router = useRouter();

  const { width } =
    useWindowDimensions();

  const isSmallScreen =
    width < 700;


  const [
    user,
    setUser,
  ] = useState<any>(null);

  const [
    stats,
    setStats,
  ] = useState<AdminStats | null>(
    null
  );

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
  // LOAD DASHBOARD
  // =========================================================

  const loadDashboard =
    useCallback(async () => {
      try {
        setError("");

        const storedUser =
          await getUser();

        setUser(
          storedUser
        );

        const response =
          await apiRequest(
            "/api/admin/dashboard"
          );

        setStats(
          response?.stats || null
        );
      } catch (err: any) {
        setError(
          err?.message ||
            "Unable to load admin dashboard."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);


  // Refresh every time admin dashboard
  // becomes active again.
  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );


  // =========================================================
  // REFRESH
  // =========================================================

  const onRefresh = () => {
    setRefreshing(true);

    loadDashboard();
  };


  // =========================================================
  // LOGOUT
  // =========================================================

  const performLogout =
    async () => {
      await clearAuth();

      router.replace("/");
    };


  const handleLogout = () => {
    if (
      Platform.OS === "web"
    ) {
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
          Loading admin dashboard...
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
          styles.scrollContent
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
        <View
          style={
            styles.container
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
            <View
              style={
                styles.brandRow
              }
            >
              <View
                style={
                  styles.logoContainer
                }
              >
                <Ionicons
                  name="medical"
                  size={24}
                  color="#FFFFFF"
                />
              </View>

              <View>
                <Text
                  style={
                    styles.brandTitle
                  }
                >
                  SmartClinic
                </Text>

                <Text
                  style={
                    styles.brandSubtitle
                  }
                >
                  Administration Portal
                </Text>
              </View>
            </View>


            <Pressable
              onPress={
                handleLogout
              }
              style={({
                pressed,
              }) => [
                styles.logoutButton,

                pressed &&
                  styles.pressed,
              ]}
            >
              <Ionicons
                name="log-out-outline"
                size={19}
                color="#DC2626"
              />

              <Text
                style={
                  styles.logoutText
                }
              >
                Logout
              </Text>
            </Pressable>
          </View>


          {/* ================================================= */}
          {/* WELCOME */}
          {/* ================================================= */}

          <View
            style={
              styles.welcomeCard
            }
          >
            <View
              style={
                styles.welcomeIcon
              }
            >
              <Ionicons
                name="shield-checkmark"
                size={30}
                color="#0F766E"
              />
            </View>

            <View
              style={
                styles.welcomeContent
              }
            >
              <Text
                style={
                  styles.welcomeTitle
                }
              >
                Welcome,{" "}
                {user?.name ||
                  "Administrator"}
              </Text>

              <Text
                style={
                  styles.welcomeSubtitle
                }
              >
                Monitor clinic users,
                doctors and staff from
                your administration
                dashboard.
              </Text>
            </View>
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
              <Ionicons
                name="alert-circle-outline"
                size={22}
                color="#B91C1C"
              />

              <View
                style={
                  styles.errorContent
                }
              >
                <Text
                  style={
                    styles.errorTitle
                  }
                >
                  Dashboard Error
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
                  style={({
                    pressed,
                  }) => [
                    styles.retryButton,

                    pressed &&
                      styles.pressed,
                  ]}
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
            </View>
          ) : null}


          {/* ================================================= */}
          {/* CLINIC OVERVIEW */}
          {/* ================================================= */}

          <Text
            style={
              styles.sectionTitle
            }
          >
            Clinic Overview
          </Text>

          <Text
            style={
              styles.sectionSubtitle
            }
          >
            Current registered users and
            staff statistics
          </Text>


          <View
            style={
              styles.statsGrid
            }
          >
            <StatCard
              title="Total Users"
              value={
                stats?.total_users ??
                0
              }
              icon="people-outline"
              compact={
                isSmallScreen
              }
            />

            <StatCard
              title="Patients"
              value={
                stats?.patients ??
                0
              }
              icon="person-outline"
              compact={
                isSmallScreen
              }
            />

            <StatCard
              title="Doctors"
              value={
                stats?.doctors ??
                0
              }
              icon="medkit-outline"
              compact={
                isSmallScreen
              }
            />

            <StatCard
              title="Receptionists"
              value={
                stats?.receptionists ??
                0
              }
              icon="desktop-outline"
              compact={
                isSmallScreen
              }
            />
          </View>


          {/* ================================================= */}
          {/* ACCOUNT STATUS */}
          {/* ================================================= */}

          <Text
            style={
              styles.sectionTitle
            }
          >
            Account Status
          </Text>

          <View
            style={
              styles.statusContainer
            }
          >
            <StatusRow
              icon="checkmark-circle"
              title="Active Users"
              value={
                stats?.active_users ??
                0
              }
            />

            <View
              style={
                styles.divider
              }
            />

            <StatusRow
              icon="pause-circle"
              title="Inactive Users"
              value={
                stats?.inactive_users ??
                0
              }
            />
          </View>


          {/* ================================================= */}
          {/* DOCTOR AVAILABILITY */}
          {/* ================================================= */}

          <Text
            style={
              styles.sectionTitle
            }
          >
            Doctor Availability
          </Text>

          <View
            style={
              styles.statusContainer
            }
          >
            <StatusRow
              icon="radio-button-on"
              title="Doctors On Duty"
              value={
                stats?.doctors_on_duty ??
                0
              }
            />

            <View
              style={
                styles.divider
              }
            />

            <StatusRow
              icon="radio-button-off"
              title="Doctors Off Duty"
              value={
                stats?.doctors_off_duty ??
                0
              }
            />
          </View>


          {/* ================================================= */}
          {/* STAFF MANAGEMENT */}
          {/* ================================================= */}

          <Text
            style={
              styles.sectionTitle
            }
          >
            Staff Management
          </Text>

          <Text
            style={
              styles.sectionSubtitle
            }
          >
            Administrative tools for
            clinic staff
          </Text>


          <View
            style={
              styles.managementCard
            }
          >
            {/* ================================================= */}
            {/* MANAGE DOCTORS */}
            {/* ================================================= */}

            <Pressable
              onPress={() =>
                router.push(
                  "/admin-doctors"
                )
              }
              style={({
                pressed,
              }) => [
                styles.managementRow,

                pressed &&
                  styles.pressed,
              ]}
            >
              <View
                style={
                  styles.managementIcon
                }
              >
                <Ionicons
                  name="medkit-outline"
                  size={22}
                  color="#0F766E"
                />
              </View>

              <View
                style={
                  styles.managementContent
                }
              >
                <Text
                  style={
                    styles.managementTitle
                  }
                >
                  Manage Doctors
                </Text>

                <Text
                  style={
                    styles.managementSubtitle
                  }
                >
                  Add and view doctor
                  accounts
                </Text>
              </View>

              <View
                style={
                  styles.nextBadge
                }
              >
                <Text
                  style={
                    styles.nextBadgeText
                  }
                >
                  NEXT
                </Text>
              </View>
            </Pressable>


            <View
              style={
                styles.divider
              }
            />


            {/* ================================================= */}
            {/* MANAGE RECEPTIONISTS */}
            {/* ================================================= */}

            <Pressable
              onPress={() =>
                router.push(
                  "/admin-receptionists"
                )
              }
              style={({
                pressed,
              }) => [
                styles.managementRow,

                pressed &&
                  styles.pressed,
              ]}
            >
              <View
                style={
                  styles.managementIcon
                }
              >
                <Ionicons
                  name="desktop-outline"
                  size={22}
                  color="#0F766E"
                />
              </View>

              <View
                style={
                  styles.managementContent
                }
              >
                <Text
                  style={
                    styles.managementTitle
                  }
                >
                  Manage Receptionists
                </Text>

                <Text
                  style={
                    styles.managementSubtitle
                  }
                >
                  Add and view receptionist
                  accounts
                </Text>
              </View>

              <View
                style={
                  styles.nextBadge
                }
              >
                <Text
                  style={
                    styles.nextBadgeText
                  }
                >
                  NEXT
                </Text>
              </View>
            </Pressable>
          </View>


          {/* ================================================= */}
          {/* FOOTER */}
          {/* ================================================= */}

          <View
            style={
              styles.footer
            }
          >
            <Text
              style={
                styles.footerTitle
              }
            >
              SmartClinic
            </Text>

            <Text
              style={
                styles.footerText
              }
            >
              Clinic Management System
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}


// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  title,
  value,
  icon,
  compact,
}: {
  title: string;
  value: number;
  icon:
    keyof typeof Ionicons.glyphMap;
  compact: boolean;
}) {
  return (
    <View
      style={[
        styles.statCard,

        {
          width: compact
            ? "48%"
            : "23.5%",
        },
      ]}
    >
      <View
        style={
          styles.statIcon
        }
      >
        <Ionicons
          name={icon}
          size={21}
          color="#0F766E"
        />
      </View>

      <Text
        style={
          styles.statValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.statTitle
        }
      >
        {title}
      </Text>
    </View>
  );
}


// ============================================================
// STATUS ROW
// ============================================================

function StatusRow({
  icon,
  title,
  value,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  title: string;
  value: number;
}) {
  return (
    <View
      style={
        styles.statusRow
      }
    >
      <View
        style={
          styles.statusIcon
        }
      >
        <Ionicons
          name={icon}
          size={20}
          color="#0F766E"
        />
      </View>

      <Text
        style={
          styles.statusTitle
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.statusValue
        }
      >
        {value}
      </Text>
    </View>
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

    scrollContent: {
      flexGrow: 1,
    },

    container: {
      width: "100%",
      maxWidth: 1180,
      alignSelf: "center",
      paddingHorizontal: 18,
      paddingTop: 22,
      paddingBottom: 30,
    },

    centerContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        "#F6F8FB",
      padding: 20,
    },

    loadingText: {
      color: "#64748B",
      fontSize: 13,
      marginTop: 12,
    },

    header: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      marginBottom: 20,
      gap: 14,
    },

    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },

    logoContainer: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor:
        "#0F766E",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 11,
    },

    brandTitle: {
      color: "#172033",
      fontSize: 20,
      fontWeight: "900",
    },

    brandSubtitle: {
      color: "#94A3B8",
      fontSize: 10,
      marginTop: 2,
    },

    logoutButton: {
      minHeight: 40,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 13,
      borderRadius: 11,
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor: "#FEE2E2",
      gap: 6,
    },

    logoutText: {
      color: "#DC2626",
      fontSize: 11,
      fontWeight: "800",
    },

    welcomeCard: {
      backgroundColor:
        "#ECFDF5",
      borderWidth: 1,
      borderColor: "#CCFBF1",
      borderRadius: 18,
      padding: 18,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 22,
    },

    welcomeIcon: {
      width: 54,
      height: 54,
      borderRadius: 16,
      backgroundColor:
        "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },

    welcomeContent: {
      flex: 1,
    },

    welcomeTitle: {
      color: "#134E4A",
      fontSize: 19,
      fontWeight: "900",
    },

    welcomeSubtitle: {
      color: "#52716E",
      fontSize: 11,
      lineHeight: 17,
      marginTop: 5,
    },

    errorCard: {
      flexDirection: "row",
      backgroundColor:
        "#FEF2F2",
      borderRadius: 15,
      borderWidth: 1,
      borderColor: "#FECACA",
      padding: 15,
      marginBottom: 18,
      gap: 10,
    },

    errorContent: {
      flex: 1,
    },

    errorTitle: {
      color: "#991B1B",
      fontSize: 13,
      fontWeight: "900",
    },

    errorText: {
      color: "#B91C1C",
      fontSize: 11,
      marginTop: 3,
    },

    retryButton: {
      alignSelf:
        "flex-start",
      backgroundColor:
        "#FFFFFF",
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      marginTop: 9,
    },

    retryText: {
      color: "#991B1B",
      fontSize: 10,
      fontWeight: "800",
    },

    sectionTitle: {
      color: "#172033",
      fontSize: 17,
      fontWeight: "900",
      marginTop: 9,
    },

    sectionSubtitle: {
      color: "#94A3B8",
      fontSize: 10,
      marginTop: 3,
      marginBottom: 12,
    },

    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent:
        "space-between",
      gap: 10,
      marginBottom: 20,
    },

    statCard: {
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor: "#E5EAF0",
      borderRadius: 16,
      padding: 15,
      minHeight: 132,
    },

    statIcon: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor:
        "#ECFDF5",
      alignItems: "center",
      justifyContent: "center",
    },

    statValue: {
      color: "#172033",
      fontSize: 24,
      fontWeight: "900",
      marginTop: 12,
    },

    statTitle: {
      color: "#64748B",
      fontSize: 10,
      marginTop: 3,
      fontWeight: "700",
    },

    statusContainer: {
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor: "#E5EAF0",
      borderRadius: 16,
      paddingHorizontal: 15,
      marginTop: 11,
      marginBottom: 20,
    },

    statusRow: {
      minHeight: 62,
      flexDirection: "row",
      alignItems: "center",
    },

    statusIcon: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor:
        "#ECFDF5",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 11,
    },

    statusTitle: {
      flex: 1,
      color: "#334155",
      fontSize: 12,
      fontWeight: "700",
    },

    statusValue: {
      color: "#0F766E",
      fontSize: 18,
      fontWeight: "900",
    },

    divider: {
      height: 1,
      backgroundColor:
        "#F1F5F9",
    },

    managementCard: {
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor: "#E5EAF0",
      borderRadius: 16,
      paddingHorizontal: 15,
      marginBottom: 20,
    },

    managementRow: {
      minHeight: 76,
      flexDirection: "row",
      alignItems: "center",
    },

    managementIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor:
        "#ECFDF5",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },

    managementContent: {
      flex: 1,
    },

    managementTitle: {
      color: "#172033",
      fontSize: 12,
      fontWeight: "900",
    },

    managementSubtitle: {
      color: "#94A3B8",
      fontSize: 10,
      marginTop: 4,
    },

    nextBadge: {
      backgroundColor:
        "#F1F5F9",
      borderRadius: 20,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },

    nextBadgeText: {
      color: "#64748B",
      fontSize: 8,
      fontWeight: "900",
    },

    footer: {
      alignItems: "center",
      paddingVertical: 22,
    },

    footerTitle: {
      color: "#0F766E",
      fontSize: 13,
      fontWeight: "900",
    },

    footerText: {
      color: "#94A3B8",
      fontSize: 9,
      marginTop: 3,
    },

    pressed: {
      opacity: 0.7,
      transform: [
        {
          scale: 0.98,
        },
      ],
    },
  });