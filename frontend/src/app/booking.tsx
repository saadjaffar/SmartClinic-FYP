import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Platform,
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

type AppointmentSlot = {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
};

type AppointmentType = "in_person" | "video";

export default function BookingScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    doctorId?: string;
    doctorName?: string;
    specialization?: string;
    roomNumber?: string;
    workingHours?: string;
  }>();

  const doctorId = Number(params.doctorId);

  const doctorName =
    params.doctorName || "Doctor";

  const specialization =
    params.specialization || "Medical Specialist";

  const roomNumber =
    params.roomNumber || "Not assigned";

  const workingHours =
    params.workingHours || "Not specified";

  const dateOptions = useMemo(
    () => createDateOptions(14),
    []
  );

  const [selectedDate, setSelectedDate] = useState(
    dateOptions[0]?.value || ""
  );

  const [slots, setSlots] = useState<
    AppointmentSlot[]
  >([]);

  const [selectedSlotId, setSelectedSlotId] =
    useState<number | null>(null);

  const [appointmentType, setAppointmentType] =
    useState<AppointmentType>("in_person");

  const [notes, setNotes] = useState("");

  const [slotsLoading, setSlotsLoading] =
    useState(false);

  const [booking, setBooking] = useState(false);

  const [slotsError, setSlotsError] =
    useState("");

  const loadSlots = useCallback(async () => {
    if (!doctorId || !selectedDate) {
      return;
    }

    try {
      setSlotsLoading(true);
      setSlotsError("");
      setSelectedSlotId(null);

      const response = await apiRequest(
        `/api/appointments/slots?doctor_id=${doctorId}&date=${encodeURIComponent(
          selectedDate
        )}`
      );

      let slotList: AppointmentSlot[] =
        Array.isArray(response?.slots)
          ? response.slots
          : [];

      /*
        Extra UX protection:
        If patient selects today, don't show
        appointment times that have already passed.
      */
      if (selectedDate === getTodayString()) {
        const now = new Date();

        const currentTime = `${pad(
          now.getHours()
        )}:${pad(now.getMinutes())}`;

        slotList = slotList.filter(
          (slot) => slot.start_time > currentTime
        );
      }

      setSlots(slotList);
    } catch (error: any) {
      setSlots([]);
      setSlotsError(
        error?.message ||
          "Unable to load available slots."
      );
    } finally {
      setSlotsLoading(false);
    }
  }, [doctorId, selectedDate]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  async function handleBooking() {
    if (!doctorId) {
      Alert.alert(
        "Doctor Missing",
        "Please select a doctor again."
      );
      return;
    }

    if (!selectedSlotId) {
      Alert.alert(
        "Select Time",
        "Please choose an available appointment slot."
      );
      return;
    }

    try {
      setBooking(true);

      const response = await apiRequest(
        "/api/appointments",
        {
          method: "POST",
          body: JSON.stringify({
            doctor_id: doctorId,
            slot_id: selectedSlotId,
            appointment_type: appointmentType,
            notes: notes.trim() || null,
          }),
        }
      );

      const appointment = response?.appointment;

      const tokenNumber = appointment?.queue_token;

      const successMessage =
      
      `Your appointment with ${doctorName} has been booked successfully.` +
      
      (tokenNumber != null
        ? `\n\nYour queue token is #${tokenNumber}.`
        : "");

// Web browser
if (Platform.OS === "web") {
  window.alert(successMessage);

  router.replace("/patient");
  return;
}

// Android / iOS
Alert.alert(
  "Appointment Booked",
  successMessage,
  [
    {
      text: "Done",
      onPress: () => {
        router.replace("/patient");
      },
    },
  ],
  {
    cancelable: false,
  }
);
    } catch (error: any) {
      Alert.alert(
        "Booking Failed",
        error?.message ||
          "Unable to book appointment. Please try again."
      );

      /*
        Slot may have been booked by another
        patient, so reload latest availability.
      */
      loadSlots();
    } finally {
      setBooking(false);
    }
  }

  const selectedSlot = slots.find(
    (slot) => slot.id === selectedSlotId
  );

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
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
            Book Appointment
          </Text>

          <Text style={styles.headerSubtitle}>
            Choose your preferred date and time
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* DOCTOR */}
        <View style={styles.doctorCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(doctorName)}
            </Text>
          </View>

          <View style={styles.doctorDetails}>
            <Text style={styles.doctorName}>
              {doctorName}
            </Text>

            <Text style={styles.specialization}>
              {specialization}
            </Text>

            <View style={styles.doctorMetaRow}>
              <Text style={styles.doctorMeta}>
                📍 {roomNumber}
              </Text>

              <Text style={styles.doctorMeta}>
                🕒 {workingHours}
              </Text>
            </View>
          </View>
        </View>

        {/* DATE */}
        <SectionHeader
          number="1"
          title="Select Date"
          subtitle="Choose a convenient appointment day"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateRow}
        >
          {dateOptions.map((date) => {
            const selected =
              date.value === selectedDate;

            return (
              <Pressable
                key={date.value}
                onPress={() =>
                  setSelectedDate(date.value)
                }
                style={[
                  styles.dateCard,
                  selected &&
                    styles.dateCardSelected,
                ]}
              >
                <Text
                  style={[
                    styles.dateDay,
                    selected &&
                      styles.dateTextSelected,
                  ]}
                >
                  {date.day}
                </Text>

                <Text
                  style={[
                    styles.dateNumber,
                    selected &&
                      styles.dateTextSelected,
                  ]}
                >
                  {date.date}
                </Text>

                <Text
                  style={[
                    styles.dateMonth,
                    selected &&
                      styles.dateTextSelected,
                  ]}
                >
                  {date.month}
                </Text>

                {date.isToday ? (
                  <Text
                    style={[
                      styles.todayText,
                      selected &&
                        styles.todayTextSelected,
                    ]}
                  >
                    Today
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* TIME SLOT */}
        <SectionHeader
          number="2"
          title="Select Time"
          subtitle={formatLongDate(selectedDate)}
        />

        {slotsLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" />
            <Text style={styles.loadingText}>
              Checking available times...
            </Text>
          </View>
        ) : slotsError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              Couldn't load slots
            </Text>

            <Text style={styles.errorText}>
              {slotsError}
            </Text>

            <Pressable
              onPress={loadSlots}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>
                Try Again
              </Text>
            </Pressable>
          </View>
        ) : slots.length === 0 ? (
          <View style={styles.emptySlots}>
            <Text style={styles.emptySlotIcon}>
              🗓️
            </Text>

            <Text style={styles.emptySlotTitle}>
              No slots available
            </Text>

            <Text style={styles.emptySlotText}>
              This doctor has no available
              appointment times for this date.
              Please choose another day.
            </Text>
          </View>
        ) : (
          <View style={styles.slotsGrid}>
            {slots.map((slot) => {
              const selected =
                selectedSlotId === slot.id;

              return (
                <Pressable
                  key={slot.id}
                  onPress={() =>
                    setSelectedSlotId(slot.id)
                  }
                  style={[
                    styles.slotButton,
                    selected &&
                      styles.slotButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.slotTime,
                      selected &&
                        styles.slotTextSelected,
                    ]}
                  >
                    {formatTime(
                      slot.start_time
                    )}
                  </Text>

                  <Text
                    style={[
                      styles.slotEnd,
                      selected &&
                        styles.slotEndSelected,
                    ]}
                  >
                    to{" "}
                    {formatTime(slot.end_time)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* APPOINTMENT TYPE */}
        <SectionHeader
          number="3"
          title="Visit Type"
          subtitle="Select how you want to consult the doctor"
        />

        <View style={styles.typeRow}>
          <AppointmentTypeCard
            title="In-Person"
            description="Visit the clinic"
            icon="🏥"
            selected={
              appointmentType === "in_person"
            }
            onPress={() =>
              setAppointmentType("in_person")
            }
          />

          <AppointmentTypeCard
            title="Video"
            description="Online consultation"
            icon="📹"
            selected={
              appointmentType === "video"
            }
            onPress={() =>
              setAppointmentType("video")
            }
          />
        </View>

        {/* NOTES */}
        <SectionHeader
          number="4"
          title="Reason for Visit"
          subtitle="Optional — briefly tell the doctor why you're visiting"
        />

        <View style={styles.notesCard}>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="For example: Fever and headache for two days..."
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={500}
            textAlignVertical="top"
            style={styles.notesInput}
          />

          <Text style={styles.characterCount}>
            {notes.length}/500
          </Text>
        </View>

        {/* REVIEW */}
        <Text style={styles.reviewHeading}>
          Appointment Summary
        </Text>

        <View style={styles.reviewCard}>
          <ReviewRow
            label="Doctor"
            value={doctorName}
          />

          <ReviewDivider />

          <ReviewRow
            label="Date"
            value={formatLongDate(
              selectedDate
            )}
          />

          <ReviewDivider />

          <ReviewRow
            label="Time"
            value={
              selectedSlot
                ? `${formatTime(
                    selectedSlot.start_time
                  )} - ${formatTime(
                    selectedSlot.end_time
                  )}`
                : "Not selected"
            }
          />

          <ReviewDivider />

          <ReviewRow
            label="Visit"
            value={
              appointmentType === "in_person"
                ? "In-Person"
                : "Video Consultation"
            }
          />
        </View>

        {/* CONFIRM */}
        <Pressable
          disabled={
            booking ||
            !selectedSlotId ||
            slotsLoading
          }
          onPress={handleBooking}
          style={({ pressed }) => [
            styles.confirmButton,
            (!selectedSlotId ||
              booking ||
              slotsLoading) &&
              styles.confirmButtonDisabled,
            pressed &&
              selectedSlotId !== null &&
              !booking &&
              !slotsLoading &&
              styles.pressed
          ]}
        >
          {booking ? (
            <View style={styles.bookingRow}>
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

              <Text
                style={styles.confirmButtonText}
              >
                Booking appointment...
              </Text>
            </View>
          ) : (
            <Text style={styles.confirmButtonText}>
              Confirm Appointment
            </Text>
          )}
        </Pressable>

        <Text style={styles.footerNote}>
          Please arrive a few minutes before your
          scheduled appointment.
        </Text>
      </ScrollView>
    </View>
  );
}

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
    <View style={styles.sectionHeader}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>
          {number}
        </Text>
      </View>

      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionTitle}>
          {title}
        </Text>

        <Text style={styles.sectionSubtitle}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function AppointmentTypeCard({
  title,
  description,
  icon,
  selected,
  onPress,
}: {
  title: string;
  description: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.typeCard,
        selected && styles.typeCardSelected,
      ]}
    >
      <View style={styles.typeTopRow}>
        <Text style={styles.typeIcon}>
          {icon}
        </Text>

        <View
          style={[
            styles.radioOuter,
            selected && styles.radioOuterSelected,
          ]}
        >
          {selected ? (
            <View style={styles.radioInner} />
          ) : null}
        </View>
      </View>

      <Text
        style={[
          styles.typeTitle,
          selected && styles.typeTitleSelected,
        ]}
      >
        {title}
      </Text>

      <Text style={styles.typeDescription}>
        {description}
      </Text>
    </Pressable>
  );
}

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>
        {label}
      </Text>

      <Text style={styles.reviewValue}>
        {value}
      </Text>
    </View>
  );
}

function ReviewDivider() {
  return <View style={styles.reviewDivider} />;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getTodayString() {
  const now = new Date();

  return `${now.getFullYear()}-${pad(
    now.getMonth() + 1
  )}-${pad(now.getDate())}`;
}

function createDateOptions(days: number) {
  const result = [];

  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + i
    );

    result.push({
      value: `${date.getFullYear()}-${pad(
        date.getMonth() + 1
      )}-${pad(date.getDate())}`,

      day: date.toLocaleDateString(
        undefined,
        {
          weekday: "short",
        }
      ),

      date: String(date.getDate()),

      month: date.toLocaleDateString(
        undefined,
        {
          month: "short",
        }
      ),

      isToday: i === 0,
    });
  }

  return result;
}

function formatTime(time: string) {
  if (!time) {
    return "";
  }

  const [hourString, minute = "00"] =
    time.split(":");

  const hour = Number(hourString);

  const period =
    hour >= 12 ? "PM" : "AM";

  const displayHour =
    hour % 12 || 12;

  return `${displayHour}:${minute} ${period}`;
}

function formatLongDate(dateString: string) {
  if (!dateString) {
    return "";
  }

  const [year, month, day] =
    dateString.split("-").map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

  return date.toLocaleDateString(
    undefined,
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function getInitials(name: string) {
  const cleaned = name.replace(
    /^Dr\.?\s*/i,
    ""
  );

  const initials = cleaned
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join("");

  return initials || "DR";
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
    maxWidth: 900,
    alignSelf: "center",
    padding: 18,
    paddingBottom: 45,
  },

  doctorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 17,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#CCFBF1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  avatarText: {
    color: "#0F766E",
    fontSize: 19,
    fontWeight: "800",
  },

  doctorDetails: {
    flex: 1,
  },

  doctorName: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
  },

  specialization: {
    color: "#0F766E",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },

  doctorMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },

  doctorMeta: {
    color: "#64748B",
    fontSize: 12,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 25,
    marginBottom: 13,
  },

  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0F766E",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  stepNumberText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  sectionHeaderText: {
    flex: 1,
  },

  sectionTitle: {
    color: "#172033",
    fontSize: 17,
    fontWeight: "800",
  },

  sectionSubtitle: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2,
  },

  dateRow: {
    gap: 9,
    paddingBottom: 3,
  },

  dateCard: {
    width: 82,
    minHeight: 105,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },

  dateCardSelected: {
    backgroundColor: "#0F766E",
    borderColor: "#0F766E",
  },

  dateDay: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },

  dateNumber: {
    color: "#172033",
    fontSize: 25,
    fontWeight: "800",
    marginVertical: 2,
  },

  dateMonth: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
  },

  dateTextSelected: {
    color: "#FFFFFF",
  },

  todayText: {
    color: "#0F766E",
    fontSize: 9,
    fontWeight: "800",
    marginTop: 5,
  },

  todayTextSelected: {
    color: "#CCFBF1",
  },

  loadingBox: {
    backgroundColor: "#FFFFFF",
    padding: 22,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 9,
    color: "#64748B",
    fontSize: 13,
  },

  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  slotButton: {
    minWidth: 125,
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDE5EC",
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
  },

  slotButtonSelected: {
    backgroundColor: "#0F766E",
    borderColor: "#0F766E",
  },

  slotTime: {
    color: "#172033",
    fontSize: 14,
    fontWeight: "800",
  },

  slotTextSelected: {
    color: "#FFFFFF",
  },

  slotEnd: {
    color: "#94A3B8",
    fontSize: 10,
    marginTop: 3,
  },

  slotEndSelected: {
    color: "#CCFBF1",
  },

  emptySlots: {
    backgroundColor: "#FFFFFF",
    padding: 25,
    borderRadius: 15,
    alignItems: "center",
  },

  emptySlotIcon: {
    fontSize: 32,
  },

  emptySlotTitle: {
    color: "#172033",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 8,
  },

  emptySlotText: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 5,
    maxWidth: 380,
  },

  errorCard: {
    backgroundColor: "#FEF2F2",
    padding: 16,
    borderRadius: 14,
  },

  errorTitle: {
    color: "#991B1B",
    fontWeight: "800",
    fontSize: 14,
  },

  errorText: {
    color: "#B91C1C",
    fontSize: 12,
    marginTop: 5,
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
    fontWeight: "800",
  },

  typeRow: {
    flexDirection: "row",
    gap: 11,
  },

  typeCard: {
    flex: 1,
    minHeight: 125,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 15,
  },

  typeCardSelected: {
    borderColor: "#0F766E",
    backgroundColor: "#F0FDFA",
  },

  typeTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  typeIcon: {
    fontSize: 25,
  },

  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },

  radioOuterSelected: {
    borderColor: "#0F766E",
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0F766E",
  },

  typeTitle: {
    color: "#172033",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 12,
  },

  typeTitleSelected: {
    color: "#0F766E",
  },

  typeDescription: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 4,
  },

  notesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 13,
  },

  notesInput: {
    minHeight: 105,
    fontSize: 14,
    color: "#172033",
  },

  characterCount: {
    alignSelf: "flex-end",
    color: "#94A3B8",
    fontSize: 10,
    marginTop: 5,
  },

  reviewHeading: {
    color: "#172033",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 26,
    marginBottom: 12,
  },

  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
    paddingVertical: 14,
  },

  reviewLabel: {
    color: "#64748B",
    fontSize: 13,
  },

  reviewValue: {
    flex: 1,
    textAlign: "right",
    color: "#172033",
    fontSize: 13,
    fontWeight: "700",
  },

  reviewDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },

  confirmButton: {
    backgroundColor: "#0F766E",
    borderRadius: 13,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 20,
  },

  confirmButtonDisabled: {
    backgroundColor: "#94A3B8",
  },

  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  bookingRow: {
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
  },

  footerNote: {
    color: "#94A3B8",
    fontSize: 11,
    textAlign: "center",
    marginTop: 12,
  },

  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
});