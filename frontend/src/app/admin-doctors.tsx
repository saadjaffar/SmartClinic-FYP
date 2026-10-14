import React, {
  useCallback,
  useMemo,
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

import { Ionicons } from "@expo/vector-icons";

import {
  useFocusEffect,
  useRouter,
} from "expo-router";

import { apiRequest } from "../api/client";


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


export default function AdminDoctorsScreen() {
  const router = useRouter();

  const { width } =
    useWindowDimensions();

  const compact =
    width < 700;

  const [
    doctors,
    setDoctors,
  ] = useState<Doctor[]>([]);

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
    modalVisible,
    setModalVisible,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    updatingUserId,
    setUpdatingUserId,
  ] = useState<number | null>(
    null
  );


  // =========================================================
  // FORM
  // =========================================================

  const [
    name,
    setName,
  ] = useState("");

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    specialization,
    setSpecialization,
  ] = useState("");

  const [
    licenseNumber,
    setLicenseNumber,
  ] = useState("");

  const [
    roomNumber,
    setRoomNumber,
  ] = useState("");

  const [
    workingHours,
    setWorkingHours,
  ] = useState("");

  const [
    dutyStatus,
    setDutyStatus,
  ] = useState<
    "on_duty" | "off_duty"
  >("off_duty");


  // =========================================================
  // SUMMARY
  // =========================================================

  const activeDoctors =
    useMemo(
      () =>
        doctors.filter(
          (doctor) =>
            doctor.status ===
            "active"
        ).length,
      [doctors]
    );

  const inactiveDoctors =
    useMemo(
      () =>
        doctors.filter(
          (doctor) =>
            doctor.status ===
            "inactive"
        ).length,
      [doctors]
    );


  // =========================================================
  // LOAD DOCTORS
  // =========================================================

  const loadDoctors =
    useCallback(
      async () => {
        try {
          setError("");

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
        } catch (err: any) {
          setError(
            err?.message ||
              "Unable to load doctors."
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
      loadDoctors();
    }, [loadDoctors])
  );


  // =========================================================
  // REFRESH
  // =========================================================

  const onRefresh = () => {
    setRefreshing(true);
    loadDoctors();
  };


  // =========================================================
  // RESET FORM
  // =========================================================

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setSpecialization("");
    setLicenseNumber("");
    setRoomNumber("");
    setWorkingHours("");
    setDutyStatus(
      "off_duty"
    );
  };


  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalVisible(false);
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
      Platform.OS === "web" &&
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
        !cleanName ||
        !cleanEmail ||
        !password ||
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
        setSaving(true);

        await apiRequest(
          "/api/admin/doctors",
          {
            method: "POST",

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
                    .trim() ||
                  null,

                room_number:
                  roomNumber
                    .trim() ||
                  null,

                working_hours:
                  workingHours
                    .trim() ||
                  null,

                duty_status:
                  dutyStatus,
              }),
          }
        );

        setModalVisible(false);

        resetForm();

        await loadDoctors();

        showMessage(
          "Doctor Created",
          "Doctor account created successfully."
        );
      } catch (err: any) {
        showMessage(
          "Unable to Create Doctor",
          err?.message ||
            "Please try again."
        );
      } finally {
        setSaving(false);
      }
    };


  // =========================================================
  // UPDATE ACCOUNT STATUS
  // =========================================================

  const updateDoctorStatus =
    async (
      doctor: Doctor
    ) => {
      if (
        updatingUserId !== null
      ) {
        return;
      }

      const newStatus =
        doctor.status === "active"
          ? "inactive"
          : "active";

      try {
        setUpdatingUserId(
          doctor.user_id
        );

        await apiRequest(
          `/api/admin/staff/${doctor.user_id}/status`,
          {
            method: "PATCH",

            body:
              JSON.stringify({
                status:
                  newStatus,
              }),
          }
        );

        await loadDoctors();

        showMessage(
          newStatus === "active"
            ? "Doctor Activated"
            : "Doctor Deactivated",

          newStatus === "active"
            ? `${doctor.name}'s account is active again. The doctor remains off duty until they explicitly go on duty.`
            : `${doctor.name}'s account has been deactivated and the doctor has been moved off duty.`
        );
      } catch (err: any) {
        showMessage(
          "Unable to Update Doctor",
          err?.message ||
            "Please try again."
        );
      } finally {
        setUpdatingUserId(
          null
        );
      }
    };


  // =========================================================
  // CONFIRM STATUS CHANGE
  // =========================================================

  const handleToggleStatus = (
    doctor: Doctor
  ) => {
    const deactivating =
      doctor.status ===
      "active";

    const title =
      deactivating
        ? "Deactivate Doctor"
        : "Reactivate Doctor";

    const message =
      deactivating
        ? (
          `Deactivate ${doctor.name}?\n\n` +
          "The account will not be deleted. " +
          "The doctor will immediately lose access and will be moved off duty."
        )
        : (
          `Reactivate ${doctor.name}?\n\n` +
          "The doctor will be able to access the account again. " +
          "Duty status will remain Off Duty until the doctor changes it."
        );

    if (
      Platform.OS === "web" &&
      typeof window !== "undefined"
    ) {
      const confirmed =
        window.confirm(
          `${title}\n\n${message}`
        );

      if (confirmed) {
        updateDoctorStatus(
          doctor
        );
      }

      return;
    }

    Alert.alert(
      title,
      message,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text:
            deactivating
              ? "Deactivate"
              : "Reactivate",

          style:
            deactivating
              ? "destructive"
              : "default",

          onPress: () =>
            updateDoctorStatus(
              doctor
            ),
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
      style={styles.screen}
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
          {/* HEADER */}

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
                Manage Doctors
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                Create and manage doctor accounts
              </Text>
            </View>


            <Pressable
              onPress={() => {
                resetForm();

                setModalVisible(
                  true
                );
              }}

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

              {!compact ? (
                <Text
                  style={
                    styles.addButtonText
                  }
                >
                  Add Doctor
                </Text>
              ) : null}
            </Pressable>
          </View>


          {/* SUMMARY */}

          <View
            style={
              styles.summaryGrid
            }
          >
            <SummaryCard
              icon="medkit-outline"
              value={
                doctors.length
              }
              label="Registered"
            />

            <SummaryCard
              icon="checkmark-circle-outline"
              value={
                activeDoctors
              }
              label="Active"
            />

            <SummaryCard
              icon="pause-circle-outline"
              value={
                inactiveDoctors
              }
              label="Inactive"
            />
          </View>


          {/* INFO */}

          <View
            style={
              styles.infoCard
            }
          >
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#1D4ED8"
            />

            <Text
              style={
                styles.infoText
              }
            >
              Deactivating a doctor does not delete their account or clinical history. An inactive doctor is automatically moved Off Duty.
            </Text>
          </View>


          {/* ERROR */}

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
          ) : null}


          {/* DOCTOR LIST */}

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


          {doctors.length === 0 ? (
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
          ) : (
            doctors.map(
              (doctor) => (
                <DoctorCard
                  key={
                    doctor.doctor_id
                  }

                  doctor={
                    doctor
                  }

                  updating={
                    updatingUserId ===
                    doctor.user_id
                  }

                  disabled={
                    updatingUserId !==
                    null
                  }

                  onToggleStatus={
                    () =>
                      handleToggleStatus(
                        doctor
                      )
                  }
                />
              )
            )
          )}
        </View>
      </ScrollView>


      {/* ADD DOCTOR MODAL */}

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
              {/* MODAL HEADER */}

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


              {/* NAME */}

              <FormLabel
                text="Full Name *"
              />

              <TextInput
                value={name}

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


              {/* EMAIL */}

              <FormLabel
                text="Email *"
              />

              <TextInput
                value={email}

                onChangeText={
                  setEmail
                }

                placeholder=
                  "doctor@gmail.com"

                placeholderTextColor=
                  "#94A3B8"

                autoCapitalize="none"

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


              {/* PASSWORD */}

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

                  onPress={() =>
                    setShowPassword(
                      (current) =>
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


              {/* SPECIALIZATION */}

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


              {/* LICENSE */}

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


              {/* ROOM */}

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


              {/* WORKING HOURS */}

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


              {/* DUTY STATUS */}

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

                  onPress={() =>
                    setDutyStatus(
                      "off_duty"
                    )
                  }

                  style={[
                    styles.statusOption,

                    dutyStatus ===
                      "off_duty" &&
                      styles
                        .statusOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusOptionText,

                      dutyStatus ===
                        "off_duty" &&
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

                  onPress={() =>
                    setDutyStatus(
                      "on_duty"
                    )
                  }

                  style={[
                    styles.statusOption,

                    dutyStatus ===
                      "on_duty" &&
                      styles
                        .statusOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusOptionText,

                      dutyStatus ===
                        "on_duty" &&
                        styles
                          .statusOptionTextSelected,
                    ]}
                  >
                    On Duty
                  </Text>
                </Pressable>
              </View>


              {/* SAVE */}

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
                {saving ? (
                  <ActivityIndicator
                    color="#FFFFFF"
                  />
                ) : (
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
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}


// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  icon,
  value,
  label,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
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
          size={22}
          color="#0F766E"
        />
      </View>

      <View>
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
  updating,
  disabled,
  onToggleStatus,
}: {
  doctor: Doctor;
  updating: boolean;
  disabled: boolean;
  onToggleStatus: () => void;
}) {
  const initials =
    doctor.name
      .replace(
        /^Dr\.?\s*/i,
        ""
      )
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (part) =>
          part.charAt(0)
      )
      .join("")
      .toUpperCase();

  const isActive =
    doctor.status ===
    "active";

  return (
    <View
      style={[
        styles.doctorCard,

        !isActive &&
          styles.inactiveDoctorCard,
      ]}
    >
      <View
        style={[
          styles.avatar,

          !isActive &&
            styles.inactiveAvatar,
        ]}
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
            style={
              styles.doctorHeading
            }
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
            style={
              styles.badgeRow
            }
          >
            <View
              style={[
                styles.accountBadge,

                isActive
                  ? styles.activeAccountBadge
                  : styles.inactiveAccountBadge,
              ]}
            >
              <Text
                style={[
                  styles.accountBadgeText,

                  isActive
                    ? styles.activeAccountText
                    : styles.inactiveAccountText,
                ]}
              >
                {isActive
                  ? "Active"
                  : "Inactive"}
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
                {doctor.duty_status ===
                "on_duty"
                  ? "On Duty"
                  : "Off Duty"}
              </Text>
            </View>
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
            {doctor.room_number ||
              "No room"}
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
            {doctor.working_hours ||
              "Hours not set"}
          </Text>
        </View>


        {doctor.license_number ? (
          <Text
            style={
              styles.licenseText
            }
          >
            License:{" "}
            {doctor.license_number}
          </Text>
        ) : null}


        <View
          style={
            styles.cardActions
          }
        >
          <View
            style={
              styles.statusExplanation
            }
          >
            <Ionicons
              name={
                isActive
                  ? "checkmark-circle-outline"
                  : "pause-circle-outline"
              }

              size={16}

              color={
                isActive
                  ? "#15803D"
                  : "#B45309"
              }
            />

            <Text
              style={
                styles.statusExplanationText
              }
            >
              {isActive
                ? "Account access enabled"
                : "Account access disabled"}
            </Text>
          </View>


          <Pressable
            onPress={
              onToggleStatus
            }

            disabled={
              disabled
            }

            style={({
              pressed,
            }) => [
              styles.statusButton,

              isActive
                ? styles.deactivateButton
                : styles.activateButton,

              disabled &&
                styles.disabled,

              pressed &&
                !disabled &&
                styles.pressed,
            ]}
          >
            {updating ? (
              <ActivityIndicator
                size="small"
                color={
                  isActive
                    ? "#B91C1C"
                    : "#15803D"
                }
              />
            ) : (
              <>
                <Ionicons
                  name={
                    isActive
                      ? "pause-circle-outline"
                      : "checkmark-circle-outline"
                  }

                  size={16}

                  color={
                    isActive
                      ? "#B91C1C"
                      : "#15803D"
                  }
                />

                <Text
                  style={[
                    styles.statusButtonText,

                    isActive
                      ? styles.deactivateButtonText
                      : styles.activateButtonText,
                  ]}
                >
                  {isActive
                    ? "Deactivate"
                    : "Reactivate"}
                </Text>
              </>
            )}
          </Pressable>
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
      alignSelf: "center",
      paddingHorizontal: 18,
      paddingTop: 22,
      paddingBottom: 35,
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
      fontSize: 12,
      marginTop: 10,
    },


    // ========================================================
    // HEADER
    // ========================================================

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

    addButton: {
      height: 42,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor:
        "#0F766E",
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 6,
    },

    addButtonText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "800",
    },


    // ========================================================
    // SUMMARY
    // ========================================================

    summaryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 16,
    },

    summaryCard: {
      flex: 1,
      minWidth: 145,
      backgroundColor:
        "#ECFDF5",
      borderWidth: 1,
      borderColor:
        "#CCFBF1",
      borderRadius: 16,
      padding: 15,
      flexDirection: "row",
      alignItems: "center",
    },

    summaryIcon: {
      width: 44,
      height: 44,
      borderRadius: 13,
      backgroundColor:
        "#FFFFFF",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 12,
    },

    summaryValue: {
      color: "#134E4A",
      fontSize: 21,
      fontWeight: "900",
    },

    summaryLabel: {
      color: "#52716E",
      fontSize: 10,
      marginTop: 2,
      fontWeight: "700",
    },


    // ========================================================
    // INFO
    // ========================================================

    infoCard: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      gap: 9,
      backgroundColor:
        "#EFF6FF",
      borderWidth: 1,
      borderColor:
        "#DBEAFE",
      borderRadius: 13,
      padding: 13,
      marginBottom: 22,
    },

    infoText: {
      flex: 1,
      color: "#475569",
      fontSize: 10,
      lineHeight: 16,
    },


    // ========================================================
    // SECTION
    // ========================================================

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


    // ========================================================
    // DOCTOR CARD
    // ========================================================

    doctorCard: {
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#E5EAF0",
      borderRadius: 16,
      padding: 15,
      flexDirection: "row",
      marginBottom: 10,
    },

    inactiveDoctorCard: {
      backgroundColor:
        "#FFFBEB",
      borderColor:
        "#FDE68A",
    },

    avatar: {
      width: 48,
      height: 48,
      borderRadius: 15,
      backgroundColor:
        "#CCFBF1",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 13,
    },

    inactiveAvatar: {
      backgroundColor:
        "#FEF3C7",
    },

    avatarText: {
      color: "#0F766E",
      fontSize: 13,
      fontWeight: "900",
    },

    doctorContent: {
      flex: 1,
    },

    doctorTopRow: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      gap: 10,
    },

    doctorHeading: {
      flex: 1,
    },

    doctorName: {
      color: "#172033",
      fontSize: 13,
      fontWeight: "900",
    },

    specialization: {
      color: "#0F766E",
      fontSize: 10,
      fontWeight: "700",
      marginTop: 3,
    },

    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent:
        "flex-end",
      gap: 6,
    },

    accountBadge: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 20,
    },

    activeAccountBadge: {
      backgroundColor:
        "#DCFCE7",
    },

    inactiveAccountBadge: {
      backgroundColor:
        "#FEF3C7",
    },

    accountBadgeText: {
      fontSize: 8,
      fontWeight: "900",
    },

    activeAccountText: {
      color: "#15803D",
    },

    inactiveAccountText: {
      color: "#B45309",
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
      fontWeight: "900",
    },

    onDutyText: {
      color: "#15803D",
    },

    offDutyText: {
      color: "#64748B",
    },

    detailText: {
      color: "#64748B",
      fontSize: 10,
      marginTop: 5,
    },

    detailsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 6,
    },

    dot: {
      color: "#CBD5E1",
      marginTop: 5,
    },

    licenseText: {
      color: "#94A3B8",
      fontSize: 9,
      marginTop: 5,
    },


    // ========================================================
    // CARD ACTIONS
    // ========================================================

    cardActions: {
      marginTop: 12,
      paddingTop: 11,
      borderTopWidth: 1,
      borderTopColor:
        "#F1F5F9",
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      gap: 10,
      flexWrap: "wrap",
    },

    statusExplanation: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flex: 1,
      minWidth: 150,
    },

    statusExplanationText: {
      color: "#64748B",
      fontSize: 9,
      fontWeight: "700",
    },

    statusButton: {
      minHeight: 36,
      borderRadius: 10,
      paddingHorizontal: 12,
      borderWidth: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 6,
      minWidth: 112,
    },

    deactivateButton: {
      backgroundColor:
        "#FEF2F2",
      borderColor:
        "#FECACA",
    },

    activateButton: {
      backgroundColor:
        "#F0FDF4",
      borderColor:
        "#BBF7D0",
    },

    statusButtonText: {
      fontSize: 9,
      fontWeight: "900",
    },

    deactivateButtonText: {
      color: "#B91C1C",
    },

    activateButtonText: {
      color: "#15803D",
    },


    // ========================================================
    // EMPTY / ERROR
    // ========================================================

    emptyCard: {
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#E5EAF0",
      borderRadius: 16,
      padding: 30,
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
    },

    errorCard: {
      backgroundColor:
        "#FEF2F2",
      borderRadius: 14,
      padding: 15,
      marginBottom: 18,
    },

    errorTitle: {
      color: "#991B1B",
      fontWeight: "900",
      fontSize: 13,
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
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 7,
      marginTop: 9,
    },

    retryText: {
      color: "#991B1B",
      fontSize: 10,
      fontWeight: "800",
    },


    // ========================================================
    // MODAL
    // ========================================================

    modalBackdrop: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor:
        "rgba(15, 23, 42, 0.55)",
      alignItems: "center",
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
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems:
        "flex-start",
      marginBottom: 18,
    },

    modalTitle: {
      color: "#172033",
      fontSize: 19,
      fontWeight: "900",
    },

    modalSubtitle: {
      color: "#94A3B8",
      fontSize: 10,
      marginTop: 3,
    },

    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor:
        "#F8FAFC",
      alignItems: "center",
      justifyContent:
        "center",
    },

    formLabel: {
      color: "#334155",
      fontSize: 10,
      fontWeight: "800",
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
      color: "#172033",
      marginBottom: 14,
    },


    // ========================================================
    // PASSWORD
    // ========================================================

    passwordContainer: {
      minHeight: 45,
      borderWidth: 1,
      borderColor:
        "#DDE4EC",
      backgroundColor:
        "#F8FAFC",
      borderRadius: 11,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14,
    },

    passwordInput: {
      flex: 1,
      minHeight: 43,
      paddingLeft: 13,
      paddingRight: 4,
      fontSize: 12,
      color: "#172033",
    },

    eyeButton: {
      width: 48,
      minHeight: 43,
      alignItems: "center",
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
      flexDirection: "row",
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
      alignItems: "center",
    },

    statusOptionSelected: {
      borderColor:
        "#0F766E",
      backgroundColor:
        "#ECFDF5",
    },

    statusOptionText: {
      color: "#64748B",
      fontSize: 10,
      fontWeight: "800",
    },

    statusOptionTextSelected: {
      color: "#0F766E",
    },


    // ========================================================
    // SAVE
    // ========================================================

    saveButton: {
      minHeight: 47,
      backgroundColor:
        "#0F766E",
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 8,
      marginTop: 3,
    },

    saveButtonText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "900",
    },

    disabled: {
      opacity: 0.55,
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