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

type Clinic = {
  id: number;
  name: string;
  address?: string | null;
  contact?: string | null;
  email?: string | null;
  status: "active" | "inactive";
};

const EMPTY_FORM = {
  name: "",
  address: "",
  contact: "",
  email: "",
  clinic_admin_name: "",
  clinic_admin_email: "",
  temporary_password: "",
};

export default function AdminClinicsScreen() {
  const router = useRouter();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadClinics = useCallback(async () => {
    try {
      setError("");
      const response = await apiRequest("/api/clinics");
      setClinics(
        Array.isArray(response?.clinics) ? response.clinics : []
      );
    } catch (requestError: any) {
      setError(
        requestError?.message || "Unable to load clinics."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadClinics();
    }, [loadClinics])
  );

  const setField = (key: keyof typeof EMPTY_FORM, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const showMessage = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  const createClinic = async () => {
    if (
      !form.name.trim() ||
      !form.clinic_admin_name.trim() ||
      !form.clinic_admin_email.trim() ||
      form.temporary_password.length < 8
    ) {
      showMessage(
        "Check required fields",
        "Enter the clinic name, first Clinic Admin's name/email, and a temporary password of at least 8 characters."
      );
      return;
    }

    try {
      setSaving(true);
      const response = await apiRequest("/api/clinics", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          address: form.address.trim() || null,
          contact: form.contact.trim() || null,
          email: form.email.trim() || null,
          clinic_admin_name: form.clinic_admin_name.trim(),
          clinic_admin_email: form.clinic_admin_email.trim(),
          temporary_password: form.temporary_password,
        }),
      });

      setForm(EMPTY_FORM);
      await loadClinics();
      showMessage(
        response?.email_sent
          ? "Clinic created"
          : "Clinic created; email needs attention",
        response?.message ||
          "The clinic and its first Clinic Admin were created."
      );
    } catch (requestError: any) {
      showMessage(
        "Unable to create clinic",
        requestError?.message || "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F766E" />
        <Text style={styles.muted}>Loading clinics...</Text>
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
              loadClinics();
            }}
          />
        }
      >
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹  Back to platform dashboard</Text>
        </Pressable>

        <Text style={styles.title}>Clinic Management</Text>
        <Text style={styles.subtitle}>
          Super Admin manually creates each clinic and its first Clinic Admin.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Register a clinic</Text>
          <Text style={styles.helper}>
            The Clinic Admin will receive the login email and must change
            their temporary password on first login.
          </Text>
          <Field
            label="Clinic name *"
            value={form.name}
            onChangeText={(value) => setField("name", value)}
          />
          <Field
            label="Address"
            value={form.address}
            onChangeText={(value) => setField("address", value)}
          />
          <Field
            label="Clinic contact"
            value={form.contact}
            onChangeText={(value) => setField("contact", value)}
          />
          <Field
            label="Clinic email"
            value={form.email}
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={(value) => setField("email", value)}
          />
          <Text style={styles.section}>First Clinic Admin</Text>
          <Field
            label="Admin full name *"
            value={form.clinic_admin_name}
            onChangeText={(value) =>
              setField("clinic_admin_name", value)
            }
          />
          <Field
            label="Admin email *"
            value={form.clinic_admin_email}
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={(value) =>
              setField("clinic_admin_email", value)
            }
          />
          <Field
            label="Temporary password *"
            value={form.temporary_password}
            secureTextEntry
            onChangeText={(value) =>
              setField("temporary_password", value)
            }
          />
          <Pressable
            disabled={saving}
            onPress={createClinic}
            style={[styles.button, saving && styles.disabled]}
          >
            <Text style={styles.buttonText}>
              {saving ? "Creating..." : "Create clinic and admin"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Registered clinics</Text>
          {clinics.length === 0 ? (
            <Text style={styles.muted}>No clinics created yet.</Text>
          ) : (
            clinics.map((clinic) => (
              <View key={clinic.id} style={styles.clinicRow}>
                <View style={styles.clinicInfo}>
                  <Text style={styles.clinicName}>{clinic.name}</Text>
                  <Text style={styles.muted}>
                    {clinic.address || "Address not set"}
                  </Text>
                  <Text style={styles.muted}>
                    {clinic.email || "Email not set"}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.status,
                    clinic.status === "active"
                      ? styles.active
                      : styles.inactive,
                  ]}
                >
                  {clinic.status.toUpperCase()}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  ...inputProps
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        autoCapitalize={inputProps.autoCapitalize || "sentences"}
        keyboardType={inputProps.keyboardType || "default"}
        secureTextEntry={inputProps.secureTextEntry}
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
  back: { color: "#0F766E", fontWeight: "700", marginBottom: 8 },
  title: { color: "#172033", fontSize: 26, fontWeight: "900" },
  subtitle: { color: "#64748B", lineHeight: 20, marginBottom: 4 },
  card: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  cardTitle: { color: "#172033", fontSize: 18, fontWeight: "900" },
  helper: { color: "#64748B", fontSize: 13, lineHeight: 19, marginTop: 6 },
  section: {
    color: "#0F766E",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 14,
    marginBottom: 2,
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
    minHeight: 48,
    borderRadius: 11,
    backgroundColor: "#0F766E",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
  clinicRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  clinicInfo: { flex: 1 },
  clinicName: { color: "#172033", fontWeight: "800", fontSize: 15 },
  muted: { color: "#64748B", fontSize: 12, marginTop: 4 },
  status: { fontSize: 10, fontWeight: "900" },
  active: { color: "#15803D" },
  inactive: { color: "#B91C1C" },
  error: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    color: "#B91C1C",
  },
});
