import React, {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

type PatientMode =
  | "existing"
  | "new";


type PatientOption = {
  id: number;

  name?: string | null;

  email?: string | null;

  contact?: string | null;

  age?: number | null;

  gender?: string | null;

  patient_type?:
    | "registered"
    | "front_desk"
    | string
    | null;
};


type DoctorOption = {
  id: number;

  name?: string | null;

  specialization?: string | null;

  room_number?: string | null;

  duty_status?: string | null;
};


type EmergencyResult = {
  appointment?: {
    id?: number;

    appointment_date?: string;

    appointment_type?: string;

    booking_source?: string;

    slot_id?: number | null;

    status?: string;

    emergency_reason?: string | null;
  };

  patient?: {
    id?: number;

    name?: string | null;

    contact?: string | null;

    age?: number | null;

    gender?: string | null;

    patient_type?: string | null;
  };

  doctor?: {
    id?: number;

    name?: string | null;

    specialization?: string | null;

    room_number?: string | null;

    duty_status?: string | null;
  };

  queue?: {
    id?: number;

    token_number?: number;

    priority?: string;

    status?: string;

    checked_in?: boolean;

    check_in_time?: string | null;
  };
};


// ============================================================
// SCREEN
// ============================================================

export default function ReceptionistEmergencyScreen() {
  const router =
    useRouter();


  // =========================================================
  // OPTIONS
  // =========================================================

  const [
    patients,
    setPatients,
  ] =
    useState<
      PatientOption[]
    >([]);

  const [
    doctors,
    setDoctors,
  ] =
    useState<
      DoctorOption[]
    >([]);


  // =========================================================
  // PATIENT MODE
  // =========================================================

  const [
    patientMode,
    setPatientMode,
  ] =
    useState<PatientMode>(
      "existing"
    );


  // =========================================================
  // EXISTING PATIENT
  // =========================================================

  const [
    selectedPatientId,
    setSelectedPatientId,
  ] =
    useState<
      number | null
    >(null);

  const [
    search,
    setSearch,
  ] =
    useState("");


  // =========================================================
  // NEW EMERGENCY PATIENT
  // =========================================================

  const [
    newPatientName,
    setNewPatientName,
  ] =
    useState("");

  const [
    newPatientContact,
    setNewPatientContact,
  ] =
    useState("");

  const [
    newPatientAge,
    setNewPatientAge,
  ] =
    useState("");

  const [
    newPatientGender,
    setNewPatientGender,
  ] =
    useState<
      "Male"
      | "Female"
      | "Other"
      | ""
    >("");


  // =========================================================
  // DOCTOR + REASON
  // =========================================================

  const [
    selectedDoctorId,
    setSelectedDoctorId,
  ] =
    useState<
      number | null
    >(null);

  const [
    emergencyReason,
    setEmergencyReason,
  ] =
    useState("");


  // =========================================================
  // UI STATE
  // =========================================================

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
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    result,
    setResult,
  ] =
    useState<
      EmergencyResult | null
    >(null);


  // =========================================================
  // LOAD OPTIONS
  // =========================================================

  const loadOptions =
    useCallback(
      async () => {
        try {
          setError("");

          const response =
            await apiRequest(
              "/api/receptionist/emergency/options"
            );

          setPatients(
            Array.isArray(
              response?.patients
            )
              ? response.patients
              : []
          );

          setDoctors(
            Array.isArray(
              response?.on_duty_doctors
            )
              ? response.on_duty_doctors
              : []
          );
        } catch (
          err: any
        ) {
          setError(
            err?.message ||
              "Unable to load emergency walk-in options."
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
        loadOptions();
      },
      [
        loadOptions,
      ]
    )
  );


  // =========================================================
  // FILTER PATIENTS
  // =========================================================

  const filteredPatients =
    useMemo(
      () => {
        const value =
          search
            .trim()
            .toLowerCase();

        if (
          !value
        ) {
          return patients;
        }

        return patients.filter(
          (
            patient
          ) => {
            const name =
              (
                patient.name ||
                ""
              )
                .toLowerCase();

            const email =
              (
                patient.email ||
                ""
              )
                .toLowerCase();

            const contact =
              (
                patient.contact ||
                ""
              )
                .toLowerCase();

            return (
              name.includes(
                value
              )
              ||
              email.includes(
                value
              )
              ||
              contact.includes(
                value
              )
            );
          }
        );
      },
      [
        patients,
        search,
      ]
    );


  // =========================================================
  // SELECTED RECORDS
  // =========================================================

  const selectedPatient =
    useMemo(
      () =>
        patients.find(
          (
            patient
          ) =>
            patient.id ===
            selectedPatientId
        ) || null,
      [
        patients,
        selectedPatientId,
      ]
    );


  const selectedDoctor =
    useMemo(
      () =>
        doctors.find(
          (
            doctor
          ) =>
            doctor.id ===
            selectedDoctorId
        ) || null,
      [
        doctors,
        selectedDoctorId,
      ]
    );


  // =========================================================
  // CHANGE PATIENT MODE
  // =========================================================

  const switchPatientMode = (
    mode: PatientMode
  ) => {
    setPatientMode(
      mode
    );

    setError("");

    setSelectedPatientId(
      null
    );

    setSearch("");

    setNewPatientName(
      ""
    );

    setNewPatientContact(
      ""
    );

    setNewPatientAge(
      ""
    );

    setNewPatientGender(
      ""
    );
  };


  // =========================================================
  // FORM VALIDITY
  // =========================================================

  const hasValidPatient =
    patientMode ===
    "existing"
      ? selectedPatientId !==
        null
      : (
        newPatientName
          .trim()
          .length >= 2
      );


  const canSubmit =
    hasValidPatient
    &&
    selectedDoctorId !==
      null
    &&
    emergencyReason
      .trim()
      .length >= 3
    &&
    !saving;


  // =========================================================
  // CREATE EMERGENCY WALK-IN
  // =========================================================

  const handleCreateEmergency =
    async () => {
      setError("");

      // ------------------------------------------------------
      // PATIENT
      // ------------------------------------------------------

      if (
        patientMode ===
        "existing"
      ) {
        if (
          !selectedPatientId
        ) {
          setError(
            "Please select an existing patient."
          );

          return;
        }
      } else {
        const cleanName =
          newPatientName
            .trim();

        if (
          cleanName.length <
          2
        ) {
          setError(
            "Please enter the emergency patient's name."
          );

          return;
        }

        if (
          newPatientAge
            .trim()
        ) {
          const age =
            Number(
              newPatientAge
            );

          if (
            !Number.isInteger(
              age
            )
            ||
            age < 0
            ||
            age > 130
          ) {
            setError(
              "Please enter a valid patient age."
            );

            return;
          }
        }
      }


      // ------------------------------------------------------
      // DOCTOR
      // ------------------------------------------------------

      if (
        !selectedDoctorId
      ) {
        setError(
          "Please select an on-duty doctor."
        );

        return;
      }


      // ------------------------------------------------------
      // REASON
      // ------------------------------------------------------

      const reason =
        emergencyReason
          .trim();

      if (
        reason.length < 3
      ) {
        setError(
          "Please enter the emergency reason."
        );

        return;
      }


      // ------------------------------------------------------
      // REQUEST BODY
      // ------------------------------------------------------

      const requestBody: any = {
        doctor_id:
          selectedDoctorId,

        emergency_reason:
          reason,
      };


      if (
        patientMode ===
        "existing"
      ) {
        requestBody.patient_id =
          selectedPatientId;
      } else {
        requestBody.new_patient = {
          name:
            newPatientName
              .trim(),

          contact:
            newPatientContact
              .trim()
            ||
            null,

          age:
            newPatientAge
              .trim()
              ? Number(
                  newPatientAge
                )
              : null,

          gender:
            newPatientGender
            ||
            null,
        };
      }


      // ------------------------------------------------------
      // CREATE
      // ------------------------------------------------------

      try {
        setSaving(
          true
        );

        const response =
          await apiRequest(
            "/api/receptionist/emergency/walk-in",
            {
              method:
                "POST",

              body:
                JSON.stringify(
                  requestBody
                ),
            }
          );

        setResult(
          response ||
          null
        );
      } catch (
        err: any
      ) {
        setError(
          err?.message ||
            "Unable to create emergency walk-in."
        );
      } finally {
        setSaving(
          false
        );
      }
    };


  // =========================================================
  // RESET FORM
  // =========================================================

  const resetForm =
    async () => {
      setResult(
        null
      );

      setPatientMode(
        "existing"
      );

      setSelectedPatientId(
        null
      );

      setSelectedDoctorId(
        null
      );

      setEmergencyReason(
        ""
      );

      setSearch(
        ""
      );

      setNewPatientName(
        ""
      );

      setNewPatientContact(
        ""
      );

      setNewPatientAge(
        ""
      );

      setNewPatientGender(
        ""
      );

      setError(
        ""
      );

      setLoading(
        true
      );

      await loadOptions();
    };


  // =========================================================
  // SUCCESS SCREEN
  // =========================================================

  if (
    result
  ) {
    const patientType =
      result.patient
        ?.patient_type ===
      "registered"
        ? "Registered Patient"
        : "Quick Emergency Registration";

    return (
      <View
        style={
          styles.screen
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.successContainer
          }
        >
          <View
            style={
              styles.successIcon
            }
          >
            <Ionicons
              name=
                "checkmark-circle"

              size={72}

              color="#15803D"
            />
          </View>


          <Text
            style={
              styles.successTitle
            }
          >
            Emergency Walk-In Added
          </Text>


          <Text
            style={
              styles.successSubtitle
            }
          >
            Patient has been automatically checked in and added to the urgent queue.
          </Text>


          {
            result.patient
              ?.patient_type ===
            "front_desk"
              ? (
                <View
                  style={
                    styles.quickRegistrationSuccess
                  }
                >
                  <Ionicons
                    name=
                      "person-add-outline"

                    size={18}

                    color="#0F766E"
                  />

                  <Text
                    style={
                      styles.quickRegistrationSuccessText
                    }
                  >
                    New emergency patient was registered at the front desk without requiring a portal account.
                  </Text>
                </View>
              )
              : null
          }


          <View
            style={
              styles.resultCard
            }
          >
            <ResultRow
              label="Patient"
              value={
                result.patient
                  ?.name ||
                "—"
              }
            />

            <ResultRow
              label="Patient Type"
              value={
                patientType
              }
            />

            <ResultRow
              label="Contact"
              value={
                result.patient
                  ?.contact ||
                "Not provided"
              }
            />

            {
              result.patient
                ?.age != null
                ? (
                  <ResultRow
                    label="Age"
                    value={
                      String(
                        result.patient
                          .age
                      )
                    }
                  />
                )
                : null
            }

            {
              result.patient
                ?.gender
                ? (
                  <ResultRow
                    label="Gender"
                    value={
                      result.patient
                        .gender
                    }
                  />
                )
                : null
            }

            <ResultRow
              label="Doctor"
              value={
                result.doctor
                  ?.name ||
                "—"
              }
            />

            <ResultRow
              label=
                "Specialization"

              value={
                result.doctor
                  ?.specialization ||
                "—"
              }
            />

            <ResultRow
              label="Room"
              value={
                result.doctor
                  ?.room_number ||
                "—"
              }
            />

            <ResultRow
              label=
                "Queue Token"

              value={
                result.queue
                  ?.token_number !=
                null
                  ? `#${result.queue.token_number}`
                  : "—"
              }
            />

            <ResultRow
              label="Priority"
              value={
                (
                  result.queue
                    ?.priority ||
                  "urgent"
                ).toUpperCase()
              }
            />

            <ResultRow
              label=
                "Queue Status"

              value={
                result.queue
                  ?.status ||
                "waiting"
              }
            />

            <ResultRow
              label=
                "Booking Source"

              value={
                result.appointment
                  ?.booking_source ||
                "walk_in"
              }
            />

            <ResultRow
              label="Check-In"
              value={
                result.queue
                  ?.checked_in
                  ? "Automatic ✓"
                  : "—"
              }
            />
          </View>


          <View
            style={
              styles.reasonResultCard
            }
          >
            <Text
              style={
                styles.reasonResultLabel
              }
            >
              Emergency Reason
            </Text>

            <Text
              style={
                styles.reasonResultText
              }
            >
              {
                result.appointment
                  ?.emergency_reason ||
                emergencyReason ||
                "—"
              }
            </Text>
          </View>


          <Pressable
            onPress={
              () =>
                router.replace(
                  "/receptionist-live-queue"
                )
            }

            style={({
              pressed,
            }) => [
              styles.primaryButton,

              pressed &&
                styles.pressed,
            ]}
          >
            <Ionicons
              name=
                "people-outline"

              size={19}

              color="#FFFFFF"
            />

            <Text
              style={
                styles.primaryButtonText
              }
            >
              View Live Queue
            </Text>
          </Pressable>


          <Pressable
            onPress={
              resetForm
            }

            style={({
              pressed,
            }) => [
              styles.secondaryButton,

              pressed &&
                styles.pressed,
            ]}
          >
            <Ionicons
              name=
                "add-circle-outline"

              size={19}

              color="#B91C1C"
            />

            <Text
              style={
                styles.secondaryButtonText
              }
            >
              Add Another Emergency
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }


  // =========================================================
  // MAIN SCREEN
  // =========================================================

  return (
    <View
      style={
        styles.screen
      }
    >
      <ScrollView
        keyboardShouldPersistTaps=
          "handled"

        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }

            onRefresh={() => {
              setRefreshing(
                true
              );

              loadOptions();
            }}
          />
        }

        contentContainerStyle={
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
              color="#172033"
            />
          </Pressable>


          <View
            style={
              styles.headerText
            }
          >
            <Text
              style={
                styles.title
              }
            >
              Emergency Walk-In
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              Use an existing patient or quickly register a new emergency patient.
            </Text>
          </View>
        </View>


        {/* =================================================
            WARNING
        ================================================= */}

        <View
          style={
            styles.warningCard
          }
        >
          <View
            style={
              styles.warningIcon
            }
          >
            <Ionicons
              name=
                "warning-outline"

              size={22}

              color="#B91C1C"
            />
          </View>

          <View
            style={{
              flex: 1,
            }}
          >
            <Text
              style={
                styles.warningTitle
              }
            >
              Urgent Walk-In
            </Text>

            <Text
              style={
                styles.warningText
              }
            >
              This creates a same-day in-person appointment, checks the patient in automatically and gives the queue urgent priority.
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
                <Ionicons
                  name=
                    "alert-circle-outline"

                  size={20}

                  color="#B91C1C"
                />

                <Text
                  style={
                    styles.errorText
                  }
                >
                  {error}
                </Text>
              </View>
            )
            : null
        }


        {
          loading
            ? (
              <View
                style={
                  styles.loadingCard
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
                  Loading patients and doctors...
                </Text>
              </View>
            )
            : (
              <>
                {/* ===========================================
                    STEP 1 - PATIENT
                =========================================== */}

                <SectionHeader
                  number="1"
                  title=
                    "Patient"

                  subtitle=
                    "Select an existing patient or quick-register a new emergency patient"
                />


                {/* ===========================================
                    PATIENT MODE TABS
                =========================================== */}

                <View
                  style={
                    styles.modeContainer
                  }
                >
                  <Pressable
                    onPress={() =>
                      switchPatientMode(
                        "existing"
                      )
                    }

                    style={({
                      pressed,
                    }) => [
                      styles.modeButton,

                      patientMode ===
                        "existing"
                        &&
                        styles.modeButtonActive,

                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name=
                        "search-outline"

                      size={18}

                      color={
                        patientMode ===
                        "existing"
                          ? "#FFFFFF"
                          : "#0F766E"
                      }
                    />

                    <Text
                      style={[
                        styles.modeButtonText,

                        patientMode ===
                          "existing"
                          &&
                          styles.modeButtonTextActive,
                      ]}
                    >
                      Existing Patient
                    </Text>
                  </Pressable>


                  <Pressable
                    onPress={() =>
                      switchPatientMode(
                        "new"
                      )
                    }

                    style={({
                      pressed,
                    }) => [
                      styles.modeButton,

                      patientMode ===
                        "new"
                        &&
                        styles.modeButtonActive,

                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name=
                        "person-add-outline"

                      size={18}

                      color={
                        patientMode ===
                        "new"
                          ? "#FFFFFF"
                          : "#0F766E"
                      }
                    />

                    <Text
                      style={[
                        styles.modeButtonText,

                        patientMode ===
                          "new"
                          &&
                          styles.modeButtonTextActive,
                      ]}
                    >
                      New Emergency Patient
                    </Text>
                  </Pressable>
                </View>


                {/* ===========================================
                    EXISTING PATIENT
                =========================================== */}

                {
                  patientMode ===
                  "existing"
                    ? (
                      <>
                        <View
                          style={
                            styles.modeInfoCard
                          }
                        >
                          <Ionicons
                            name=
                              "information-circle-outline"

                            size={18}

                            color="#1D4ED8"
                          />

                          <Text
                            style={
                              styles.modeInfoText
                            }
                          >
                            Search registered patients or previously-created front-desk patients.
                          </Text>
                        </View>


                        <View
                          style={
                            styles.searchBox
                          }
                        >
                          <Ionicons
                            name=
                              "search-outline"

                            size={19}

                            color="#64748B"
                          />

                          <TextInput
                            value={
                              search
                            }

                            onChangeText={
                              setSearch
                            }

                            placeholder=
                              "Search name, email or contact"

                            placeholderTextColor=
                              "#94A3B8"

                            autoCapitalize=
                              "none"

                            style={
                              styles.searchInput
                            }
                          />

                          {
                            search
                              ? (
                                <Pressable
                                  onPress={() =>
                                    setSearch(
                                      ""
                                    )
                                  }
                                >
                                  <Ionicons
                                    name=
                                      "close-circle"

                                    size={20}

                                    color="#94A3B8"
                                  />
                                </Pressable>
                              )
                              : null
                          }
                        </View>


                        <View
                          style={
                            styles.optionsContainer
                          }
                        >
                          {
                            filteredPatients
                              .length > 0
                              ? (
                                filteredPatients
                                  .map(
                                    (
                                      patient
                                    ) => {
                                      const selected =
                                        selectedPatientId ===
                                        patient.id;

                                      const isFrontDesk =
                                        patient.patient_type ===
                                        "front_desk";

                                      return (
                                        <Pressable
                                          key={
                                            patient.id
                                          }

                                          onPress={() => {
                                            setSelectedPatientId(
                                              patient.id
                                            );

                                            setError(
                                              ""
                                            );
                                          }}

                                          style={({
                                            pressed,
                                          }) => [
                                            styles.patientCard,

                                            selected &&
                                              styles.selectedCard,

                                            pressed &&
                                              styles.pressed,
                                          ]}
                                        >
                                          <View
                                            style={[
                                              styles.avatar,

                                              selected &&
                                                styles.selectedAvatar,
                                            ]}
                                          >
                                            <Ionicons
                                              name=
                                                "person-outline"

                                              size={20}

                                              color={
                                                selected
                                                  ? "#FFFFFF"
                                                  : "#0F766E"
                                              }
                                            />
                                          </View>


                                          <View
                                            style={
                                              styles.optionContent
                                            }
                                          >
                                            <View
                                              style={
                                                styles.patientNameRow
                                              }
                                            >
                                              <Text
                                                style={
                                                  styles.optionTitle
                                                }
                                              >
                                                {
                                                  patient.name ||
                                                  "Unnamed Patient"
                                                }
                                              </Text>

                                              <View
                                                style={[
                                                  styles.patientTypeBadge,

                                                  isFrontDesk
                                                    ? styles.frontDeskBadge
                                                    : styles.registeredBadge,
                                                ]}
                                              >
                                                <Text
                                                  style={[
                                                    styles.patientTypeText,

                                                    isFrontDesk
                                                      ? styles.frontDeskText
                                                      : styles.registeredText,
                                                  ]}
                                                >
                                                  {
                                                    isFrontDesk
                                                      ? "Front Desk"
                                                      : "Registered"
                                                  }
                                                </Text>
                                              </View>
                                            </View>


                                            <Text
                                              style={
                                                styles.optionSubtitle
                                              }
                                            >
                                              {
                                                patient.contact ||
                                                "No contact"
                                              }
                                            </Text>


                                            {
                                              patient.email
                                                ? (
                                                  <Text
                                                    style={
                                                      styles.optionMeta
                                                    }
                                                  >
                                                    {
                                                      patient.email
                                                    }
                                                  </Text>
                                                )
                                                : null
                                            }


                                            {
                                              patient.age !=
                                                null
                                              ||
                                              patient.gender
                                                ? (
                                                  <Text
                                                    style={
                                                      styles.optionMeta
                                                    }
                                                  >
                                                    {
                                                      patient.age !=
                                                        null
                                                        ? `${patient.age} years`
                                                        : ""
                                                    }

                                                    {
                                                      patient.age !=
                                                        null
                                                      &&
                                                      patient.gender
                                                        ? " • "
                                                        : ""
                                                    }

                                                    {
                                                      patient.gender ||
                                                      ""
                                                    }
                                                  </Text>
                                                )
                                                : null
                                            }
                                          </View>


                                          <Ionicons
                                            name={
                                              selected
                                                ? "checkmark-circle"
                                                : "ellipse-outline"
                                            }

                                            size={22}

                                            color={
                                              selected
                                                ? "#0F766E"
                                                : "#CBD5E1"
                                            }
                                          />
                                        </Pressable>
                                      );
                                    }
                                  )
                              )
                              : (
                                <View
                                  style={
                                    styles.emptyCard
                                  }
                                >
                                  <Ionicons
                                    name=
                                      "person-outline"

                                    size={28}

                                    color="#94A3B8"
                                  />

                                  <Text
                                    style={
                                      styles.emptyTitle
                                    }
                                  >
                                    No Patient Found
                                  </Text>

                                  <Text
                                    style={
                                      styles.emptyText
                                    }
                                  >
                                    Try another search, or choose New Emergency Patient above.
                                  </Text>
                                </View>
                              )
                          }
                        </View>
                      </>
                    )
                    : (
                      <>
                        {/* ===================================
                            NEW PATIENT QUICK REGISTRATION
                        =================================== */}

                        <View
                          style={
                            styles.quickRegistrationCard
                          }
                        >
                          <View
                            style={
                              styles.quickRegistrationHeader
                            }
                          >
                            <View
                              style={
                                styles.quickRegistrationIcon
                              }
                            >
                              <Ionicons
                                name=
                                  "flash-outline"

                                size={21}

                                color="#B45309"
                              />
                            </View>

                            <View
                              style={{
                                flex: 1,
                              }}
                            >
                              <Text
                                style={
                                  styles.quickRegistrationTitle
                                }
                              >
                                Quick Emergency Registration
                              </Text>

                              <Text
                                style={
                                  styles.quickRegistrationText
                                }
                              >
                                No email, password or patient portal account is required for emergency treatment.
                              </Text>
                            </View>
                          </View>


                          <Text
                            style={
                              styles.formLabel
                            }
                          >
                            Patient Full Name *
                          </Text>

                          <TextInput
                            value={
                              newPatientName
                            }

                            onChangeText={
                              setNewPatientName
                            }

                            placeholder=
                              "Example: Muhammad Ali"

                            placeholderTextColor=
                              "#94A3B8"

                            maxLength={100}

                            style={
                              styles.formInput
                            }
                          />


                          <Text
                            style={
                              styles.formLabel
                            }
                          >
                            Contact Number
                          </Text>

                          <TextInput
                            value={
                              newPatientContact
                            }

                            onChangeText={
                              setNewPatientContact
                            }

                            placeholder=
                              "Example: 03001234567"

                            placeholderTextColor=
                              "#94A3B8"

                            keyboardType=
                              "phone-pad"

                            maxLength={30}

                            style={
                              styles.formInput
                            }
                          />


                          <Text
                            style={
                              styles.formLabel
                            }
                          >
                            Age
                          </Text>

                          <TextInput
                            value={
                              newPatientAge
                            }

                            onChangeText={
                              (
                                value
                              ) =>
                                setNewPatientAge(
                                  value.replace(
                                    /[^0-9]/g,
                                    ""
                                  )
                                )
                            }

                            placeholder=
                              "Example: 35"

                            placeholderTextColor=
                              "#94A3B8"

                            keyboardType=
                              "number-pad"

                            maxLength={3}

                            style={
                              styles.formInput
                            }
                          />


                          <Text
                            style={
                              styles.formLabel
                            }
                          >
                            Gender
                          </Text>

                          <View
                            style={
                              styles.genderRow
                            }
                          >
                            {
                              (
                                [
                                  "Male",
                                  "Female",
                                  "Other",
                                ] as const
                              ).map(
                                (
                                  gender
                                ) => {
                                  const selected =
                                    newPatientGender ===
                                    gender;

                                  return (
                                    <Pressable
                                      key={
                                        gender
                                      }

                                      onPress={() =>
                                        setNewPatientGender(
                                          gender
                                        )
                                      }

                                      style={({
                                        pressed,
                                      }) => [
                                        styles.genderButton,

                                        selected &&
                                          styles.genderButtonSelected,

                                        pressed &&
                                          styles.pressed,
                                      ]}
                                    >
                                      <Ionicons
                                        name={
                                          selected
                                            ? "radio-button-on"
                                            : "radio-button-off"
                                        }

                                        size={17}

                                        color={
                                          selected
                                            ? "#0F766E"
                                            : "#64748B"
                                        }
                                      />

                                      <Text
                                        style={[
                                          styles.genderButtonText,

                                          selected &&
                                            styles.genderButtonTextSelected,
                                        ]}
                                      >
                                        {gender}
                                      </Text>
                                    </Pressable>
                                  );
                                }
                              )
                            }
                          </View>


                          <Text
                            style={
                              styles.optionalNotice
                            }
                          >
                            Only the patient's name is required to avoid delaying emergency care. Other details can be completed later.
                          </Text>
                        </View>
                      </>
                    )
                }


                {/* ===========================================
                    STEP 2 - DOCTOR
                =========================================== */}

                <SectionHeader
                  number="2"
                  title=
                    "Select On-Duty Doctor"

                  subtitle=
                    "Only active doctors currently available for emergency care are shown"
                />


                <View
                  style={
                    styles.optionsContainer
                  }
                >
                  {
                    doctors.length >
                    0
                      ? (
                        doctors.map(
                          (
                            doctor
                          ) => {
                            const selected =
                              selectedDoctorId ===
                              doctor.id;

                            return (
                              <Pressable
                                key={
                                  doctor.id
                                }

                                onPress={() => {
                                  setSelectedDoctorId(
                                    doctor.id
                                  );

                                  setError(
                                    ""
                                  );
                                }}

                                style={({
                                  pressed,
                                }) => [
                                  styles.doctorCard,

                                  selected &&
                                    styles.selectedCard,

                                  pressed &&
                                    styles.pressed,
                                ]}
                              >
                                <View
                                  style={[
                                    styles.doctorIcon,

                                    selected &&
                                      styles.selectedAvatar,
                                  ]}
                                >
                                  <Ionicons
                                    name=
                                      "medkit-outline"

                                    size={20}

                                    color={
                                      selected
                                        ? "#FFFFFF"
                                        : "#0F766E"
                                    }
                                  />
                                </View>


                                <View
                                  style={
                                    styles.optionContent
                                  }
                                >
                                  <Text
                                    style={
                                      styles.optionTitle
                                    }
                                  >
                                    {
                                      doctor.name ||
                                      "Doctor"
                                    }
                                  </Text>

                                  <Text
                                    style={
                                      styles.optionSubtitle
                                    }
                                  >
                                    {
                                      doctor.specialization ||
                                      "General"
                                    }
                                  </Text>

                                  <Text
                                    style={
                                      styles.optionMeta
                                    }
                                  >
                                    {
                                      doctor.room_number ||
                                      "Room not assigned"
                                    }
                                  </Text>
                                </View>


                                <View
                                  style={
                                    styles.onDutyBadge
                                  }
                                >
                                  <View
                                    style={
                                      styles.onDutyDot
                                    }
                                  />

                                  <Text
                                    style={
                                      styles.onDutyText
                                    }
                                  >
                                    On Duty
                                  </Text>
                                </View>


                                <Ionicons
                                  name={
                                    selected
                                      ? "checkmark-circle"
                                      : "ellipse-outline"
                                  }

                                  size={22}

                                  color={
                                    selected
                                      ? "#0F766E"
                                      : "#CBD5E1"
                                  }
                                />
                              </Pressable>
                            );
                          }
                        )
                      )
                      : (
                        <View
                          style={
                            styles.noDoctorCard
                          }
                        >
                          <Ionicons
                            name=
                              "medical-outline"

                            size={30}

                            color="#B91C1C"
                          />

                          <Text
                            style={
                              styles.noDoctorTitle
                            }
                          >
                            No Doctor On Duty
                          </Text>

                          <Text
                            style={
                              styles.noDoctorText
                            }
                          >
                            An emergency walk-in cannot be created until an active doctor marks themselves on duty.
                          </Text>
                        </View>
                      )
                  }
                </View>


                {/* ===========================================
                    STEP 3 - REASON
                =========================================== */}

                <SectionHeader
                  number="3"
                  title=
                    "Emergency Reason"

                  subtitle=
                    "Briefly describe the urgent symptoms or reason for arrival"
                />


                <TextInput
                  value={
                    emergencyReason
                  }

                  onChangeText={
                    setEmergencyReason
                  }

                  placeholder=
                    "Example: Severe chest pain and difficulty breathing"

                  placeholderTextColor=
                    "#94A3B8"

                  multiline

                  numberOfLines={5}

                  textAlignVertical=
                    "top"

                  maxLength={1000}

                  style={
                    styles.reasonInput
                  }
                />


                <Text
                  style={
                    styles.characterCount
                  }
                >
                  {
                    emergencyReason.length
                  }
                  /1000
                </Text>


                {/* ===========================================
                    REVIEW
                =========================================== */}

                <View
                  style={
                    styles.reviewCard
                  }
                >
                  <Text
                    style={
                      styles.reviewTitle
                    }
                  >
                    Emergency Review
                  </Text>


                  <ReviewRow
                    label=
                      "Patient"

                    value={
                      patientMode ===
                      "existing"
                        ? (
                          selectedPatient
                            ?.name ||
                          "Not selected"
                        )
                        : (
                          newPatientName
                            .trim() ||
                          "Not entered"
                        )
                    }
                  />


                  <ReviewRow
                    label=
                      "Patient Type"

                    value={
                      patientMode ===
                      "existing"
                        ? (
                          selectedPatient
                            ?.patient_type ===
                          "front_desk"
                            ? "Front Desk"
                            : "Registered"
                        )
                        : "New Emergency Patient"
                    }
                  />


                  <ReviewRow
                    label="Doctor"
                    value={
                      selectedDoctor
                        ?.name ||
                      "Not selected"
                    }
                  />


                  <ReviewRow
                    label="Priority"
                    value="URGENT"
                  />


                  <ReviewRow
                    label=
                      "Appointment"

                    value=
                      "Walk-In • In Person"
                  />


                  <ReviewRow
                    label="Check-In"
                    value="Automatic"
                  />
                </View>


                {/* ===========================================
                    SUBMIT
                =========================================== */}

                <Pressable
                  disabled={
                    !canSubmit
                  }

                  onPress={
                    handleCreateEmergency
                  }

                  style={({
                    pressed,
                  }) => [
                    styles.emergencyButton,

                    !canSubmit &&
                      styles.disabled,

                    pressed &&
                      canSubmit &&
                      styles.pressed,
                  ]}
                >
                  {
                    saving
                      ? (
                        <ActivityIndicator
                          size="small"
                          color="#FFFFFF"
                        />
                      )
                      : (
                        <Ionicons
                          name=
                            "warning-outline"

                          size={20}

                          color="#FFFFFF"
                        />
                      )
                  }


                  <Text
                    style={
                      styles.emergencyButtonText
                    }
                  >
                    {
                      saving
                        ? "Creating Emergency..."
                        : patientMode ===
                          "new"
                          ? "Register & Create Urgent Walk-In"
                          : "Create Urgent Walk-In"
                    }
                  </Text>
                </Pressable>


                <Text
                  style={
                    styles.submitNotice
                  }
                >
                  The patient will be automatically checked in and enter the selected doctor's urgent queue immediately.
                </Text>
              </>
            )
        }
      </ScrollView>
    </View>
  );
}


// ============================================================
// SECTION HEADER
// ============================================================

function SectionHeader({
  number,
  title,
  subtitle,
}: {
  number: string;

  title: string;

  subtitle: string;
}) {
  return (
    <View
      style={
        styles.sectionHeader
      }
    >
      <View
        style={
          styles.stepNumber
        }
      >
        <Text
          style={
            styles.stepNumberText
          }
        >
          {number}
        </Text>
      </View>


      <View
        style={{
          flex: 1,
        }}
      >
        <Text
          style={
            styles.sectionTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.sectionSubtitle
          }
        >
          {subtitle}
        </Text>
      </View>
    </View>
  );
}


// ============================================================
// REVIEW ROW
// ============================================================

function ReviewRow({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <View
      style={
        styles.reviewRow
      }
    >
      <Text
        style={
          styles.reviewLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.reviewValue
        }
      >
        {value}
      </Text>
    </View>
  );
}


// ============================================================
// RESULT ROW
// ============================================================

function ResultRow({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <View
      style={
        styles.resultRow
      }
    >
      <Text
        style={
          styles.resultLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.resultValue
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


    container: {
      width: "100%",

      maxWidth: 900,

      alignSelf:
        "center",

      paddingHorizontal: 18,

      paddingTop: 22,

      paddingBottom: 50,
    },


    // ========================================================
    // HEADER
    // ========================================================

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

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 12,

      borderWidth: 1,

      borderColor:
        "#E2E8F0",
    },


    headerText: {
      flex: 1,
    },


    title: {
      color:
        "#172033",

      fontSize: 23,

      fontWeight:
        "900",
    },


    subtitle: {
      color:
        "#64748B",

      fontSize: 12,

      lineHeight: 18,

      marginTop: 3,
    },


    // ========================================================
    // WARNING
    // ========================================================

    warningCard: {
      flexDirection:
        "row",

      backgroundColor:
        "#FEF2F2",

      borderRadius: 16,

      borderWidth: 1,

      borderColor:
        "#FECACA",

      padding: 16,

      marginBottom: 18,
    },


    warningIcon: {
      width: 40,

      height: 40,

      borderRadius: 12,

      backgroundColor:
        "#FFFFFF",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 12,
    },


    warningTitle: {
      color:
        "#991B1B",

      fontSize: 14,

      fontWeight:
        "900",
    },


    warningText: {
      color:
        "#B91C1C",

      fontSize: 11,

      lineHeight: 17,

      marginTop: 4,
    },


    // ========================================================
    // ERROR / LOADING
    // ========================================================

    errorCard: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 9,

      backgroundColor:
        "#FEF2F2",

      borderWidth: 1,

      borderColor:
        "#FECACA",

      borderRadius: 13,

      padding: 13,

      marginBottom: 16,
    },


    errorText: {
      flex: 1,

      color:
        "#B91C1C",

      fontSize: 12,

      fontWeight:
        "700",
    },


    loadingCard: {
      backgroundColor:
        "#FFFFFF",

      borderRadius: 16,

      padding: 35,

      alignItems:
        "center",

      borderWidth: 1,

      borderColor:
        "#E2E8F0",
    },


    loadingText: {
      color:
        "#64748B",

      fontSize: 12,

      marginTop: 12,
    },


    // ========================================================
    // SECTION
    // ========================================================

    sectionHeader: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginTop: 21,

      marginBottom: 12,
    },


    stepNumber: {
      width: 34,

      height: 34,

      borderRadius: 17,

      backgroundColor:
        "#0F766E",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 11,
    },


    stepNumberText: {
      color:
        "#FFFFFF",

      fontSize: 13,

      fontWeight:
        "900",
    },


    sectionTitle: {
      color:
        "#172033",

      fontSize: 15,

      fontWeight:
        "900",
    },


    sectionSubtitle: {
      color:
        "#64748B",

      fontSize: 10,

      lineHeight: 15,

      marginTop: 2,
    },


    // ========================================================
    // PATIENT MODE
    // ========================================================

    modeContainer: {
      flexDirection:
        "row",

      gap: 10,

      marginBottom: 12,
    },


    modeButton: {
      flex: 1,

      minHeight: 48,

      borderRadius: 13,

      borderWidth: 1,

      borderColor:
        "#99F6E4",

      backgroundColor:
        "#FFFFFF",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 7,

      paddingHorizontal: 10,
    },


    modeButtonActive: {
      backgroundColor:
        "#0F766E",

      borderColor:
        "#0F766E",
    },


    modeButtonText: {
      color:
        "#0F766E",

      fontSize: 11,

      fontWeight:
        "800",

      textAlign:
        "center",
    },


    modeButtonTextActive: {
      color:
        "#FFFFFF",
    },


    modeInfoCard: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 8,

      padding: 11,

      marginBottom: 10,

      borderRadius: 11,

      backgroundColor:
        "#EFF6FF",

      borderWidth: 1,

      borderColor:
        "#DBEAFE",
    },


    modeInfoText: {
      flex: 1,

      color:
        "#475569",

      fontSize: 10,

      lineHeight: 15,
    },


    // ========================================================
    // SEARCH
    // ========================================================

    searchBox: {
      minHeight: 48,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 9,

      backgroundColor:
        "#FFFFFF",

      borderRadius: 13,

      borderWidth: 1,

      borderColor:
        "#DDE4EC",

      paddingHorizontal: 14,

      marginBottom: 10,
    },


    searchInput: {
      flex: 1,

      minHeight: 46,

      color:
        "#172033",

      fontSize: 12,
    },


    optionsContainer: {
      gap: 9,
    },


    // ========================================================
    // PATIENT / DOCTOR CARDS
    // ========================================================

    patientCard: {
      flexDirection:
        "row",

      alignItems:
        "center",

      backgroundColor:
        "#FFFFFF",

      borderRadius: 14,

      borderWidth: 1,

      borderColor:
        "#E2E8F0",

      padding: 13,
    },


    doctorCard: {
      flexDirection:
        "row",

      alignItems:
        "center",

      backgroundColor:
        "#FFFFFF",

      borderRadius: 14,

      borderWidth: 1,

      borderColor:
        "#E2E8F0",

      padding: 13,
    },


    selectedCard: {
      borderColor:
        "#0F766E",

      backgroundColor:
        "#F0FDFA",
    },


    avatar: {
      width: 42,

      height: 42,

      borderRadius: 21,

      backgroundColor:
        "#ECFDF5",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 11,
    },


    doctorIcon: {
      width: 42,

      height: 42,

      borderRadius: 12,

      backgroundColor:
        "#ECFDF5",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 11,
    },


    selectedAvatar: {
      backgroundColor:
        "#0F766E",
    },


    optionContent: {
      flex: 1,
    },


    patientNameRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      flexWrap:
        "wrap",

      gap: 7,
    },


    optionTitle: {
      color:
        "#172033",

      fontSize: 13,

      fontWeight:
        "800",
    },


    optionSubtitle: {
      color:
        "#475569",

      fontSize: 11,

      marginTop: 3,
    },


    optionMeta: {
      color:
        "#94A3B8",

      fontSize: 10,

      marginTop: 2,
    },


    patientTypeBadge: {
      paddingHorizontal: 7,

      paddingVertical: 3,

      borderRadius: 20,
    },


    registeredBadge: {
      backgroundColor:
        "#DCFCE7",
    },


    frontDeskBadge: {
      backgroundColor:
        "#FEF3C7",
    },


    patientTypeText: {
      fontSize: 8,

      fontWeight:
        "900",
    },


    registeredText: {
      color:
        "#15803D",
    },


    frontDeskText: {
      color:
        "#B45309",
    },


    // ========================================================
    // ON DUTY
    // ========================================================

    onDutyBadge: {
      flexDirection:
        "row",

      alignItems:
        "center",

      backgroundColor:
        "#DCFCE7",

      borderRadius: 20,

      paddingHorizontal: 8,

      paddingVertical: 5,

      marginRight: 10,
    },


    onDutyDot: {
      width: 6,

      height: 6,

      borderRadius: 3,

      backgroundColor:
        "#15803D",

      marginRight: 5,
    },


    onDutyText: {
      color:
        "#15803D",

      fontSize: 9,

      fontWeight:
        "900",
    },


    // ========================================================
    // QUICK REGISTRATION
    // ========================================================

    quickRegistrationCard: {
      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "#FDE68A",

      borderRadius: 16,

      padding: 16,
    },


    quickRegistrationHeader: {
      flexDirection:
        "row",

      alignItems:
        "flex-start",

      marginBottom: 17,
    },


    quickRegistrationIcon: {
      width: 40,

      height: 40,

      borderRadius: 12,

      backgroundColor:
        "#FFFBEB",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 11,
    },


    quickRegistrationTitle: {
      color:
        "#92400E",

      fontSize: 13,

      fontWeight:
        "900",
    },


    quickRegistrationText: {
      color:
        "#A16207",

      fontSize: 10,

      lineHeight: 15,

      marginTop: 3,
    },


    formLabel: {
      color:
        "#334155",

      fontSize: 10,

      fontWeight:
        "800",

      marginBottom: 6,
    },


    formInput: {
      minHeight: 47,

      borderWidth: 1,

      borderColor:
        "#DDE4EC",

      backgroundColor:
        "#F8FAFC",

      borderRadius: 11,

      paddingHorizontal: 13,

      color:
        "#172033",

      fontSize: 12,

      marginBottom: 14,
    },


    genderRow: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      gap: 8,

      marginBottom: 12,
    },


    genderButton: {
      minHeight: 41,

      paddingHorizontal: 13,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 6,

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "#CBD5E1",

      borderRadius: 10,
    },


    genderButtonSelected: {
      backgroundColor:
        "#F0FDFA",

      borderColor:
        "#0F766E",
    },


    genderButtonText: {
      color:
        "#64748B",

      fontSize: 10,

      fontWeight:
        "700",
    },


    genderButtonTextSelected: {
      color:
        "#0F766E",

      fontWeight:
        "900",
    },


    optionalNotice: {
      color:
        "#64748B",

      backgroundColor:
        "#F8FAFC",

      borderRadius: 10,

      padding: 10,

      fontSize: 9,

      lineHeight: 14,
    },


    // ========================================================
    // EMPTY / NO DOCTOR
    // ========================================================

    emptyCard: {
      backgroundColor:
        "#FFFFFF",

      borderRadius: 14,

      padding: 24,

      alignItems:
        "center",

      borderWidth: 1,

      borderColor:
        "#E2E8F0",
    },


    emptyTitle: {
      color:
        "#334155",

      fontSize: 13,

      fontWeight:
        "800",

      marginTop: 8,
    },


    emptyText: {
      color:
        "#94A3B8",

      fontSize: 10,

      textAlign:
        "center",

      marginTop: 4,
    },


    noDoctorCard: {
      backgroundColor:
        "#FEF2F2",

      borderRadius: 14,

      padding: 24,

      alignItems:
        "center",

      borderWidth: 1,

      borderColor:
        "#FECACA",
    },


    noDoctorTitle: {
      color:
        "#991B1B",

      fontSize: 13,

      fontWeight:
        "900",

      marginTop: 8,
    },


    noDoctorText: {
      color:
        "#B91C1C",

      fontSize: 10,

      lineHeight: 16,

      textAlign:
        "center",

      marginTop: 5,

      maxWidth: 390,
    },


    // ========================================================
    // REASON
    // ========================================================

    reasonInput: {
      minHeight: 125,

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "#DDE4EC",

      borderRadius: 14,

      padding: 14,

      color:
        "#172033",

      fontSize: 12,

      lineHeight: 18,
    },


    characterCount: {
      alignSelf:
        "flex-end",

      color:
        "#94A3B8",

      fontSize: 9,

      marginTop: 5,
    },


    // ========================================================
    // REVIEW
    // ========================================================

    reviewCard: {
      backgroundColor:
        "#FFFFFF",

      borderRadius: 15,

      borderWidth: 1,

      borderColor:
        "#DDE4EC",

      padding: 15,

      marginTop: 20,
    },


    reviewTitle: {
      color:
        "#172033",

      fontSize: 14,

      fontWeight:
        "900",

      marginBottom: 8,
    },


    reviewRow: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      gap: 15,

      paddingVertical: 7,

      borderBottomWidth: 1,

      borderBottomColor:
        "#F1F5F9",
    },


    reviewLabel: {
      color:
        "#64748B",

      fontSize: 10,
    },


    reviewValue: {
      flex: 1,

      color:
        "#172033",

      fontSize: 10,

      fontWeight:
        "800",

      textAlign:
        "right",
    },


    // ========================================================
    // SUBMIT
    // ========================================================

    emergencyButton: {
      minHeight: 52,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 9,

      backgroundColor:
        "#B91C1C",

      borderRadius: 14,

      marginTop: 20,

      paddingHorizontal: 18,
    },


    emergencyButtonText: {
      color:
        "#FFFFFF",

      fontSize: 13,

      fontWeight:
        "900",

      textAlign:
        "center",
    },


    submitNotice: {
      color:
        "#64748B",

      fontSize: 10,

      lineHeight: 15,

      textAlign:
        "center",

      marginTop: 9,

      paddingHorizontal: 20,
    },


    disabled: {
      opacity: 0.5,
    },


    pressed: {
      opacity: 0.75,

      transform: [
        {
          scale: 0.99,
        },
      ],
    },


    // ========================================================
    // SUCCESS
    // ========================================================

    successContainer: {
      width: "100%",

      maxWidth: 650,

      alignSelf:
        "center",

      paddingHorizontal: 20,

      paddingTop: 45,

      paddingBottom: 50,

      alignItems:
        "center",
    },


    successIcon: {
      marginBottom: 12,
    },


    successTitle: {
      color:
        "#172033",

      fontSize: 22,

      fontWeight:
        "900",

      textAlign:
        "center",
    },


    successSubtitle: {
      color:
        "#64748B",

      fontSize: 12,

      lineHeight: 18,

      textAlign:
        "center",

      marginTop: 7,

      maxWidth: 460,
    },


    quickRegistrationSuccess: {
      width: "100%",

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 8,

      backgroundColor:
        "#ECFDF5",

      borderWidth: 1,

      borderColor:
        "#A7F3D0",

      borderRadius: 12,

      padding: 12,

      marginTop: 16,
    },


    quickRegistrationSuccessText: {
      flex: 1,

      color:
        "#047857",

      fontSize: 10,

      lineHeight: 15,

      fontWeight:
        "700",
    },


    resultCard: {
      width: "100%",

      backgroundColor:
        "#FFFFFF",

      borderRadius: 16,

      borderWidth: 1,

      borderColor:
        "#E2E8F0",

      padding: 16,

      marginTop: 24,
    },


    resultRow: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      gap: 15,

      paddingVertical: 9,

      borderBottomWidth: 1,

      borderBottomColor:
        "#F1F5F9",
    },


    resultLabel: {
      color:
        "#64748B",

      fontSize: 11,
    },


    resultValue: {
      flex: 1,

      color:
        "#172033",

      fontSize: 11,

      fontWeight:
        "800",

      textAlign:
        "right",
    },


    reasonResultCard: {
      width: "100%",

      backgroundColor:
        "#FFF7ED",

      borderRadius: 14,

      borderWidth: 1,

      borderColor:
        "#FED7AA",

      padding: 14,

      marginTop: 12,
    },


    reasonResultLabel: {
      color:
        "#9A3412",

      fontSize: 10,

      fontWeight:
        "900",
    },


    reasonResultText: {
      color:
        "#7C2D12",

      fontSize: 11,

      lineHeight: 17,

      marginTop: 5,
    },


    primaryButton: {
      width: "100%",

      minHeight: 50,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 8,

      backgroundColor:
        "#0F766E",

      borderRadius: 13,

      marginTop: 20,
    },


    primaryButtonText: {
      color:
        "#FFFFFF",

      fontSize: 12,

      fontWeight:
        "900",
    },


    secondaryButton: {
      width: "100%",

      minHeight: 49,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 8,

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "#FECACA",

      borderRadius: 13,

      marginTop: 10,
    },


    secondaryButtonText: {
      color:
        "#B91C1C",

      fontSize: 12,

      fontWeight:
        "900",
    },
  });