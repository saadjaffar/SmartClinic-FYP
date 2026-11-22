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

type DoctorOption = {
  id: number;
  name: string;
  specialization?: string;
  room_number?: string | null;
};

export default function ReceptionistWalkInScreen() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] =
    useState<number | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadOptions = useCallback(async () => {
    try {
      setError("");
      const response = await apiRequest(
        "/api/receptionist/emergency/options"
      );
      const available = Array.isArray(response?.on_duty_doctors)
        ? response.on_duty_doctors
        : [];
      setDoctors(available);
      setSelectedDoctorId((current) =>
        available.some((doctor: DoctorOption) => doctor.id === current)
          ? current
          : available[0]?.id ?? null
      );
    } catch (requestError: any) {
      setError(
        requestError?.message ||
          "Unable to load currently available doctors."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOptions();
    }, [loadOptions])
  );

  const createWalkIn = async () => {
    if (!selectedDoctorId || name.trim().length < 2) {
      setError("Enter the patient's name and select an on-duty doctor.");
      return;
    }

    if (
      age.trim() &&
      (!/^\d+$/.test(age.trim()) ||
        Number(age) < 0 ||
        Number(age) > 130)
    ) {
      setError("Age must be a whole number from 0 to 130.");
      return;
    }

    if (
      gender &&
      !["Male", "Female", "Other"].includes(gender)
    ) {
      setError("Choose Male, Female, or Other for gender.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const response = await apiRequest(
        "/api/receptionist/walk-in",
        {
          method: "POST",
          body: JSON.stringify({
            doctor_id: selectedDoctorId,
            new_patient: {
              name: name.trim(),
              contact: contact.trim() || null,
              age: age.trim() ? Number(age) : null,
              gender: gender || null,
            },
            reason: reason.trim() || null,
          }),
        }
      );

      const successMessage =
        `${response?.patient?.name || name.trim()} was added to the ` +
        `normal queue with token #${response?.queue?.token_number}.`;
      if (Platform.OS === "web") {
        window.alert(successMessage);
      } else {
        Alert.alert("Walk-In Added", successMessage);
      }

      setName("");
      setContact("");
      setAge("");
      setGender("");
      setReason("");
      router.replace("/receptionist-live-queue");
    } catch (requestError: any) {
      setError(
        requestError?.message ||
          "Unable to add this patient to the queue."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F766E" />
        <Text style={styles.muted}>Loading on-duty doctors...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadOptions();
            }}
          />
        }
      >
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹  Back to receptionist dashboard</Text>
        </Pressable>
        <Text style={styles.title}>Front-Desk Walk-In</Text>
        <Text style={styles.subtitle}>
          Register a patient who arrived without using the app. They are
          checked in immediately and join the normal queue after higher
          priority patients.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Patient details</Text>
          <Field label="Full name *" value={name} onChangeText={setName} />
          <Field
            label="Contact (optional)"
            value={contact}
            onChangeText={setContact}
            keyboardType="phone-pad"
          />
          <Field
            label="Age (optional)"
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
          />
          <Text style={styles.label}>Gender (optional)</Text>
          <View style={styles.optionRow}>
            {["Male", "Female", "Other"].map((value) => (
              <Pressable
                key={value}
                onPress={() =>
                  setGender(gender === value ? "" : value)
                }
                style={[
                  styles.option,
                  gender === value && styles.optionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    gender === value && styles.optionTextSelected,
                  ]}
                >
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>On-duty doctor *</Text>
          {doctors.length === 0 ? (
            <Text style={styles.error}>
              No active on-duty doctors are available. The patient cannot
              be queued until a doctor is on duty.
            </Text>
          ) : (
            <View style={styles.doctorList}>
              {doctors.map((doctor) => {
                const selected = doctor.id === selectedDoctorId;
                return (
                  <Pressable
                    key={doctor.id}
                    onPress={() => setSelectedDoctorId(doctor.id)}
                    style={[
                      styles.doctorOption,
                      selected && styles.doctorOptionSelected,
                    ]}
                  >
                    <View style={styles.doctorInfo}>
                      <Text
                        style={[
                          styles.doctorName,
                          selected && styles.optionTextSelected,
                        ]}
                      >
                        {doctor.name}
                      </Text>
                      <Text
                        style={[
                          styles.doctorMeta,
                          selected && styles.optionTextSelected,
                        ]}
                      >
                        {doctor.specialization || "Doctor"}
                        {doctor.room_number
                          ? ` · Room ${doctor.room_number}`
                          : ""}
                      </Text>
                    </View>
                    {selected ? (
                      <Text style={styles.selectedLabel}>SELECTED</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          )}

          <Field
            label="Reason for visit (optional)"
            value={reason}
            onChangeText={setReason}
            multiline
          />

          <View style={styles.priorityNote}>
            <Text style={styles.priorityText}>
              Queue priority: NORMAL. The receptionist can escalate the
              patient later if their condition becomes urgent or critical.
            </Text>
          </View>

          <Pressable
            disabled={saving || doctors.length === 0}
            onPress={createWalkIn}
            style={[
              styles.button,
              (saving || doctors.length === 0) && styles.disabled,
            ]}
          >
            <Text style={styles.buttonText}>
              {saving ? "Adding patient..." : "Register and add to queue"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "phone-pad" | "number-pad";
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[styles.input, multiline && styles.textArea]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F6F8FB" },
  content: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    padding: 18,
    gap: 14,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F8FB",
  },
  back: { color: "#0F766E", fontWeight: "700" },
  title: { color: "#172033", fontSize: 26, fontWeight: "900" },
  subtitle: { color: "#64748B", lineHeight: 20 },
  card: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  sectionTitle: {
    color: "#172033",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 4,
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
  textArea: { minHeight: 80, paddingTop: 10 },
  optionRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  option: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  optionSelected: { backgroundColor: "#0F766E", borderColor: "#0F766E" },
  optionText: { color: "#475569", fontWeight: "700", fontSize: 12 },
  optionTextSelected: { color: "#FFFFFF" },
  doctorList: { gap: 8, marginTop: 8 },
  doctorOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  doctorOptionSelected: { backgroundColor: "#0F766E", borderColor: "#0F766E" },
  doctorInfo: { flex: 1 },
  doctorName: { color: "#172033", fontWeight: "800" },
  doctorMeta: { color: "#64748B", fontSize: 11, marginTop: 4 },
  selectedLabel: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },
  priorityNote: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  priorityText: { color: "#475569", fontSize: 12, lineHeight: 18 },
  button: {
    minHeight: 48,
    borderRadius: 11,
    backgroundColor: "#0F766E",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
  disabled: { opacity: 0.6 },
  muted: { color: "#64748B", fontSize: 12, marginTop: 8 },
  error: {
    color: "#B91C1C",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 12,
    borderRadius: 10,
    lineHeight: 18,
  },
});
