import React, {
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import { apiRequest } from "../api/client";

type Params = {
  queueId?: string | string[];
  tokenNumber?: string | string[];
  patientName?: string | string[];
  appointmentTime?: string | string[];
  appointmentType?: string | string[];
  reason?: string | string[];
};

export default function DoctorConsultationScreen() {
  const router = useRouter();

  const params =
    useLocalSearchParams<Params>();

  const queueId =
    Number(
      getParam(params.queueId)
    );

  const tokenNumber =
    getParam(params.tokenNumber);

  const patientName =
    getParam(params.patientName) ||
    "Patient";

  const appointmentTime =
    getParam(params.appointmentTime);

  const appointmentType =
    getParam(params.appointmentType);

  const initialReason =
    getParam(params.reason);

  const [chiefComplaint, setChiefComplaint] =
    useState(initialReason);

  const [diagnosis, setDiagnosis] =
    useState("");

  const [prescription, setPrescription] =
    useState("");

  const [doctorNotes, setDoctorNotes] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const visitType =
    useMemo(() => {
      return appointmentType === "video"
        ? "Video Consultation"
        : "In-Person";
    }, [appointmentType]);

  const handleCompletePress = () => {
    if (
      !queueId ||
      Number.isNaN(queueId)
    ) {
      showMessage(
        "Invalid Queue",
        "Queue information is missing."
      );

      return;
    }

    if (
      chiefComplaint.trim().length < 2
    ) {
      showMessage(
        "Chief Complaint Required",
        "Please enter the patient's chief complaint."
      );

      return;
    }

    if (
      diagnosis.trim().length < 2
    ) {
      showMessage(
        "Diagnosis Required",
        "Please enter the diagnosis or clinical assessment."
      );

      return;
    }

    const message =
      "Save this medical record and complete " +
      "the patient's consultation?";

    if (Platform.OS === "web") {
      const confirmed =
        window.confirm(message);

      if (confirmed) {
        saveAndComplete();
      }

      return;
    }

    Alert.alert(
      "Complete Consultation",
      message,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Save & Complete",
          onPress: saveAndComplete,
        },
      ]
    );
  };

  const saveAndComplete =
    async () => {
      if (submitting) {
        return;
      }

      setSubmitting(true);

      /*
        STEP 1:
        Save medical consultation record.

        If the first API request succeeded earlier
        but completion failed, retrying may return
        "consultation already exists".

        In that case we can safely continue to the
        completion API.
      */

      try {
        try {
          await apiRequest(
            "/api/consultations",
            {
              method: "POST",
              body: JSON.stringify({
                queue_id: queueId,

                chief_complaint:
                  chiefComplaint.trim(),

                diagnosis:
                  diagnosis.trim(),

                prescription:
                  prescription.trim() ||
                  null,

                doctor_notes:
                  doctorNotes.trim() ||
                  null,
              }),
            }
          );
        } catch (err: any) {
          const message =
            String(
              err?.message || ""
            ).toLowerCase();

          /*
            This makes retry safe if the
            consultation was saved but the
            queue-complete call failed.
          */
          if (
            !message.includes(
              "consultation already exists"
            )
          ) {
            throw err;
          }
        }

        /*
          STEP 2:
          Complete queue token + appointment.

          Backend will also set ended_at and
          calculate consultation duration.
        */

        await apiRequest(
          `/api/queue/${queueId}/complete`,
          {
            method: "PATCH",
          }
        );

        showMessage(
          "Consultation Completed",
          "The medical record has been saved and the patient has been completed."
        );

        router.replace(
          "/doctor-queue"
        );
      } catch (err: any) {
        showMessage(
          "Unable to Complete",
          err?.message ||
            "The consultation could not be completed."
        );
      } finally {
        setSubmitting(false);
      }
    };

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          disabled={submitting}
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
            Consultation
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            Record diagnosis and treatment
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={
          styles.content
        }
      >
        {/* PATIENT */}
        <View
          style={styles.patientCard}
        >
          <View
            style={styles.tokenCircle}
          >
            <Text
              style={
                styles.tokenLabel
              }
            >
              TOKEN
            </Text>

            <Text
              style={
                styles.tokenNumber
              }
            >
              #
              {tokenNumber || "—"}
            </Text>
          </View>

          <View
            style={styles.patientInfo}
          >
            <Text
              style={
                styles.patientName
              }
            >
              {patientName}
            </Text>

            <Text
              style={styles.patientMeta}
            >
              {visitType}
            </Text>

            {appointmentTime ? (
              <Text
                style={
                  styles.patientMeta
                }
              >
                🕒 {appointmentTime}
              </Text>
            ) : null}
          </View>

          <View
            style={
              styles.progressBadge
            }
          >
            <View
              style={
                styles.progressDot
              }
            />

            <Text
              style={
                styles.progressText
              }
            >
              In Consultation
            </Text>
          </View>
        </View>

        {/* NOTICE */}
        <View
          style={styles.noticeCard}
        >
          <Text
            style={styles.noticeIcon}
          >
            🔒
          </Text>

          <View
            style={styles.noticeContent}
          >
            <Text
              style={
                styles.noticeTitle
              }
            >
              Medical Record
            </Text>

            <Text
              style={
                styles.noticeText
              }
            >
              Information entered here will
              become part of the patient's
              consultation history.
            </Text>
          </View>
        </View>

        {/* CHIEF COMPLAINT */}
        <FormSection
          number="1"
          title="Chief Complaint"
          subtitle="Main reason for the patient's visit"
          required
        />

        <TextInput
          value={chiefComplaint}
          onChangeText={
            setChiefComplaint
          }
          editable={!submitting}
          multiline
          maxLength={1000}
          placeholder="e.g. Fever and headache for two days"
          placeholderTextColor="#94A3B8"
          textAlignVertical="top"
          style={[
            styles.textArea,
            styles.mediumArea,
          ]}
        />

        <CharacterCount
          current={
            chiefComplaint.length
          }
          max={1000}
        />

        {/* DIAGNOSIS */}
        <FormSection
          number="2"
          title="Diagnosis / Assessment"
          subtitle="Clinical diagnosis or medical assessment"
          required
        />

        <TextInput
          value={diagnosis}
          onChangeText={
            setDiagnosis
          }
          editable={!submitting}
          multiline
          maxLength={1500}
          placeholder="e.g. Viral upper respiratory infection"
          placeholderTextColor="#94A3B8"
          textAlignVertical="top"
          style={[
            styles.textArea,
            styles.mediumArea,
          ]}
        />

        <CharacterCount
          current={
            diagnosis.length
          }
          max={1500}
        />

        {/* PRESCRIPTION */}
        <FormSection
          number="3"
          title="Prescription"
          subtitle="Medication, dosage and instructions"
        />

        <TextInput
          value={prescription}
          onChangeText={
            setPrescription
          }
          editable={!submitting}
          multiline
          maxLength={2000}
          placeholder={
            "e.g. Paracetamol 500mg twice daily after meals"
          }
          placeholderTextColor="#94A3B8"
          textAlignVertical="top"
          style={[
            styles.textArea,
            styles.largeArea,
          ]}
        />

        <CharacterCount
          current={
            prescription.length
          }
          max={2000}
        />

        {/* DOCTOR NOTES */}
        <FormSection
          number="4"
          title="Doctor Notes"
          subtitle="Additional instructions, observations or follow-up advice"
        />

        <TextInput
          value={doctorNotes}
          onChangeText={
            setDoctorNotes
          }
          editable={!submitting}
          multiline
          maxLength={2000}
          placeholder={
            "e.g. Patient advised to rest, maintain hydration and return if symptoms worsen"
          }
          placeholderTextColor="#94A3B8"
          textAlignVertical="top"
          style={[
            styles.textArea,
            styles.largeArea,
          ]}
        />

        <CharacterCount
          current={
            doctorNotes.length
          }
          max={2000}
        />

        {/* SUMMARY */}
        <Text
          style={styles.summaryTitle}
        >
          Before Completing
        </Text>

        <View
          style={styles.summaryCard}
        >
          <SummaryRow
            label="Patient"
            value={patientName}
          />

          <Divider />

          <SummaryRow
            label="Token"
            value={
              `#${tokenNumber || "—"}`
            }
          />

          <Divider />

          <SummaryRow
            label="Chief complaint"
            value={
              chiefComplaint.trim()
                ? "Entered"
                : "Required"
            }
          />

          <Divider />

          <SummaryRow
            label="Diagnosis"
            value={
              diagnosis.trim()
                ? "Entered"
                : "Required"
            }
          />

          <Divider />

          <SummaryRow
            label="Prescription"
            value={
              prescription.trim()
                ? "Entered"
                : "None"
            }
          />
        </View>

        {/* SAVE + COMPLETE */}
        <Pressable
          disabled={submitting}
          onPress={
            handleCompletePress
          }
          style={({ pressed }) => [
            styles.completeButton,
            submitting &&
              styles.completeDisabled,
            pressed &&
              !submitting &&
              styles.pressed,
          ]}
        >
          {submitting ? (
            <View
              style={
                styles.loadingRow
              }
            >
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.completeText
                }
              >
                Saving consultation...
              </Text>
            </View>
          ) : (
            <Text
              style={
                styles.completeText
              }
            >
              ✓ Save & Complete Consultation
            </Text>
          )}
        </Pressable>

        <Text
          style={styles.footerNote}
        >
          Completing the consultation will
          finalize this patient's queue visit.
        </Text>
      </ScrollView>
    </View>
  );
}

