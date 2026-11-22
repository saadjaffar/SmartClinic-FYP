import React, {
  useEffect,
  useState,
} from "react";

import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  Ionicons,
} from "@expo/vector-icons";
import { apiRequest } from "../api/client";

import {
  type Href,
  useRouter,
} from "expo-router";

import {
  clearAuth,
  getUser,
} from "../storage/authStorage";
import {
  getSelectedClinicId,
  setSelectedClinicId,
} from "../storage/clinicStorage";

type ReceptionistClinic = {
  clinic_id: number;
  clinic_name: string;
  role: string;
  status: string;
};


export default function ReceptionistScreen() {
  const router =
    useRouter();

  const [
    user,
    setUser,
  ] = useState<any>(
    null
  );

  const [clinics, setClinics] =
    useState<ReceptionistClinic[]>([]);
  const [selectedClinicId, setSelectedClinicIdState] =
    useState<number | null>(null);
  const [clinicError, setClinicError] = useState("");

  useEffect(() => {
    const loadUser =
      async () => {
        const storedUser =
          await getUser();

        setUser(
          storedUser
        );

        try {
          const response = await apiRequest(
            "/api/clinics/my"
          );
          const activeClinics: ReceptionistClinic[] =
            Array.isArray(response?.clinics)
              ? response.clinics.filter(
                  (item: ReceptionistClinic) =>
                    item.role === "receptionist" &&
                    item.status === "active"
                )
              : [];
          setClinics(activeClinics);

          const savedClinicId =
            await getSelectedClinicId();
          const clinicId = activeClinics.some(
            (item) => item.clinic_id === savedClinicId
          )
            ? savedClinicId
            : activeClinics[0]?.clinic_id ?? null;

          if (clinicId) {
            await setSelectedClinicId(clinicId);
            setSelectedClinicIdState(clinicId);
          } else {
            setClinicError(
              "Your account is not assigned to an active clinic. Please contact the Clinic Admin."
            );
          }
        } catch (requestError: any) {
          setClinicError(
            requestError?.message ||
              "Unable to load your clinic assignment."
          );
        }
      };

    loadUser();
  }, []);

  const handleClinicSelect = async (clinicId: number) => {
    await setSelectedClinicId(clinicId);
    setSelectedClinicIdState(clinicId);
  };


  // =========================================================
  // LOGOUT
  // =========================================================

  const performLogout =
    async () => {
      await clearAuth();

      router.replace(
        "/" as Href
      );
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
          onPress:
            performLogout,
        },
      ]
    );
  };


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
          <View
            style={
              styles.brandRow
            }
          >
            <View
              style={
                styles.logo
              }
            >
              <Ionicons
                name="desktop-outline"
                size={23}
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
                Reception Desk Portal
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
              size={18}
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
              name="person-circle-outline"
              size={31}
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
                styles.welcomeTitle
              }
            >
              Welcome,{" "}
              {user?.name ||
                "Receptionist"}
            </Text>

            <Text
              style={
                styles.welcomeText
              }
            >
              Manage front desk operations,
              patient check-ins and today's
              clinic workflow.
            </Text>
          </View>
        </View>

        <View style={styles.clinicContext}>
          <Text style={styles.clinicContextLabel}>
            CURRENT CLINIC
          </Text>
          {clinics.length > 1 ? (
            <View style={styles.clinicOptions}>
              {clinics.map((clinic) => (
                <Pressable
                  key={clinic.clinic_id}
                  onPress={() =>
                    handleClinicSelect(clinic.clinic_id)
                  }
                  style={[
                    styles.clinicOption,
                    clinic.clinic_id === selectedClinicId &&
                      styles.clinicOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.clinicOptionText,
                      clinic.clinic_id === selectedClinicId &&
                        styles.clinicOptionTextSelected,
                    ]}
                  >
                    {clinic.clinic_name}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Text style={styles.clinicContextName}>
            {clinics.find(
              (clinic) =>
                clinic.clinic_id === selectedClinicId
            )?.clinic_name || clinics[0]?.clinic_name || "No clinic selected"}
          </Text>
          {clinicError ? (
            <Text style={styles.clinicContextError}>
              {clinicError}
            </Text>
          ) : null}
        </View>


        {/* ================================================= */}
        {/* OPERATIONS */}
        {/* ================================================= */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Front Desk Operations
        </Text>

        <Text
          style={
            styles.sectionSubtitle
          }
        >
          Manage today's clinic activity
        </Text>


        <View
          style={
            styles.card
          }
        >
          {/* TODAY'S APPOINTMENTS */}

          <OperationRow
            icon="calendar-outline"
            title="Today's Appointments"
            subtitle="View patients scheduled for today"
            onPress={() =>
              router.push(
                "/receptionist-appointments" as Href
              )
            }
          />


          <View
            style={
              styles.divider
            }
          />


          {/* PATIENT CHECK-IN */}

          <OperationRow
            icon="person-add-outline"
            title="Patient Check-In"
            subtitle="Check patients into today's queue"
            onPress={() =>
              router.push(
                "/receptionist-appointments" as Href
              )
            }
          />


          <View
            style={
              styles.divider
            }
          />

<View
  style={
    styles.divider
  }
/>


{/* EMERGENCY WALK-IN */}

<OperationRow
  icon="person-add-outline"
  title="Front-Desk Walk-In"
  subtitle="Register a regular patient without an app account and add them to the normal queue"
  onPress={() =>
    router.push(
      "/receptionist-walk-in" as Href
    )
  }
/>

{/* EMERGENCY WALK-IN */}

<OperationRow
  icon="warning-outline"
  title="Emergency Walk-In"
  subtitle="Add an urgent registered patient directly to the queue"
  onPress={() =>
    router.push(
      "/receptionist-emergency" as Href
    )
  }
/>

          {/* LIVE QUEUE */}

          <OperationRow
            icon="people-outline"
            title="Live Queue"
            subtitle="Monitor waiting, called and active patients"
            onPress={() =>
              router.push(
                "/receptionist-live-queue" as Href
              )
            }
          />
        </View>


        {/* ================================================= */}
        {/* INFO */}
        {/* ================================================= */}

        <View
          style={
            styles.infoCard
          }
        >
          <Ionicons
            name="information-circle-outline"
            size={20}
            color="#0F766E"
          />

          <Text
            style={
              styles.infoText
            }
          >
            Receptionist can monitor today's
            appointments, check patients in
            and view the live clinic queue.
          </Text>
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
      </ScrollView>
    </View>
  );
}


// ============================================================
// OPERATION ROW
// ============================================================

function OperationRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={
        onPress
      }
      style={({
        pressed,
      }) => [
        styles.operationRow,

        pressed &&
          styles.pressed,
      ]}
    >
      <View
        style={
          styles.operationIcon
        }
      >
        <Ionicons
          name={icon}
          size={21}
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
            styles.operationTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.operationSubtitle
          }
        >
          {subtitle}
        </Text>
      </View>

      <View
        style={
          styles.openBadge
        }
      >
        <Text
          style={
            styles.openText
          }
        >
          OPEN
        </Text>
      </View>
    </Pressable>
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
      paddingBottom: 35,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      gap: 12,
      marginBottom: 20,
    },

    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },

    logo: {
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
      paddingHorizontal: 13,
      borderRadius: 11,
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#FEE2E2",
      flexDirection: "row",
      alignItems: "center",
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
      borderColor:
        "#CCFBF1",
      borderRadius: 18,
      padding: 18,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 24,
    },
    clinicContext: {
      padding: 14,
      marginBottom: 16,
      backgroundColor: "#ECFDF5",
      borderWidth: 1,
      borderColor: "#A7F3D0",
      borderRadius: 14,
    },
    clinicContextLabel: {
      color: "#0F766E",
      fontSize: 10,
      fontWeight: "900",
    },
    clinicOptions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
      marginTop: 9,
    },
    clinicOption: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: "#99F6E4",
      borderRadius: 9,
      backgroundColor: "#FFFFFF",
    },
    clinicOptionSelected: {
      backgroundColor: "#0F766E",
      borderColor: "#0F766E",
    },
    clinicOptionText: {
      color: "#134E4A",
      fontSize: 11,
      fontWeight: "700",
    },
    clinicOptionTextSelected: {
      color: "#FFFFFF",
    },
    clinicContextName: {
      color: "#134E4A",
      fontSize: 16,
      fontWeight: "900",
      marginTop: 8,
    },
    clinicContextError: {
      color: "#B91C1C",
      fontSize: 12,
      marginTop: 8,
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

    welcomeTitle: {
      color: "#134E4A",
      fontSize: 19,
      fontWeight: "900",
    },

    welcomeText: {
      color: "#52716E",
      fontSize: 11,
      lineHeight: 17,
      marginTop: 5,
    },

    sectionTitle: {
      color: "#172033",
      fontSize: 17,
      fontWeight: "900",
    },

    sectionSubtitle: {
      color: "#94A3B8",
      fontSize: 10,
      marginTop: 3,
      marginBottom: 12,
    },

    card: {
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#E5EAF0",
      borderRadius: 16,
      paddingHorizontal: 15,
    },

    operationRow: {
      minHeight: 78,
      flexDirection: "row",
      alignItems: "center",
    },

    operationIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor:
        "#ECFDF5",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },

    operationTitle: {
      color: "#172033",
      fontSize: 12,
      fontWeight: "900",
    },

    operationSubtitle: {
      color: "#94A3B8",
      fontSize: 10,
      marginTop: 4,
    },

    divider: {
      height: 1,
      backgroundColor:
        "#F1F5F9",
    },

    openBadge: {
      backgroundColor:
        "#ECFDF5",
      borderRadius: 20,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },

    openText: {
      color: "#0F766E",
      fontSize: 8,
      fontWeight: "900",
    },

    infoCard: {
      marginTop: 18,
      backgroundColor:
        "#ECFDF5",
      borderRadius: 14,
      padding: 14,
      flexDirection: "row",
      gap: 9,
    },

    infoText: {
      flex: 1,
      color: "#52716E",
      fontSize: 10,
      lineHeight: 16,
    },

    footer: {
      alignItems: "center",
      paddingVertical: 28,
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
      opacity: 0.75,
      transform: [
        {
          scale: 0.99,
        },
      ],
    },
  });