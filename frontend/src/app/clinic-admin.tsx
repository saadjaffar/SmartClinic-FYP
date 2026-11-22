import React, { useCallback, useState } from "react";
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
import { useFocusEffect, useRouter } from "expo-router";

import { apiRequest } from "../api/client";
import { clearAuth } from "../storage/authStorage";
import {
  getSelectedClinicId,
  setSelectedClinicId as saveClinicContext,
} from "../storage/clinicStorage";

type ClinicMembership = {
  clinic_id: number;
  clinic_name: string;
  role: string;
  status: string;
};

type ClinicStaffMember = {
  membership_id: number;
  user_id: number;
  role: "doctor" | "receptionist";
  name: string;
  email: string;
  status: "pending" | "active" | "inactive" | "rejected";
  account_status: "active" | "inactive";
  duty_status: "on_duty" | "off_duty" | null;
  room_number: string | null;
  upcoming_appointments: number;
};

const EMPTY_DOCTOR = {
  name: "",
  email: "",
  specialization: "",
  license_number: "",
  room_number: "",
  temporary_password: "",
};

const EMPTY_RECEPTIONIST = {
  name: "",
  email: "",
  temporary_password: "",
};

export default function ClinicAdminScreen() {
  const router = useRouter();
  const [clinics, setClinics] = useState<ClinicMembership[]>([]);
  const [staff, setStaff] = useState<ClinicStaffMember[]>([]);
  const [selectedClinicId, setSelectedClinicId] =
    useState<number | null>(null);
  const [doctor, setDoctor] = useState(EMPTY_DOCTOR);
  const [receptionist, setReceptionist] =
    useState(EMPTY_RECEPTIONIST);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingDoctor, setSavingDoctor] = useState(false);
  const [savingReceptionist, setSavingReceptionist] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const [updatingMembershipId, setUpdatingMembershipId] =
    useState<number | null>(null);
  const [error, setError] = useState("");

  const loadStaff = useCallback(async (clinicId: number) => {
    try {
      setStaffLoading(true);
      setError("");
      const response = await apiRequest(
        `/api/clinics/${clinicId}/staff`
      );
      setStaff(
        Array.isArray(response?.staff) ? response.staff : []
      );
    } catch (requestError: any) {
      setStaff([]);
      setError(
        requestError?.message ||
          "Unable to load clinic staff."
      );
    } finally {
      setStaffLoading(false);
    }
  }, []);

  const loadClinics = useCallback(async () => {
    try {
      setError("");
      const response = await apiRequest("/api/clinics/my");
      const items = Array.isArray(response?.clinics)
        ? response.clinics.filter(
            (item: ClinicMembership) =>
              item.role === "clinic_admin" &&
              item.status === "active"
          )
        : [];
      setClinics(items);
      const savedClinicId = await getSelectedClinicId();
      const selectedId = items.some(
        (item: ClinicMembership) =>
          item.clinic_id === savedClinicId
      )
        ? savedClinicId
        : items[0]?.clinic_id ?? null;
      setSelectedClinicId(selectedId);
      if (selectedId) {
        await saveClinicContext(selectedId);
        await loadStaff(selectedId);
      } else {
        setStaff([]);
      }
    } catch (requestError: any) {
      setError(
        requestError?.message ||
          "Unable to load your clinic access."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadStaff]);

  useFocusEffect(
    useCallback(() => {
      loadClinics();
    }, [loadClinics])
  );

  const showMessage = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  const updateStaffStatus = async (member: ClinicStaffMember) => {
    if (!selectedClinicId) {
      return;
    }

    const nextStatus =
      member.status === "active" ? "inactive" : "active";
    try {
      setUpdatingMembershipId(member.membership_id);
      const response = await apiRequest(
        `/api/clinics/${selectedClinicId}/staff/${member.role}/${member.membership_id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        }
      );
      await loadStaff(selectedClinicId);
      showMessage(
        nextStatus === "active"
          ? "Staff access restored"
          : "Staff access deactivated",
        response?.message ||
          `${member.name}'s access was updated for this clinic.`
      );
    } catch (requestError: any) {
      showMessage(
        "Unable to update staff access",
        requestError?.message ||
          "Please try again after checking this clinic's appointments."
      );
      await loadStaff(selectedClinicId);
    } finally {
      setUpdatingMembershipId(null);
    }
  };

  const confirmStaffStatusChange = (
    member: ClinicStaffMember
  ) => {
    if (member.status === "pending" || member.status === "rejected") {
      return;
    }

    const activating = member.status === "inactive";
    const title = activating
      ? `Reactivate ${member.name}?`
      : `Deactivate ${member.name} for this clinic?`;
    const message = activating
      ? "This restores their access to this clinic only."
      : member.role === "doctor"
        ? "This only affects this clinic. Other clinic memberships remain unchanged. The doctor must have no upcoming or active appointments here."
        : "This only affects this clinic. Other clinic memberships and the account itself remain unchanged.";
    const action = activating ? "Reactivate" : "Deactivate";

    if (Platform.OS === "web") {
      if (window.confirm(`${title}\n\n${message}`)) {
        void updateStaffStatus(member);
      }
      return;
    }

    Alert.alert(title, message, [
      { text: "Keep active", style: "cancel" },
      {
        text: action,
        style: activating ? "default" : "destructive",
        onPress: () => void updateStaffStatus(member),
      },
    ]);
  };

  const addDoctor = async () => {
    if (!selectedClinicId || !doctor.email.trim()) {
      showMessage("Required", "Select a clinic and enter the doctor's email.");
      return;
    }

    try {
      setSavingDoctor(true);
      const response = await apiRequest(
        `/api/clinics/${selectedClinicId}/doctors`,
        {
          method: "POST",
          body: JSON.stringify({
            ...doctor,
            name: doctor.name.trim(),
            email: doctor.email.trim(),
            specialization: doctor.specialization.trim(),
            license_number: doctor.license_number.trim() || null,
            room_number: doctor.room_number.trim() || null,
            temporary_password:
              doctor.temporary_password || undefined,
          }),
        }
      );

      setDoctor(EMPTY_DOCTOR);
      await loadStaff(selectedClinicId);
      showMessage(
        response?.email_sent
          ? "Doctor invitation sent"
          : "Doctor linked; email needs attention",
        response?.message ||
          "Doctor association has been created."
      );
    } catch (requestError: any) {
      showMessage(
        "Unable to add doctor",
        requestError?.message || "Please check the doctor details."
      );
    } finally {
      setSavingDoctor(false);
    }
  };

  const addReceptionist = async () => {
    if (
      !selectedClinicId ||
      !receptionist.name.trim() ||
      !receptionist.email.trim()
    ) {
      showMessage(
        "Required",
        "Enter the receptionist's name and email."
      );
      return;
    }

    try {
      setSavingReceptionist(true);
      const response = await apiRequest(
        `/api/clinics/${selectedClinicId}/receptionists`,
        {
          method: "POST",
          body: JSON.stringify({
            ...receptionist,
            name: receptionist.name.trim(),
            email: receptionist.email.trim(),
          }),
        }
      );

      setReceptionist(EMPTY_RECEPTIONIST);
      await loadStaff(selectedClinicId);
      showMessage(
        response?.email_sent
          ? "Receptionist added"
          : "Receptionist added; email needs attention",
        response?.message ||
          "Receptionist was linked to the clinic."
      );
    } catch (requestError: any) {
      showMessage(
        "Unable to add receptionist",
        requestError?.message ||
          "Please check the receptionist details."
      );
    } finally {
      setSavingReceptionist(false);
    }
  };

  const logout = async () => {
    await clearAuth();
    router.replace("/");
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F766E" />
        <Text style={styles.muted}>Loading your clinic workspace...</Text>
      </View>
    );
  }

  const selectedClinic = clinics.find(
    (item) => item.clinic_id === selectedClinicId
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadClinics();
            }}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>SmartClinic</Text>
            <Text style={styles.title}>Clinic Admin</Text>
          </View>
          <Pressable onPress={logout} style={styles.logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>

        <Text style={styles.subtitle}>
          Manage staff only for the clinic selected below.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {clinics.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No active clinic access</Text>
            <Text style={styles.muted}>
              Ask the SmartClinic Super Admin to check your clinic assignment.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Choose clinic</Text>
              <Text style={styles.helper}>
                The selected clinic is shown on every staff action.
              </Text>
              <View style={styles.clinicList}>
                {clinics.map((item) => {
                  const selected =
                    item.clinic_id === selectedClinicId;
                  return (
                    <Pressable
                      key={item.clinic_id}
                      onPress={async () => {
                        setSelectedClinicId(item.clinic_id)
                        await saveClinicContext(item.clinic_id);
                        await loadStaff(item.clinic_id);
                      }}
                      style={[
                        styles.clinicOption,
                        selected && styles.clinicOptionSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.clinicOptionText,
                          selected && styles.clinicOptionTextSelected,
                        ]}
                      >
                        {item.clinic_name}
                      </Text>
                      <Text
                        style={[
                          styles.clinicOptionHint,
                          selected && styles.clinicOptionTextSelected,
                        ]}
                      >
                        {selected ? "CURRENT CLINIC" : "Select"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {selectedClinic ? (
              <>
                <View style={styles.contextBanner}>
                  <Text style={styles.contextLabel}>CURRENT CLINIC</Text>
                  <Text style={styles.contextName}>
                    {selectedClinic.clinic_name}
                  </Text>
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Invite a doctor</Text>
                  <Text style={styles.helper}>
                    Existing doctor? Enter their email; do not enter a
                    password. A new doctor needs name, specialization and a
                    temporary password. The doctor must approve the email
                    invitation before joining this clinic.
                  </Text>
                  <Field
                    label="Doctor email *"
                    value={doctor.email}
                    onChangeText={(value) =>
                      setDoctor((current) => ({
                        ...current,
                        email: value,
                      }))
                    }
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <Field
                    label="Doctor name (required for a new account)"
                    value={doctor.name}
                    onChangeText={(value) =>
                      setDoctor((current) => ({
                        ...current,
                        name: value,
                      }))
                    }
                  />
                  <Field
                    label="Specialization (required for a new account)"
                    value={doctor.specialization}
                    onChangeText={(value) =>
                      setDoctor((current) => ({
                        ...current,
                        specialization: value,
                      }))
                    }
                  />
                  <Field
                    label="License number"
                    value={doctor.license_number}
                    onChangeText={(value) =>
                      setDoctor((current) => ({
                        ...current,
                        license_number: value,
                      }))
                    }
                  />
                  <Field
                    label="Room at this clinic"
                    value={doctor.room_number}
                    onChangeText={(value) =>
                      setDoctor((current) => ({
                        ...current,
                        room_number: value,
                      }))
                    }
                  />
                  <Field
                    label="Temporary password (new doctor only)"
                    value={doctor.temporary_password}
                    onChangeText={(value) =>
                      setDoctor((current) => ({
                        ...current,
                        temporary_password: value,
                      }))
                    }
                    secureTextEntry
                  />
                  <Pressable
                    disabled={savingDoctor}
                    onPress={addDoctor}
                    style={[
                      styles.button,
                      savingDoctor && styles.disabled,
                    ]}
                  >
                    <Text style={styles.buttonText}>
                      {savingDoctor
                        ? "Sending invitation..."
                        : "Invite doctor"}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>
                    Clinic staff and access
                  </Text>
                  <Text style={styles.helper}>
                    Deactivation changes access to this clinic only.
                    Doctor appointments must be completed or rescheduled
                    before access can be deactivated.
                  </Text>
                  {staffLoading ? (
                    <View style={styles.staffLoading}>
                      <ActivityIndicator
                        size="small"
                        color="#0F766E"
                      />
                      <Text style={styles.muted}>
                        Loading clinic staff...
                      </Text>
                    </View>
                  ) : staff.length === 0 ? (
                    <Text style={styles.muted}>
                      No doctors or receptionists are assigned to this
                      clinic yet.
                    </Text>
                  ) : (
                    <View style={styles.staffList}>
                      {staff.map((member) => {
                        const canChangeStatus =
                          member.status === "active" ||
                          member.status === "inactive";
                        const busy =
                          updatingMembershipId ===
                          member.membership_id;
                        const inactive =
                          member.status === "inactive";

                        return (
                          <View
                            key={`${member.role}-${member.membership_id}`}
                            style={styles.staffRow}
                          >
                            <View style={styles.staffInfo}>
                              <Text style={styles.staffName}>
                                {member.name}
                              </Text>
                              <Text style={styles.muted}>
                                {member.email}
                              </Text>
                              <Text style={styles.staffMeta}>
                                {member.role === "doctor"
                                  ? "Doctor"
                                  : "Receptionist"}
                                {member.role === "doctor" &&
                                member.duty_status
                                  ? ` · ${member.duty_status.replace(
                                      "_",
                                      " "
                                    )}`
                                  : ""}
                              </Text>
                              {member.account_status !== "active" ? (
                                <Text style={styles.accountWarning}>
                                  Account is globally inactive
                                </Text>
                              ) : null}
                              {member.role === "doctor" &&
                              member.upcoming_appointments > 0 ? (
                                <Text style={styles.appointmentWarning}>
                                  {member.upcoming_appointments} upcoming
                                  or active appointment
                                  {member.upcoming_appointments === 1
                                    ? ""
                                    : "s"}
                                </Text>
                              ) : null}
                            </View>
                            <View style={styles.staffActions}>
                              <Text
                                style={[
                                  styles.staffStatus,
                                  member.status === "active"
                                    ? styles.active
                                    : inactive
                                      ? styles.inactive
                                      : styles.pending,
                                ]}
                              >
                                {member.status.toUpperCase()}
                              </Text>
                              {canChangeStatus ? (
                                <Pressable
                                  disabled={busy}
                                  onPress={() =>
                                    confirmStaffStatusChange(member)
                                  }
                                  style={[
                                    styles.staffActionButton,
                                    inactive
                                      ? styles.activateButton
                                      : styles.deactivateButton,
                                    busy && styles.disabled,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.staffActionText,
                                      inactive
                                        ? styles.activateText
                                        : styles.deactivateText,
                                    ]}
                                  >
                                    {busy
                                      ? "Saving..."
                                      : inactive
                                        ? "Reactivate"
                                        : "Deactivate"}
                                  </Text>
                                </Pressable>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Add a receptionist</Text>
                  <Field
                    label="Full name *"
                    value={receptionist.name}
                    onChangeText={(value) =>
                      setReceptionist((current) => ({
                        ...current,
                        name: value,
                      }))
                    }
                  />
                  <Field
                    label="Email *"
                    value={receptionist.email}
                    onChangeText={(value) =>
                      setReceptionist((current) => ({
                        ...current,
                        email: value,
                      }))
                    }
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <Field
                    label="Temporary password (new account only)"
                    value={receptionist.temporary_password}
                    onChangeText={(value) =>
                      setReceptionist((current) => ({
                        ...current,
                        temporary_password: value,
                      }))
                    }
                    secureTextEntry
                  />
                  <Pressable
                    disabled={savingReceptionist}
                    onPress={addReceptionist}
                    style={[
                      styles.button,
                      savingReceptionist && styles.disabled,
                    ]}
                  >
                    <Text style={styles.buttonText}>
                      {savingReceptionist
                        ? "Adding receptionist..."
                        : "Add receptionist"}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "sentences",
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F6F8FB" },
  content: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    padding: 18,
    gap: 16,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F8FB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: { color: "#0F766E", fontWeight: "800", fontSize: 13 },
  title: { color: "#172033", fontSize: 26, fontWeight: "900" },
  subtitle: { color: "#64748B", lineHeight: 20 },
  logout: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  logoutText: { color: "#B91C1C", fontWeight: "800" },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 18,
  },
  cardTitle: { color: "#172033", fontSize: 17, fontWeight: "900" },
  helper: { color: "#64748B", fontSize: 12, lineHeight: 19, marginTop: 6 },
  clinicList: { gap: 8, marginTop: 12 },
  clinicOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 11,
  },
  clinicOptionSelected: {
    backgroundColor: "#0F766E",
    borderColor: "#0F766E",
  },
  clinicOptionText: { color: "#334155", fontWeight: "700" },
  clinicOptionTextSelected: { color: "#FFFFFF" },
  clinicOptionHint: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "800",
  },
  contextBanner: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderWidth: 1,
    borderRadius: 14,
    padding: 15,
  },
  contextLabel: { color: "#0F766E", fontSize: 10, fontWeight: "900" },
  contextName: {
    color: "#134E4A",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 3,
  },
  field: { marginTop: 12 },
  label: { color: "#475569", fontSize: 12, fontWeight: "700" },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 5,
    color: "#172033",
    backgroundColor: "#FFFFFF",
  },
  button: {
    minHeight: 47,
    borderRadius: 11,
    backgroundColor: "#0F766E",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
  disabled: { opacity: 0.6 },
  muted: { color: "#64748B", fontSize: 13, marginTop: 5 },
  staffLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  staffList: { gap: 10, marginTop: 14 },
  staffRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
  },
  staffInfo: { flex: 1 },
  staffName: { color: "#172033", fontWeight: "800" },
  staffMeta: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 4,
    textTransform: "capitalize",
  },
  staffActions: { alignItems: "flex-end", gap: 8 },
  staffStatus: { fontSize: 10, fontWeight: "900" },
  active: { color: "#047857" },
  inactive: { color: "#B91C1C" },
  pending: { color: "#B45309" },
  accountWarning: {
    color: "#B91C1C",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 5,
  },
  appointmentWarning: {
    color: "#B45309",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 5,
  },
  staffActionButton: {
    minHeight: 34,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  deactivateButton: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  activateButton: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  staffActionText: { fontSize: 11, fontWeight: "800" },
  deactivateText: { color: "#B91C1C" },
  activateText: { color: "#047857" },
  error: {
    color: "#B91C1C",
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 12,
  },
});
