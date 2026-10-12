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
  View,
} from "react-native";
import {
  useFocusEffect,
  useRouter,
} from "expo-router";

import { apiRequest } from "../api/client";

type Consultation = {
  id: number;
  appointment_id: number;
  doctor_id: number;
  doctor_name?: string | null;

  chief_complaint?: string | null;
  diagnosis?: string | null;
  prescription?: string | null;
  doctor_notes?: string | null;

  started_at?: string | null;
  ended_at?: string | null;
  duration_minutes?: number | null;
  created_at?: string | null;
};

export default function ConsultationsScreen() {
  const router = useRouter();

  const [consultations, setConsultations] =
    useState<Consultation[]>([]);

  const [expandedId, setExpandedId] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadConsultations = useCallback(
    async () => {
      try {
        setError("");

        const response = await apiRequest(
          "/api/consultations/my"
        );

        const list = Array.isArray(
          response?.consultations
        )
          ? response.consultations
          : [];

        setConsultations(list);
      } catch (err: any) {
        setError(
          err?.message ||
            "Unable to load consultation history."
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
      loadConsultations();
    }, [loadConsultations])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadConsultations();
  };

  const completedCount =
    consultations.length;

  const latestConsultation =
    useMemo(() => {
      if (consultations.length === 0) {
        return null;
      }

      return consultations[0];
    }, [consultations]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading medical history...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.backIcon}>
            ‹
          </Text>
        </Pressable>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            Medical History
          </Text>

          <Text style={styles.headerSubtitle}>
            Your consultations and prescriptions
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
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
        {/* ERROR */}
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              Unable to load history
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>

            <Pressable
              onPress={loadConsultations}
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
            {/* SUMMARY */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <Text style={styles.summaryIconText}>
                  📄
                </Text>
              </View>

              <View style={styles.summaryMain}>
                <Text style={styles.summaryTitle}>
                  Consultation History
                </Text>

                <Text style={styles.summarySubtitle}>
                  Records saved by your doctors
                </Text>
              </View>

              <View style={styles.summaryCountBox}>
                <Text style={styles.summaryCount}>
                  {completedCount}
                </Text>

                <Text style={styles.summaryCountLabel}>
                  Records
                </Text>
              </View>
            </View>

            {latestConsultation ? (
              <View style={styles.latestNotice}>
                <Text style={styles.latestIcon}>
                  ✓
                </Text>

                <View style={styles.latestTextArea}>
                  <Text style={styles.latestTitle}>
                    Latest consultation
                  </Text>

                  <Text style={styles.latestText}>
                    {formatDate(
                      latestConsultation.started_at ||
                        latestConsultation.created_at
                    )}
                    {" with "}
                    {latestConsultation.doctor_name ||
                      "your doctor"}
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Consultation Records
              </Text>

              <Text style={styles.sectionSubtitle}>
                Tap a record to view full details
              </Text>
            </View>

            {/* EMPTY */}
            {consultations.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconBox}>
                  <Text style={styles.emptyIcon}>
                    🩺
                  </Text>
                </View>

                <Text style={styles.emptyTitle}>
                  No consultations yet
                </Text>

                <Text style={styles.emptyText}>
                  Your completed consultations,
                  diagnosis and prescriptions will
                  appear here after a doctor saves
                  your consultation record.
                </Text>

                <Pressable
                  onPress={() =>
                    router.push("/appointments")
                  }
                  style={styles.primaryButton}
                >
                  <Text
                    style={styles.primaryButtonText}
                  >
                    View Appointments
                  </Text>
                </Pressable>
              </View>
            ) : (
              consultations.map(
                (consultation, index) => {
                  const expanded =
                    expandedId ===
                    consultation.id;

                  return (
                    <ConsultationCard
                      key={consultation.id}
                      consultation={
                        consultation
                      }
                      latest={index === 0}
                      expanded={expanded}
                      onToggle={() =>
                        setExpandedId(
                          expanded
                            ? null
                            : consultation.id
                        )
                      }
                    />
                  );
                }
              )
            )}

            <View style={styles.privacyNotice}>
              <Text style={styles.privacyIcon}>
                🔒
              </Text>

              <View style={styles.privacyTextArea}>
                <Text style={styles.privacyTitle}>
                  Private medical information
                </Text>

                <Text style={styles.privacyText}>
                  These records are part of your
                  SmartClinic medical history.
                </Text>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function ConsultationCard({
  consultation,
  latest,
  expanded,
  onToggle,
}: {
  consultation: Consultation;
  latest: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const displayDate =
    consultation.started_at ||
    consultation.created_at;

  return (
    <View style={styles.consultationCard}>
      {latest ? (
        <View style={styles.latestBadgeRow}>
          <View style={styles.latestBadge}>
            <Text
              style={styles.latestBadgeText}
            >
              LATEST
            </Text>
          </View>
        </View>
      ) : null}

      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.cardHeader,
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getInitials(
              consultation.doctor_name
            )}
          </Text>
        </View>

        <View style={styles.cardHeaderText}>
          <Text style={styles.doctorName}>
            {consultation.doctor_name ||
              "Doctor"}
          </Text>

          <Text style={styles.consultationDate}>
            {formatDate(displayDate)}
          </Text>

          {consultation.duration_minutes !=
          null ? (
            <Text style={styles.duration}>
              Duration:{" "}
              {formatDuration(
                consultation.duration_minutes
              )}
            </Text>
          ) : null}
        </View>

        <View style={styles.expandButton}>
          <Text style={styles.expandIcon}>
            {expanded ? "⌃" : "⌄"}
          </Text>
        </View>
      </Pressable>

      {/* QUICK SUMMARY */}
      <View style={styles.quickSummary}>
        <MedicalPreview
          label="Diagnosis"
          value={
            consultation.diagnosis ||
            "Not recorded"
          }
        />

        <View style={styles.previewDivider} />

        <MedicalPreview
          label="Prescription"
          value={
            consultation.prescription ||
            "No prescription"
          }
        />
      </View>

      {/* EXPANDED DETAILS */}
      {expanded ? (
        <View style={styles.expandedContent}>
          <MedicalSection
            icon="💬"
            title="Chief Complaint"
            value={
              consultation.chief_complaint ||
              "No chief complaint recorded."
            }
          />

          <MedicalSection
            icon="🩺"
            title="Diagnosis"
            value={
              consultation.diagnosis ||
              "No diagnosis recorded."
            }
          />

          <MedicalSection
            icon="💊"
            title="Prescription"
            value={
              consultation.prescription ||
              "No prescription was recorded."
            }
            accent
          />

          <MedicalSection
            icon="📝"
            title="Doctor Notes"
            value={
              consultation.doctor_notes ||
              "No additional doctor notes."
            }
          />

          <View style={styles.timelineCard}>
            <Text style={styles.timelineTitle}>
              Consultation Details
            </Text>

            <TimelineRow
              label="Started"
              value={formatDateTime(
                consultation.started_at
              )}
            />

            <TimelineDivider />

            <TimelineRow
              label="Ended"
              value={formatDateTime(
                consultation.ended_at
              )}
            />

            <TimelineDivider />

            <TimelineRow
              label="Duration"
              value={
                consultation.duration_minutes !=
                null
                  ? formatDuration(
                      consultation.duration_minutes
                    )
                  : "Not available"
              }
            />
          </View>
        </View>
      ) : null}

      <Pressable
        onPress={onToggle}
        style={styles.detailsButton}
      >
        <Text style={styles.detailsButtonText}>
          {expanded
            ? "Hide Details"
            : "View Full Record"}
        </Text>

        <Text style={styles.detailsArrow}>
          {expanded ? "↑" : "→"}
        </Text>
      </Pressable>
    </View>
  );
}

function MedicalPreview({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.previewItem}>
      <Text style={styles.previewLabel}>
        {label}
      </Text>

      <Text
        style={styles.previewValue}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function MedicalSection({
  icon,
  title,
  value,
  accent = false,
}: {
  icon: string;
  title: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View
      style={[
        styles.medicalSection,
        accent &&
          styles.medicalSectionAccent,
      ]}
    >
      <View style={styles.medicalTitleRow}>
        <Text style={styles.medicalIcon}>
          {icon}
        </Text>

        <Text style={styles.medicalTitle}>
          {title}
        </Text>
      </View>

      <Text style={styles.medicalValue}>
        {value}
      </Text>
    </View>
  );
}

function TimelineRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.timelineRow}>
      <Text style={styles.timelineLabel}>
        {label}
      </Text>

      <Text style={styles.timelineValue}>
        {value}
      </Text>
    </View>
  );
}

function TimelineDivider() {
  return (
    <View style={styles.timelineDivider} />
  );
}

function formatDate(
  value?: string | null
) {
  if (!value) {
    return "Date not available";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Date not available";
  }

  return date.toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function formatDateTime(
  value?: string | null
) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Not available";
  }

  return date.toLocaleString(
    undefined,
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

function formatDuration(
  minutes: number
) {
  if (minutes < 1) {
    return "< 1 min";
  }

  if (minutes < 60) {
    return `${Math.round(
      minutes
    )} min`;
  }

  const hours =
    Math.floor(minutes / 60);

  const remaining =
    Math.round(minutes % 60);

  if (remaining === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remaining} min`;
}

function getInitials(
  name?: string | null
) {
  if (!name) {
    return "DR";
  }

  const cleaned =
    name.replace(
      /^Dr\.?\s*/i,
      ""
    );

  return (
    cleaned
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part
          .charAt(0)
          .toUpperCase()
      )
      .join("") || "DR"
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
    color: "#64748B",
    fontSize: 14,
    marginTop: 12,
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
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  backIcon: {
    color: "#FFFFFF",
    fontSize: 36,
    lineHeight: 38,
    marginTop: -3,
  },

  headerContent: {
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

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 17,
    borderWidth: 1,
    borderColor: "#E5EAF0",
    flexDirection: "row",
    alignItems: "center",
  },

  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  summaryIconText: {
    fontSize: 23,
  },

  summaryMain: {
    flex: 1,
  },

  summaryTitle: {
    color: "#172033",
    fontSize: 16,
    fontWeight: "800",
  },

  summarySubtitle: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 3,
  },

  summaryCountBox: {
    alignItems: "center",
    paddingLeft: 12,
  },

  summaryCount: {
    color: "#0F766E",
    fontSize: 25,
    fontWeight: "900",
  },

  summaryCountLabel: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "700",
  },

  latestNotice: {
    backgroundColor: "#F0FDFA",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#CCFBF1",
    padding: 13,
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  latestIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#0F766E",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 30,
    fontWeight: "900",
    marginRight: 10,
  },

  latestTextArea: {
    flex: 1,
  },

  latestTitle: {
    color: "#0F766E",
    fontSize: 11,
    fontWeight: "800",
  },

  latestText: {
    color: "#475569",
    fontSize: 11,
    marginTop: 2,
  },

  sectionHeader: {
    marginTop: 25,
    marginBottom: 12,
  },

  sectionTitle: {
    color: "#172033",
    fontSize: 19,
    fontWeight: "800",
  },

  sectionSubtitle: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 3,
  },

  consultationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5EAF0",
    marginBottom: 13,
  },

  latestBadgeRow: {
    flexDirection: "row",
    marginBottom: 10,
  },

  latestBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },

  latestBadgeText: {
    color: "#166534",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  cardPressed: {
    opacity: 0.75,
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#CCFBF1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  avatarText: {
    color: "#0F766E",
    fontSize: 16,
    fontWeight: "900",
  },

  cardHeaderText: {
    flex: 1,
  },

  doctorName: {
    color: "#172033",
    fontSize: 16,
    fontWeight: "800",
  },

  consultationDate: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 3,
  },

  duration: {
    color: "#0F766E",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 3,
  },

  expandButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  expandIcon: {
    color: "#475569",
    fontSize: 20,
    fontWeight: "800",
  },

  quickSummary: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    marginTop: 15,
  },

  previewItem: {
    flex: 1,
  },

  previewDivider: {
    width: 1,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 12,
  },

  previewLabel: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  previewValue: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
    lineHeight: 16,
  },

  expandedContent: {
    marginTop: 15,
  },

  medicalSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 13,
    marginBottom: 10,
  },

  medicalSectionAccent: {
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },

  medicalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  medicalIcon: {
    fontSize: 16,
    marginRight: 7,
  },

  medicalTitle: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "800",
  },

  medicalValue: {
    color: "#172033",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },

  timelineCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5EAF0",
    paddingHorizontal: 13,
    marginTop: 3,
  },

  timelineTitle: {
    color: "#172033",
    fontSize: 12,
    fontWeight: "800",
    paddingTop: 13,
    paddingBottom: 7,
  },

  timelineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
  },

  timelineLabel: {
    color: "#64748B",
    fontSize: 11,
  },

  timelineValue: {
    flex: 1,
    color: "#334155",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right",
  },

  timelineDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },

  detailsButton: {
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  detailsButtonText: {
    color: "#0F766E",
    fontSize: 11,
    fontWeight: "800",
  },

  detailsArrow: {
    color: "#0F766E",
    fontSize: 15,
    marginLeft: 7,
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E5EAF0",
    alignItems: "center",
    padding: 30,
  },

  emptyIconBox: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIcon: {
    fontSize: 28,
  },

  emptyTitle: {
    color: "#172033",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 11,
  },

  emptyText: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 420,
    marginTop: 5,
  },

  primaryButton: {
    backgroundColor: "#0F766E",
    borderRadius: 10,
    paddingHorizontal: 17,
    paddingVertical: 11,
    marginTop: 15,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  privacyNotice: {
    marginTop: 15,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 13,
    flexDirection: "row",
  },

  privacyIcon: {
    fontSize: 17,
    marginRight: 9,
  },

  privacyTextArea: {
    flex: 1,
  },

  privacyTitle: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "800",
  },

  privacyText: {
    color: "#94A3B8",
    fontSize: 10,
    marginTop: 2,
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