import React, {
  useCallback,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
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


// ============================================================
// TYPES
// ============================================================

type Doctor = {
  doctor_id: number;
  user_id: number;
  name: string;
  email: string;
  status:
    | "active"
    | "inactive";
  specialization: string;
  license_number?: string | null;
  room_number?: string | null;
  working_hours?: string | null;
  duty_status:
    | "on_duty"
    | "off_duty";
};


// ============================================================
// SCREEN
// ============================================================

export default function AdminDoctorsScreen() {

  const router =
    useRouter();

  const {
    width,
  } =
    useWindowDimensions();

  const compact =
    width < 700;


  const [
    doctors,
    setDoctors,
  ] =
    useState<Doctor[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    modalVisible,
    setModalVisible,
  ] =
    useState(false);

  const [
    saving,
    setSaving,
  ] =
    useState(false);


  // =========================================================
  // FORM
  // =========================================================

  const [
    name,
    setName,
  ] =
    useState("");

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    specialization,
    setSpecialization,
  ] =
    useState("");

  const [
    licenseNumber,
    setLicenseNumber,
  ] =
    useState("");

  const [
    roomNumber,
    setRoomNumber,
  ] =
    useState("");

  const [
    workingHours,
    setWorkingHours,
  ] =
    useState("");

  const [
    dutyStatus,
    setDutyStatus,
  ] =
    useState<
      "on_duty"
      | "off_duty"
    >(
      "off_duty"
    );


  // =========================================================
  // LOAD DOCTORS
  // =========================================================

  const loadDoctors =
    useCallback(
      async () => {

        try {

          setError(
            ""
          );


          const response =
            await apiRequest(
              "/api/admin/doctors"
            );


          setDoctors(
            Array.isArray(
              response?.doctors
            )
              ? response.doctors
              : []
          );

        } catch (
          err: any
        ) {

          setError(
            err?.message ||
              "Unable to load doctors."
          );

        } finally {

          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      []
    );


  useFocusEffect(
    useCallback(
      () => {

        loadDoctors();

      },
      [
        loadDoctors,
      ]
    )
  );


  // =========================================================
  // REFRESH
  // =========================================================

  const onRefresh = () => {

    setRefreshing(
      true
    );

    loadDoctors();
  };


  // =========================================================
  // RESET FORM
  // =========================================================

  const resetForm = () => {

    setName(
      ""
    );

    setEmail(
      ""
    );

    setPassword(
      ""
    );

    setShowPassword(
      false
    );

    setSpecialization(
      ""
    );

    setLicenseNumber(
      ""
    );

    setRoomNumber(
      ""
    );

    setWorkingHours(
      ""
    );

    setDutyStatus(
      "off_duty"
    );
  };


  const closeModal = () => {

    if (saving) {
      return;
    }

    setModalVisible(
      false
    );

    resetForm();
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
      &&
      typeof window !== "undefined"
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
  // CREATE DOCTOR
  // =========================================================

  const handleCreateDoctor =
    async () => {

      const cleanName =
        name.trim();

      const cleanEmail =
        email
          .trim()
          .toLowerCase();

      const cleanSpecialization =
        specialization.trim();


      if (
        !cleanName
        ||
        !cleanEmail
        ||
        !password
        ||
        !cleanSpecialization
      ) {

        showMessage(
          "Required Fields",
          "Name, email, password and specialization are required."
        );

        return;
      }


      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


      if (
        !emailRegex.test(
          cleanEmail
        )
      ) {

        showMessage(
          "Invalid Email",
          "Please enter a valid email address."
        );

        return;
      }


      if (
        password.length < 8
      ) {

        showMessage(
          "Weak Password",
          "Password must be at least 8 characters long."
        );

        return;
      }


      try {

        setSaving(
          true
        );


        await apiRequest(
          "/api/admin/doctors",
          {
            method:
              "POST",

            body:
              JSON.stringify({
                name:
                  cleanName,

                email:
                  cleanEmail,

                password,

                specialization:
                  cleanSpecialization,

                license_number:
                  licenseNumber
                    .trim()
                    || null,

                room_number:
                  roomNumber
                    .trim()
                    || null,

                working_hours:
                  workingHours
                    .trim()
                    || null,

                duty_status:
                  dutyStatus,
              }),
          }
        );


        setModalVisible(
          false
        );

        resetForm();

        await loadDoctors();


        showMessage(
          "Doctor Created",
          "Doctor account created successfully."
        );

      } catch (
        err: any
      ) {

        showMessage(
          "Unable to Create Doctor",
          err?.message ||
            "Please try again."
        );

      } finally {

        setSaving(
          false
        );
      }
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
          Loading doctors...
        </Text>

      </View>
    );
  }


  // =========================================================
  // UI
  // =========================================================

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

          {/* =================================================
              HEADER
          ================================================= */}

          <View
            style={
              styles.header
            }
          >

            <Pressable
              onPress={
                () =>
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
                Manage Doctors
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                View and create doctor accounts
              </Text>

            </View>


            <Pressable
              onPress={
                () => {

                  resetForm();

                  setModalVisible(
                    true
                  );
                }
              }

              style={({
                pressed,
              }) => [
                styles.addButton,

                pressed &&
                  styles.pressed,
              ]}
            >

              <Ionicons
                name="add"
                size={18}
                color="#FFFFFF"
              />

              {
                !compact
                  ? (

                    <Text
                      style={
                        styles.addButtonText
                      }
                    >
                      Add Doctor
                    </Text>

                  )
                  : null
              }

            </Pressable>

          </View>


          {/* =================================================
              SUMMARY
          ================================================= */}

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
                name="medkit-outline"
                size={24}
                color="#0F766E"
              />

            </View>


            <View>

              <Text
                style={
                  styles.summaryValue
                }
              >
                {doctors.length}
              </Text>

              <Text
                style={
                  styles.summaryLabel
                }
              >
                Registered Doctors
              </Text>

            </View>

          </View>


          {/* =================================================
              ERROR
          ================================================= */}

          {
            error
              ? (

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
                    Unable to load doctors
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
                      loadDoctors
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

              )
              : null
          }


          {/* =================================================
              DOCTOR LIST
          ================================================= */}

          <Text
            style={
              styles.sectionTitle
            }
          >
            Doctor Accounts
          </Text>

          <Text
            style={
              styles.sectionSubtitle
            }
          >
            Clinic doctors registered by the administrator
          </Text>


          {
            doctors.length === 0
              ? (

                <View
                  style={
                    styles.emptyCard
                  }
                >

                  <Ionicons
                    name="medkit-outline"
                    size={35}
                    color="#94A3B8"
                  />

                  <Text
                    style={
                      styles.emptyTitle
                    }
                  >
                    No Doctors Yet
                  </Text>

                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    Add your first doctor account.
                  </Text>

                </View>

              )
              : (

                doctors.map(
                  (
                    doctor
                  ) => (

                    <DoctorCard
                      key={
                        doctor.doctor_id
                      }

                      doctor={
                        doctor
                      }
                    />

                  )
                )

              )
          }

        </View>

      </ScrollView>


      {/* =====================================================
          ADD DOCTOR MODAL
      ===================================================== */}

      <Modal
        visible={
          modalVisible
        }

        transparent

        animationType="fade"

        onRequestClose={
          closeModal
        }
      >

        <View
          style={
            styles.modalBackdrop
          }
        >

          <View
            style={
              styles.modalWrapper
            }
          >

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }

              keyboardShouldPersistTaps=
                "handled"
            >

              {/* =============================================
                  MODAL HEADER
              ============================================= */}

              <View
                style={
                  styles.modalHeader
                }
              >

                <View>

                  <Text
                    style={
                      styles.modalTitle
                    }
                  >
                    Add Doctor
                  </Text>

                  <Text
                    style={
                      styles.modalSubtitle
                    }
                  >
                    Create a new doctor account
                  </Text>

                </View>


                <Pressable
                  onPress={
                    closeModal
                  }

                  disabled={
                    saving
                  }

                  style={
                    styles.closeButton
                  }
                >

                  <Ionicons
                    name="close"
                    size={22}
                    color="#64748B"
                  />

                </Pressable>

              </View>


              {/* =============================================
                  NAME
              ============================================= */}

              <FormLabel
                text="Full Name *"
              />

              <TextInput
                value={
                  name
                }

                onChangeText={
                  setName
                }

                placeholder=
                  "Dr. Ahmed Khan"

                placeholderTextColor=
                  "#94A3B8"

                editable={
                  !saving
                }

                style={
                  styles.input
                }
              />


              {/* =============================================
                  EMAIL
              ============================================= */}

              <FormLabel
                text="Email *"
              />

              <TextInput
                value={
                  email
                }

                onChangeText={
                  setEmail
                }

                placeholder=
                  "doctor@gmail.com"

                placeholderTextColor=
                  "#94A3B8"

                autoCapitalize=
                  "none"

                autoCorrect={
                  false
                }

                keyboardType=
                  "email-address"

                editable={
                  !saving
                }

                style={
                  styles.input
                }
              />


              {/* =============================================
                  PASSWORD WITH EYE
              ============================================= */}

              <FormLabel
                text="Password *"
              />


              <View
                style={
                  styles.passwordContainer
                }
              >

                <TextInput
                  value={
                    password
                  }

                  onChangeText={
                    setPassword
                  }

                  placeholder=
                    "Minimum 8 characters"

                  placeholderTextColor=
                    "#94A3B8"

                  secureTextEntry={
                    !showPassword
                  }

                  autoCapitalize=
                    "none"

                  autoCorrect={
                    false
                  }

                  editable={
                    !saving
                  }

                  style={
                    styles.passwordInput
                  }
                />


                <Pressable
                  disabled={
                    saving
                  }

                  onPress={
                    () =>
                      setShowPassword(
                        (
                          current
                        ) =>
                          !current
                      )
                  }

                  style={({
                    pressed,
                  }) => [
                    styles.eyeButton,

                    pressed &&
                      styles.eyePressed,
                  ]}
                >

                  <Ionicons
                    name={
                      showPassword
                        ? "eye-off-outline"
                        : "eye-outline"
                    }

                    size={21}

                    color="#64748B"
                  />

                </Pressable>

              </View>


              {/* =============================================
                  SPECIALIZATION
              ============================================= */}

              <FormLabel
                text="Specialization *"
              />

              <TextInput
                value={
                  specialization
                }

                onChangeText={
                  setSpecialization
                }

                placeholder=
                  "Cardiology"

                placeholderTextColor=
                  "#94A3B8"

                editable={
                  !saving
                }

                style={
                  styles.input
                }
              />


              {/* =============================================
                  LICENSE NUMBER
              ============================================= */}

              <FormLabel
                text="License Number"
              />

              <TextInput
                value={
                  licenseNumber
                }

                onChangeText={
                  setLicenseNumber
                }

                placeholder=
                  "PMC-12345"

                placeholderTextColor=
                  "#94A3B8"

                editable={
                  !saving
                }

                style={
                  styles.input
                }
              />


              {/* =============================================
                  ROOM NUMBER
              ============================================= */}

              <FormLabel
                text="Room Number"
              />

              <TextInput
                value={
                  roomNumber
                }

                onChangeText={
                  setRoomNumber
                }

                placeholder=
                  "Room 101"

                placeholderTextColor=
                  "#94A3B8"

                editable={
                  !saving
                }

                style={
                  styles.input
                }
              />


              {/* =============================================
                  WORKING HOURS
              ============================================= */}

              <FormLabel
                text="Working Hours"
              />

              <TextInput
                value={
                  workingHours
                }

                onChangeText={
                  setWorkingHours
                }

                placeholder=
                  "9 AM - 5 PM"

                placeholderTextColor=
                  "#94A3B8"

                editable={
                  !saving
                }

                style={
                  styles.input
                }
              />


              {/* =============================================
                  DUTY STATUS
              ============================================= */}

              <FormLabel
                text="Initial Duty Status"
              />


              <View
                style={
                  styles.statusSelector
                }
              >

                <Pressable
                  disabled={
                    saving
                  }

                  onPress={
                    () =>
                      setDutyStatus(
                        "off_duty"
                      )
                  }

                  style={[
                    styles.statusOption,

                    dutyStatus ===
                      "off_duty"
                      &&
                      styles
                        .statusOptionSelected,
                  ]}
                >

                  <Text
                    style={[
                      styles.statusOptionText,

                      dutyStatus ===
                        "off_duty"
                        &&
                        styles
                          .statusOptionTextSelected,
                    ]}
                  >
                    Off Duty
                  </Text>

                </Pressable>


                <Pressable
                  disabled={
                    saving
                  }

                  onPress={
                    () =>
                      setDutyStatus(
                        "on_duty"
                      )
                  }

                  style={[
                    styles.statusOption,

                    dutyStatus ===
                      "on_duty"
                      &&
                      styles
                        .statusOptionSelected,
                  ]}
                >

                  <Text
                    style={[
                      styles.statusOptionText,

                      dutyStatus ===
                        "on_duty"
                        &&
                        styles
                          .statusOptionTextSelected,
                    ]}
                  >
                    On Duty
                  </Text>

                </Pressable>

              </View>


              {/* =============================================
                  SAVE
              ============================================= */}

              <Pressable
                onPress={
                  handleCreateDoctor
                }

                disabled={
                  saving
                }

                style={({
                  pressed,
                }) => [
                  styles.saveButton,

                  saving &&
                    styles.disabled,

                  pressed &&
                    !saving &&
                    styles.pressed,
                ]}
              >

                {
                  saving
                    ? (

                      <ActivityIndicator
                        color="#FFFFFF"
                      />

                    )
                    : (

                      <>

                        <Ionicons
                          name=
                            "person-add-outline"

                          size={18}

                          color="#FFFFFF"
                        />

                        <Text
                          style={
                            styles.saveButtonText
                          }
                        >
                          Create Doctor
                        </Text>

                      </>

                    )
                }

              </Pressable>

            </ScrollView>

          </View>

        </View>

      </Modal>

    </View>
  );
}


// ============================================================
// FORM LABEL
// ============================================================

function FormLabel({
  text,
}: {
  text: string;
}) {

  return (

    <Text
      style={
        styles.formLabel
      }
    >
      {text}
    </Text>
  );
}


// ============================================================
// DOCTOR CARD
// ============================================================

function DoctorCard({
  doctor,
}: {
  doctor: Doctor;
}) {

  const initials =
    doctor.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (
          part
        ) =>
          part.charAt(0)
      )
      .join("")
      .toUpperCase();


  return (

    <View
      style={
        styles.doctorCard
      }
    >

      <View
        style={
          styles.avatar
        }
      >

        <Text
          style={
            styles.avatarText
          }
        >
          {initials || "DR"}
        </Text>

      </View>


      <View
        style={
          styles.doctorContent
        }
      >

        <View
          style={
            styles.doctorTopRow
          }
        >

          <View
            style={{
              flex: 1,
            }}
          >

            <Text
              style={
                styles.doctorName
              }
            >
              {doctor.name}
            </Text>

            <Text
              style={
                styles.specialization
              }
            >
              {doctor.specialization}
            </Text>

          </View>


          <View
            style={[
              styles.dutyBadge,

              doctor.duty_status ===
              "on_duty"
                ? styles.onDutyBadge
                : styles.offDutyBadge,
            ]}
          >

            <Text
              style={[
                styles.dutyText,

                doctor.duty_status ===
                "on_duty"
                  ? styles.onDutyText
                  : styles.offDutyText,
              ]}
            >
              {
                doctor.duty_status ===
                "on_duty"
                  ? "On Duty"
                  : "Off Duty"
              }
            </Text>

          </View>

        </View>


        <Text
          style={
            styles.detailText
          }
        >
          {doctor.email}
        </Text>


        <View
          style={
            styles.detailsRow
          }
        >

          <Text
            style={
              styles.detailText
            }
          >
            {
              doctor.room_number
              || "No room"
            }
          </Text>

          <Text
            style={
              styles.dot
            }
          >
            •
          </Text>

          <Text
            style={
              styles.detailText
            }
          >
            {
              doctor.working_hours
              || "Hours not set"
            }
          </Text>

        </View>

      </View>

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
      maxWidth: 1050,
      alignSelf:
        "center",
      paddingHorizontal: 18,
      paddingTop: 22,
      paddingBottom: 35,
    },

    centerContainer: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#F6F8FB",
    },

    loadingText: {
      color:
        "#64748B",
      fontSize: 12,
      marginTop: 10,
    },

    header: {
      flexDirection:
        "row",
      alignItems:
        "center",
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
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 12,
    },

    headerContent: {
      flex: 1,
    },

    headerTitle: {
      color:
        "#172033",
      fontSize: 21,
      fontWeight:
        "900",
    },

    headerSubtitle: {
      color:
        "#94A3B8",
      fontSize: 10,
      marginTop: 3,
    },

    addButton: {
      height: 42,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor:
        "#0F766E",
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 6,
    },

    addButtonText: {
      color:
        "#FFFFFF",
      fontSize: 11,
      fontWeight:
        "800",
    },

    summaryCard: {
      backgroundColor:
        "#ECFDF5",
      borderWidth: 1,
      borderColor:
        "#CCFBF1",
      borderRadius: 16,
      padding: 16,
      flexDirection:
        "row",
      alignItems:
        "center",
      marginBottom: 22,
    },

    summaryIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor:
        "#FFFFFF",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 13,
    },

    summaryValue: {
      color:
        "#134E4A",
      fontSize: 22,
      fontWeight:
        "900",
    },

    summaryLabel: {
      color:
        "#52716E",
      fontSize: 10,
      marginTop: 2,
    },

    sectionTitle: {
      color:
        "#172033",
      fontSize: 16,
      fontWeight:
        "900",
    },

    sectionSubtitle: {
      color:
        "#94A3B8",
      fontSize: 10,
      marginTop: 3,
      marginBottom: 12,
    },

    doctorCard: {
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#E5EAF0",
      borderRadius: 16,
      padding: 15,
      flexDirection:
        "row",
      marginBottom: 10,
    },

    avatar: {
      width: 48,
      height: 48,
      borderRadius: 15,
      backgroundColor:
        "#CCFBF1",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 13,
    },

    avatarText: {
      color:
        "#0F766E",
      fontSize: 13,
      fontWeight:
        "900",
    },

    doctorContent: {
      flex: 1,
    },

    doctorTopRow: {
      flexDirection:
        "row",
      alignItems:
        "flex-start",
      gap: 10,
    },

    doctorName: {
      color:
        "#172033",
      fontSize: 13,
      fontWeight:
        "900",
    },

    specialization: {
      color:
        "#0F766E",
      fontSize: 10,
      fontWeight:
        "700",
      marginTop: 3,
    },

    detailText: {
      color:
        "#64748B",
      fontSize: 10,
      marginTop: 5,
    },

    detailsRow: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      alignItems:
        "center",
      gap: 6,
    },

    dot: {
      color:
        "#CBD5E1",
      marginTop: 5,
    },

    dutyBadge: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 20,
    },

    onDutyBadge: {
      backgroundColor:
        "#DCFCE7",
    },

    offDutyBadge: {
      backgroundColor:
        "#F1F5F9",
    },

    dutyText: {
      fontSize: 8,
      fontWeight:
        "900",
    },

    onDutyText: {
      color:
        "#15803D",
    },

    offDutyText: {
      color:
        "#64748B",
    },

    emptyCard: {
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#E5EAF0",
      borderRadius: 16,
      padding: 30,
      alignItems:
        "center",
    },

    emptyTitle: {
      color:
        "#334155",
      fontSize: 14,
      fontWeight:
        "900",
      marginTop: 10,
    },

    emptyText: {
      color:
        "#94A3B8",
      fontSize: 10,
      marginTop: 4,
    },

    errorCard: {
      backgroundColor:
        "#FEF2F2",
      borderRadius: 14,
      padding: 15,
      marginBottom: 18,
    },

    errorTitle: {
      color:
        "#991B1B",
      fontWeight:
        "900",
      fontSize: 13,
    },

    errorText: {
      color:
        "#B91C1C",
      fontSize: 10,
      marginTop: 4,
    },

    retryButton: {
      alignSelf:
        "flex-start",
      backgroundColor:
        "#FFFFFF",
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 7,
      marginTop: 9,
    },

    retryText: {
      color:
        "#991B1B",
      fontSize: 10,
      fontWeight:
        "800",
    },

    modalBackdrop: {
      position:
        "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor:
        "rgba(15, 23, 42, 0.55)",
      alignItems:
        "center",
      justifyContent:
        "center",
      padding: 16,
    },

    modalWrapper: {
      width: "100%",
      maxWidth: 560,
      maxHeight: "92%",
      backgroundColor:
        "#FFFFFF",
      borderRadius: 20,
      padding: 20,
    },

    modalHeader: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      alignItems:
        "flex-start",
      marginBottom: 18,
    },

    modalTitle: {
      color:
        "#172033",
      fontSize: 19,
      fontWeight:
        "900",
    },

    modalSubtitle: {
      color:
        "#94A3B8",
      fontSize: 10,
      marginTop: 3,
    },

    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor:
        "#F8FAFC",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    formLabel: {
      color:
        "#334155",
      fontSize: 10,
      fontWeight:
        "800",
      marginBottom: 6,
    },

    input: {
      minHeight: 45,
      borderWidth: 1,
      borderColor:
        "#DDE4EC",
      backgroundColor:
        "#F8FAFC",
      borderRadius: 11,
      paddingHorizontal: 13,
      fontSize: 12,
      color:
        "#172033",
      marginBottom: 14,
    },


    // ========================================================
    // PASSWORD WITH EYE
    // ========================================================

    passwordContainer: {
      minHeight: 45,
      borderWidth: 1,
      borderColor:
        "#DDE4EC",
      backgroundColor:
        "#F8FAFC",
      borderRadius: 11,
      flexDirection:
        "row",
      alignItems:
        "center",
      marginBottom: 14,
    },

    passwordInput: {
      flex: 1,
      minHeight: 43,
      paddingLeft: 13,
      paddingRight: 4,
      fontSize: 12,
      color:
        "#172033",
    },

    eyeButton: {
      width: 48,
      minHeight: 43,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    eyePressed: {
      opacity: 0.5,
    },


    // ========================================================
    // DUTY STATUS
    // ========================================================

    statusSelector: {
      flexDirection:
        "row",
      gap: 9,
      marginBottom: 18,
    },

    statusOption: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 10,
      borderWidth: 1,
      borderColor:
        "#DDE4EC",
      alignItems:
        "center",
    },

    statusOptionSelected: {
      borderColor:
        "#0F766E",
      backgroundColor:
        "#ECFDF5",
    },

    statusOptionText: {
      color:
        "#64748B",
      fontSize: 10,
      fontWeight:
        "800",
    },

    statusOptionTextSelected: {
      color:
        "#0F766E",
    },

    saveButton: {
      minHeight: 47,
      backgroundColor:
        "#0F766E",
      borderRadius: 12,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 8,
      marginTop: 3,
    },

    saveButtonText: {
      color:
        "#FFFFFF",
      fontSize: 11,
      fontWeight:
        "900",
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