function FormSection({
  number,
  title,
  subtitle,
  required = false,
}: {
  number: string;
  title: string;
  subtitle: string;
  required?: boolean;
}) {
  return (
    <View
      style={styles.formSection}
    >
      <View
        style={styles.stepCircle}
      >
        <Text
          style={styles.stepText}
        >
          {number}
        </Text>
      </View>

      <View
        style={styles.formSectionText}
      >
        <View
          style={styles.titleRow}
        >
          <Text
            style={
              styles.formTitle
            }
          >
            {title}
          </Text>

          {required ? (
            <Text
              style={
                styles.requiredText
              }
            >
              Required
            </Text>
          ) : (
            <Text
              style={
                styles.optionalText
              }
            >
              Optional
            </Text>
          )}
        </View>

        <Text
          style={
            styles.formSubtitle
          }
        >
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function CharacterCount({
  current,
  max,
}: {
  current: number;
  max: number;
}) {
  return (
    <Text
      style={styles.characterCount}
    >
      {current}/{max}
    </Text>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      style={styles.summaryRow}
    >
      <Text
        style={styles.summaryLabel}
      >
        {label}
      </Text>

      <Text
        style={styles.summaryValue}
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

function getParam(
  value?: string | string[]
) {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
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
    paddingBottom: 50,
  },

  patientCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E5EAF0",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  tokenCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#CCFBF1",
    justifyContent: "center",
    alignItems: "center",
  },

  tokenLabel: {
    color: "#64748B",
    fontSize: 8,
    fontWeight: "800",
  },

  tokenNumber: {
    color: "#0F766E",
    fontSize: 19,
    fontWeight: "900",
  },

  patientInfo: {
    flex: 1,
    marginLeft: 13,
  },

  patientName: {
    color: "#172033",
    fontSize: 16,
    fontWeight: "800",
  },

  patientMeta: {
    color: "#64748B",
    fontSize: 10,
    marginTop: 3,
  },

  progressBadge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 18,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
  },

  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2563EB",
    marginRight: 5,
  },

  progressText: {
    color: "#1D4ED8",
    fontSize: 9,
    fontWeight: "800",
  },

  noticeCard: {
    marginTop: 13,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 13,
    padding: 13,
    flexDirection: "row",
  },

  noticeIcon: {
    fontSize: 17,
    marginRight: 9,
  },

  noticeContent: {
    flex: 1,
  },

  noticeTitle: {
    color: "#1E40AF",
    fontSize: 11,
    fontWeight: "800",
  },

  noticeText: {
    color: "#475569",
    fontSize: 10,
    lineHeight: 16,
    marginTop: 3,
  },

  formSection: {
    marginTop: 25,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#0F766E",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  stepText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },

  formSectionText: {
    flex: 1,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  formTitle: {
    color: "#172033",
    fontSize: 15,
    fontWeight: "800",
  },

  requiredText: {
    color: "#B91C1C",
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    fontSize: 8,
    fontWeight: "800",
  },

  optionalText: {
    color: "#64748B",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    fontSize: 8,
    fontWeight: "700",
  },

  formSubtitle: {
    color: "#64748B",
    fontSize: 10,
    marginTop: 2,
  },

  textArea: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 13,
    color: "#172033",
    fontSize: 12,
    lineHeight: 18,
  },

  mediumArea: {
    minHeight: 100,
  },

  largeArea: {
    minHeight: 120,
  },

  characterCount: {
    alignSelf: "flex-end",
    color: "#94A3B8",
    fontSize: 9,
    marginTop: 4,
  },

  summaryTitle: {
    color: "#172033",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 27,
    marginBottom: 10,
  },

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EAF0",
    borderRadius: 15,
    paddingHorizontal: 15,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 46,
    gap: 15,
  },

  summaryLabel: {
    color: "#64748B",
    fontSize: 11,
  },

  summaryValue: {
    flex: 1,
    textAlign: "right",
    color: "#334155",
    fontSize: 11,
    fontWeight: "700",
  },

  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },

  completeButton: {
    backgroundColor: "#0F766E",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,
  },

  completeDisabled: {
    opacity: 0.65,
  },

  completeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  footerNote: {
    color: "#94A3B8",
    fontSize: 9,
    textAlign: "center",
    marginTop: 9,
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