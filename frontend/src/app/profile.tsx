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
  TextInput,
  View,
} from "react-native";
import {
  useFocusEffect,
  useRouter,
} from "expo-router";

import { apiRequest } from "../api/client";
import { getUser } from "../storage/authStorage";

type PatientProfile = {
  id: number;
  user_id: number;
  contact?: string | null;
  age?: number | null;
  gender?: "Male" | "Female" | "Other" | null;
};

type StoredUser = {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
};

export default function ProfileScreen() {
  const router = useRouter();

  const [user, setUser] =
    useState<StoredUser | null>(null);

  const [profile, setProfile] =
    useState<PatientProfile | null>(null);

  const [contact, setContact] =
    useState("");

  const [age, setAge] =
    useState("");

  const [gender, setGender] =
    useState<"Male" | "Female" | "Other">(
      "Male"
    );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [editing, setEditing] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadProfile = useCallback(
    async () => {
      try {
        setError("");

        const storedUser =
          await getUser();

        setUser(storedUser);

        const response =
          await apiRequest(
            "/api/patients/profile"
          );

        const patient =
          response?.patient;

        if (patient) {
          setProfile(patient);

          setContact(
            patient.contact || ""
          );

          setAge(
            patient.age != null
              ? String(patient.age)
              : ""
          );

          setGender(
            patient.gender ||
              "Male"
          );
        }
      } catch (err: any) {
        setError(
          err?.message ||
            "Unable to load profile."
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
      loadProfile();
    }, [loadProfile])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const cancelEditing = () => {
    if (profile) {
      setContact(
        profile.contact || ""
      );

      setAge(
        profile.age != null
          ? String(profile.age)
          : ""
      );

      setGender(
        profile.gender ||
          "Male"
      );
    }

    setEditing(false);
  };

  async function handleSave() {
    const cleanContact =
      contact.trim();

    const parsedAge =
      Number(age);

    if (!cleanContact) {
      showMessage(
        "Required",
        "Please enter your contact number."
      );

      return;
    }

    if (
      !age.trim() ||
      !Number.isInteger(parsedAge) ||
      parsedAge < 0 ||
      parsedAge > 120
    ) {
      showMessage(
        "Invalid Age",
        "Please enter a valid age between 0 and 120."
      );

      return;
    }

    try {
      setSaving(true);

      const response =
        await apiRequest(
          "/api/patients/profile",
          {
            method: "PUT",
            body: JSON.stringify({
              contact: cleanContact,
              age: parsedAge,
              gender,
            }),
          }
        );

      const updated =
        response?.patient;

      if (updated) {
        setProfile(updated);

        setContact(
          updated.contact || ""
        );

        setAge(
          updated.age != null
            ? String(updated.age)
            : ""
        );

        setGender(
          updated.gender ||
            "Male"
        );
      }

      setEditing(false);

      showMessage(
        "Profile Updated",
        "Your profile has been updated successfully."
      );
    } catch (err: any) {
      showMessage(
        "Update Failed",
        err?.message ||
          "Unable to update profile."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
        />

        <Text
          style={styles.loadingText}
        >
          Loading your profile...
        </Text>
      </View>
    );
  }

  const displayName =
    user?.name || "Patient";

  const initial =
    displayName
      .charAt(0)
      .toUpperCase();

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            router.back()
          }
          style={({ pressed }) => [
            styles.backButton,
            pressed &&
              styles.pressed,
          ]}
        >
          <Text
            style={styles.backIcon}
          >
            ‹
          </Text>
        </Pressable>

        <View
          style={styles.headerText}
        >
          <Text
            style={styles.headerTitle}
          >
            My Profile
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            Manage your personal information
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
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
        {error ? (
          <View
            style={styles.errorCard}
          >
            <Text
              style={
                styles.errorTitle
              }
            >
              Unable to load profile
            </Text>

            <Text
              style={styles.errorText}
            >
              {error}
            </Text>

            <Pressable
              onPress={loadProfile}
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
        ) : (
          <>
            {/* PROFILE HERO */}
            <View
              style={styles.profileCard}
            >
              <View
                style={styles.avatar}
              >
                <Text
                  style={
                    styles.avatarText
                  }
                >
                  {initial}
                </Text>
              </View>

              <Text
                style={
                  styles.patientName
                }
              >
                {displayName}
              </Text>

              <Text
                style={styles.patientEmail}
              >
                {user?.email ||
                  "Email unavailable"}
              </Text>

              <View
                style={styles.roleBadge}
              >
                <View
                  style={styles.roleDot}
                />

                <Text
                  style={
                    styles.roleText
                  }
                >
                  Patient Account
                </Text>
              </View>
            </View>

            {/* ACCOUNT INFO */}
            <Text
              style={styles.sectionTitle}
            >
              Account Information
            </Text>

            <View
              style={styles.infoCard}
            >
              <ReadOnlyRow
                label="Full Name"
                value={displayName}
              />

              <Divider />

              <ReadOnlyRow
                label="Email Address"
                value={
                  user?.email ||
                  "Not available"
                }
              />

              <Divider />

              <ReadOnlyRow
                label="Role"
                value="Patient"
              />
            </View>

            <View
              style={styles.securityNote}
            >
              <Text
                style={
                  styles.securityIcon
                }
              >
                🔒
              </Text>

              <View
                style={
                  styles.securityContent
                }
              >
                <Text
                  style={
                    styles.securityTitle
                  }
                >
                  Account details
                </Text>

                <Text
                  style={
                    styles.securityText
                  }
                >
                  Your name and email are
                  linked to your SmartClinic
                  account and cannot be changed
                  from this screen.
                </Text>
              </View>
            </View>

            {/* PERSONAL INFO HEADER */}
            <View
              style={styles.sectionHeader}
            >
              <View>
                <Text
                  style={
                    styles.sectionTitleNoMargin
                  }
                >
                  Personal Information
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Details used for your clinic profile
                </Text>
              </View>

              {!editing ? (
                <Pressable
                  onPress={() =>
                    setEditing(true)
                  }
                  style={
                    styles.editButton
                  }
                >
                  <Text
                    style={
                      styles.editButtonText
                    }
                  >
                    ✎ Edit
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {/* EDITABLE PROFILE */}
            <View
              style={styles.formCard}
            >
              <FieldLabel
                label="Contact Number"
              />

              {editing ? (
                <TextInput
                  value={contact}
                  onChangeText={
                    setContact
                  }
                  placeholder="e.g. 03001234567"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
              ) : (
                <DisplayValue
                  value={
                    profile?.contact ||
                    "Not provided"
                  }
                />
              )}

              <View
                style={
                  styles.fieldSpacing
                }
              />

              <FieldLabel
                label="Age"
              />

              {editing ? (
                <TextInput
                  value={age}
                  onChangeText={
                    setAge
                  }
                  placeholder="Enter age"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={3}
                  style={styles.input}
                />
              ) : (
                <DisplayValue
                  value={
                    profile?.age != null
                      ? `${profile.age} years`
                      : "Not provided"
                  }
                />
              )}

              <View
                style={
                  styles.fieldSpacing
                }
              />

              <FieldLabel
                label="Gender"
              />

              {editing ? (
                <View
                  style={
                    styles.genderRow
                  }
                >
                  {[
                    "Male",
                    "Female",
                    "Other",
                  ].map((item) => {
                    const selected =
                      gender === item;

                    return (
                      <Pressable
                        key={item}
                        onPress={() =>
                          setGender(
                            item as
                              | "Male"
                              | "Female"
                              | "Other"
                          )
                        }
                        style={[
                          styles.genderButton,
                          selected &&
                            styles.genderButtonSelected,
                        ]}
                      >
                        <View
                          style={[
                            styles.radioOuter,
                            selected &&
                              styles.radioOuterSelected,
                          ]}
                        >
                          {selected ? (
                            <View
                              style={
                                styles.radioInner
                              }
                            />
                          ) : null}
                        </View>

                        <Text
                          style={[
                            styles.genderText,
                            selected &&
                              styles.genderTextSelected,
                          ]}
                        >
                          {item}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <DisplayValue
                  value={
                    profile?.gender ||
                    "Not provided"
                  }
                />
              )}
            </View>

            {/* EDIT ACTIONS */}
            {editing ? (
              <View
                style={styles.actionRow}
              >
                <Pressable
                  disabled={saving}
                  onPress={
                    cancelEditing
                  }
                  style={({ pressed }) => [
                    styles.cancelButton,
                    pressed &&
                      styles.pressed,
                  ]}
                >
                  <Text
                    style={
                      styles.cancelButtonText
                    }
                  >
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  disabled={saving}
                  onPress={handleSave}
                  style={({ pressed }) => [
                    styles.saveButton,
                    saving &&
                      styles.saveButtonDisabled,
                    pressed &&
                      !saving &&
                      styles.pressed,
                  ]}
                >
                  {saving ? (
                    <View
                      style={
                        styles.savingRow
                      }
                    >
                      <ActivityIndicator
                        size="small"
                        color="#FFFFFF"
                      />

                      <Text
                        style={
                          styles.saveButtonText
                        }
                      >
                        Saving...
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={
                        styles.saveButtonText
                      }
                    >
                      Save Changes
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : null}

            {/* HEALTH PRIVACY */}
            <Text
              style={styles.sectionTitle}
            >
              Privacy & Security
            </Text>

            <View
              style={styles.privacyCard}
            >
              <View
                style={styles.privacyIcon}
              >
                <Text>🛡️</Text>
              </View>

              <View
                style={
                  styles.privacyContent
                }
              >
                <Text
                  style={
                    styles.privacyTitle
                  }
                >
                  Protected health information
                </Text>

                <Text
                  style={
                    styles.privacyText
                  }
                >
                  Your profile and medical
                  information are accessible
                  only through your authenticated
                  SmartClinic account and
                  authorized clinic workflows.
                </Text>
              </View>
            </View>

            {/* MEDICAL HISTORY BUTTON */}
            <Pressable
              onPress={() =>
                router.push(
                  "/consultations"
                )
              }
              style={({ pressed }) => [
                styles.historyButton,
                pressed &&
                  styles.pressed,
              ]}
            >
              <View
                style={
                  styles.historyButtonLeft
                }
              >
                <View
                  style={
                    styles.historyIcon
                  }
                >
                  <Text>📄</Text>
                </View>

                <View>
                  <Text
                    style={
                      styles.historyTitle
                    }
                  >
                    Medical History
                  </Text>

                  <Text
                    style={
                      styles.historySubtitle
                    }
                  >
                    View consultations and prescriptions
                  </Text>
                </View>
              </View>

              <Text
                style={
                  styles.historyArrow
                }
              >
                ›
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function FieldLabel({
  label,
}: {
  label: string;
}) {
  return (
    <Text style={styles.fieldLabel}>
      {label}
    </Text>
  );
}

function DisplayValue({
  value,
}: {
  value: string;
}) {
  return (
    <View
      style={
        styles.displayValueBox
      }
    >
      <Text
        style={
          styles.displayValueText
        }
      >
        {value}
      </Text>
    </View>
  );
}

function ReadOnlyRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      style={styles.readOnlyRow}
    >
      <Text
        style={styles.readOnlyLabel}
      >
        {label}
      </Text>

      <Text
        style={styles.readOnlyValue}
      >
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return (
    <View style={styles.divider} />
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
    marginTop: 12,
    color: "#64748B",
    fontSize: 14,
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

  headerText: {
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
    maxWidth: 850,
    alignSelf: "center",
    padding: 18,
    paddingBottom: 45,
  },

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5EAF0",
    padding: 25,
    alignItems: "center",
  },

  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#CCFBF1",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: "#0F766E",
    fontSize: 30,
    fontWeight: "900",
  },

  patientName: {
    color: "#172033",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 12,
  },

  patientEmail: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
  },

  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginTop: 13,
  },

  roleDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#0F766E",
    marginRight: 6,
  },

  roleText: {
    color: "#0F766E",
    fontSize: 10,
    fontWeight: "800",
  },

  sectionTitle: {
    color: "#172033",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 25,
    marginBottom: 11,
  },

  sectionTitleNoMargin: {
    color: "#172033",
    fontSize: 18,
    fontWeight: "800",
  },

  sectionSubtitle: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 3,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 25,
    marginBottom: 11,
  },

  editButton: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 9,
  },

  editButtonText: {
    color: "#0F766E",
    fontSize: 11,
    fontWeight: "800",
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5EAF0",
    paddingHorizontal: 16,
  },

  readOnlyRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
  },

  readOnlyLabel: {
    color: "#64748B",
    fontSize: 12,
  },

  readOnlyValue: {
    flex: 1,
    textAlign: "right",
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
  },

  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },

  securityNote: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 12,
    padding: 13,
    marginTop: 12,
    flexDirection: "row",
  },

  securityIcon: {
    fontSize: 17,
    marginRight: 9,
  },

  securityContent: {
    flex: 1,
  },

  securityTitle: {
    color: "#1E40AF",
    fontSize: 11,
    fontWeight: "800",
  },

  securityText: {
    color: "#475569",
    fontSize: 10,
    lineHeight: 16,
    marginTop: 3,
  },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5EAF0",
    padding: 16,
  },

  fieldLabel: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 7,
  },

  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: "#172033",
    fontSize: 13,
  },

  displayValueBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 13,
  },

  displayValueText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "600",
  },

  fieldSpacing: {
    height: 17,
  },

  genderRow: {
    flexDirection: "row",
    gap: 8,
  },

  genderButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    borderRadius: 11,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  genderButtonSelected: {
    borderColor: "#0F766E",
    backgroundColor: "#F0FDFA",
  },

  radioOuter: {
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 7,
  },

  radioOuterSelected: {
    borderColor: "#0F766E",
  },

  radioInner: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#0F766E",
  },

  genderText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
  },

  genderTextSelected: {
    color: "#0F766E",
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 13,
  },

  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: "center",
  },

  cancelButtonText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "800",
  },

  saveButton: {
    flex: 1,
    backgroundColor: "#0F766E",
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: "center",
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  privacyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E5EAF0",
    padding: 15,
    flexDirection: "row",
  },

  privacyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  privacyContent: {
    flex: 1,
  },

  privacyTitle: {
    color: "#172033",
    fontSize: 12,
    fontWeight: "800",
  },

  privacyText: {
    color: "#64748B",
    fontSize: 10,
    lineHeight: 16,
    marginTop: 4,
  },

  historyButton: {
    marginTop: 13,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E5EAF0",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  historyButtonLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  historyTitle: {
    color: "#172033",
    fontSize: 12,
    fontWeight: "800",
  },

  historySubtitle: {
    color: "#94A3B8",
    fontSize: 10,
    marginTop: 3,
  },

  historyArrow: {
    color: "#94A3B8",
    fontSize: 26,
  },

  errorCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 16,
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

  retryText: {
    color: "#991B1B",
    fontSize: 12,
    fontWeight: "800",
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