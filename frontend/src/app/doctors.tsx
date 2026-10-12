import React, { useCallback, useMemo, useState } from "react";
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
import { useFocusEffect, useRouter } from "expo-router";

import { apiRequest } from "../api/client";

type Doctor = {
  id: number;
  name: string;
  specialization: string;
  room_number?: string | null;
  working_hours?: string | null;
  duty_status: "on_duty" | "off_duty";
};

export default function DoctorsScreen() {
  const router = useRouter();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [search, setSearch] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] =
    useState("All");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDoctors = useCallback(async () => {
    try {
      setError("");

      const response = await apiRequest("/api/doctors");

      const doctorList =
        response?.doctors ??
        response?.data ??
        [];

      setDoctors(
        Array.isArray(doctorList) ? doctorList : []
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to load doctors. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDoctors();
    }, [loadDoctors])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadDoctors();
  };

  const specializations = useMemo(() => {
    const values = doctors
      .map((doctor) => doctor.specialization)
      .filter(Boolean);

    return ["All", ...Array.from(new Set(values))];
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    const query = search.trim().toLowerCase();

    return doctors.filter((doctor) => {
      const matchesSearch =
        !query ||
        doctor.name.toLowerCase().includes(query) ||
        doctor.specialization
          ?.toLowerCase()
          .includes(query) ||
        doctor.room_number
          ?.toLowerCase()
          .includes(query);

      const matchesSpecialization =
        selectedSpecialization === "All" ||
        doctor.specialization === selectedSpecialization;

      return matchesSearch && matchesSpecialization;
    });
  }, [doctors, search, selectedSpecialization]);

  const onDutyDoctors = filteredDoctors.filter(
    (doctor) => doctor.duty_status === "on_duty"
  );

  const offDutyDoctors = filteredDoctors.filter(
    (doctor) => doctor.duty_status !== "on_duty"
  );

  const openBooking = (doctor: Doctor) => {
    if (doctor.duty_status !== "on_duty") {
      return;
    }

    router.push({
      pathname: "/booking" as any,
      params: {
        doctorId: String(doctor.id),
        doctorName: doctor.name,
        specialization: doctor.specialization,
        roomNumber: doctor.room_number ?? "",
        workingHours: doctor.working_hours ?? "",
      },
    });
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>
            Find a Doctor
          </Text>

          <Text style={styles.headerSubtitle}>
            Choose a doctor and book your appointment
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>
            Finding available doctors...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
        >
          {/* Search */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>⌕</Text>

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search doctor, specialization or room"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {search.length > 0 ? (
              <Pressable
                onPress={() => setSearch("")}
                style={styles.clearButton}
              >
                <Text style={styles.clearText}>
                  ×
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Specializations */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={
              styles.filterContainer
            }
          >
            {specializations.map((item) => {
              const active =
                item === selectedSpecialization;

              return (
                <Pressable
                  key={item}
                  onPress={() =>
                    setSelectedSpecialization(item)
                  }
                  style={[
                    styles.filterChip,
                    active && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      active &&
                        styles.filterTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Error */}
          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>
                Unable to load doctors
              </Text>

              <Text style={styles.errorText}>
                {error}
              </Text>

              <Pressable
                onPress={loadDoctors}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>
                  Try Again
                </Text>
              </Pressable>
            </View>
          ) : null}

          {!error ? (
            <>
              {/* Summary */}
              <View style={styles.summaryRow}>
                <View>
                  <Text style={styles.sectionTitle}>
                    Available Doctors
                  </Text>

                  <Text style={styles.sectionSubtitle}>
                    {filteredDoctors.length} doctor
                    {filteredDoctors.length === 1
                      ? ""
                      : "s"}{" "}
                    found
                  </Text>
                </View>

                <View style={styles.availableBadge}>
                  <View style={styles.greenDot} />
                  <Text style={styles.availableText}>
                    {onDutyDoctors.length} on duty
                  </Text>
                </View>
              </View>

              {/* Empty state */}
              {filteredDoctors.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>
                    🩺
                  </Text>

                  <Text style={styles.emptyTitle}>
                    No doctors found
                  </Text>

                  <Text style={styles.emptyText}>
                    Try changing your search or
                    specialization filter.
                  </Text>

                  <Pressable
                    style={styles.resetButton}
                    onPress={() => {
                      setSearch("");
                      setSelectedSpecialization("All");
                    }}
                  >
                    <Text style={styles.resetText}>
                      Reset Filters
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {/* On duty */}
              {onDutyDoctors.length > 0 ? (
                <View>
                  <Text style={styles.groupTitle}>
                    On Duty
                  </Text>

                  {onDutyDoctors.map((doctor) => (
                    <DoctorCard
                      key={doctor.id}
                      doctor={doctor}
                      onPress={() =>
                        openBooking(doctor)
                      }
                    />
                  ))}
                </View>
              ) : null}

              {/* Off duty */}
              {offDutyDoctors.length > 0 ? (
                <View style={styles.offDutySection}>
                  <Text style={styles.groupTitle}>
                    Currently Unavailable
                  </Text>

                  {offDutyDoctors.map((doctor) => (
                    <DoctorCard
                      key={doctor.id}
                      doctor={doctor}
                      onPress={() => {}}
                    />
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function DoctorCard({
  doctor,
  onPress,
}: {
  doctor: Doctor;
  onPress: () => void;
}) {
  const onDuty = doctor.duty_status === "on_duty";

  const initials = doctor.name
    .replace(/^Dr\.?\s*/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <View style={styles.doctorCard}>
      <View style={styles.doctorTopRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {initials || "DR"}
          </Text>
        </View>

        <View style={styles.doctorMainInfo}>
          <View style={styles.doctorNameRow}>
            <Text
              numberOfLines={1}
              style={styles.doctorName}
            >
              {doctor.name}
            </Text>

            <View
              style={[
                styles.statusBadge,
                onDuty
                  ? styles.onDutyBadge
                  : styles.offDutyBadge,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  onDuty
                    ? styles.onDutyDot
                    : styles.offDutyDot,
                ]}
              />

              <Text
                style={[
                  styles.statusText,
                  onDuty
                    ? styles.onDutyText
                    : styles.offDutyText,
                ]}
              >
                {onDuty ? "On Duty" : "Off Duty"}
              </Text>
            </View>
          </View>

          <Text style={styles.specialization}>
            {doctor.specialization ||
              "General Medicine"}
          </Text>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <InfoItem
          label="Room"
          value={
            doctor.room_number ||
            "Not assigned"
          }
        />

        <InfoItem
          label="Working Hours"
          value={
            doctor.working_hours ||
            "Not specified"
          }
        />
      </View>

      {onDuty ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.bookButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.bookButtonText}>
            Book Appointment
          </Text>

          <Text style={styles.bookArrow}>
            →
          </Text>
        </Pressable>
      ) : (
        <View style={styles.unavailableButton}>
          <Text style={styles.unavailableText}>
            Currently unavailable
          </Text>
        </View>
      )}
    </View>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text
        numberOfLines={2}
        style={styles.infoValue}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F7FA",
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
    backgroundColor: "rgba(255,255,255,0.15)",
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

  headerTextContainer: {
    flex: 1,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "#CCFBF1",
    marginTop: 4,
    fontSize: 13,
  },

  scroll: {
    flex: 1,
  },

  content: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    padding: 18,
    paddingBottom: 40,
  },

  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 14,
  },

  searchContainer: {
    height: 54,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  searchIcon: {
    fontSize: 24,
    color: "#64748B",
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
    outlineStyle: "none" as any,
  },

  clearButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  clearText: {
    fontSize: 24,
    color: "#64748B",
  },

  filterContainer: {
    paddingTop: 14,
    paddingBottom: 5,
    gap: 8,
  },

  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  filterChipActive: {
    backgroundColor: "#0F766E",
    borderColor: "#0F766E",
  },

  filterText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },

  filterTextActive: {
    color: "#FFFFFF",
  },

  summaryRow: {
    marginTop: 19,
    marginBottom: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#172033",
  },

  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },

  availableBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },

  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#16A34A",
    marginRight: 6,
  },

  availableText: {
    color: "#166534",
    fontWeight: "700",
    fontSize: 11,
  },

  groupTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#475569",
    marginTop: 7,
    marginBottom: 9,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  doctorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 17,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#E8EDF2",
  },

  doctorTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#CCFBF1",
    marginRight: 13,
  },

  avatarText: {
    color: "#0F766E",
    fontSize: 18,
    fontWeight: "800",
  },

  doctorMainInfo: {
    flex: 1,
  },

  doctorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  doctorName: {
    flex: 1,
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "800",
  },

  specialization: {
    color: "#0F766E",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  onDutyBadge: {
    backgroundColor: "#DCFCE7",
  },

  offDutyBadge: {
    backgroundColor: "#F1F5F9",
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  onDutyDot: {
    backgroundColor: "#16A34A",
  },

  offDutyDot: {
    backgroundColor: "#94A3B8",
  },

  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },

  onDutyText: {
    color: "#166534",
  },

  offDutyText: {
    color: "#64748B",
  },

  infoGrid: {
    flexDirection: "row",
    marginTop: 17,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },

  infoItem: {
    flex: 1,
    paddingRight: 8,
  },

  infoLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },

  infoValue: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "600",
  },

  bookButton: {
    backgroundColor: "#0F766E",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    marginTop: 17,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  bookButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  bookArrow: {
    color: "#FFFFFF",
    fontSize: 18,
    marginLeft: 8,
  },

  unavailableButton: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 17,
  },

  unavailableText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "700",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    alignItems: "center",
    padding: 30,
    marginTop: 10,
  },

  emptyIcon: {
    fontSize: 38,
    marginBottom: 10,
  },

  emptyTitle: {
    color: "#172033",
    fontSize: 17,
    fontWeight: "800",
  },

  emptyText: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    marginTop: 5,
  },

  resetButton: {
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 15,
  },

  resetText: {
    color: "#0F766E",
    fontWeight: "800",
  },

  errorCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 16,
    marginTop: 15,
  },

  errorTitle: {
    color: "#991B1B",
    fontSize: 15,
    fontWeight: "800",
  },

  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    marginTop: 5,
  },

  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 12,
  },

  retryText: {
    color: "#991B1B",
    fontWeight: "800",
  },

  offDutySection: {
    marginTop: 8,
  },

  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },
});