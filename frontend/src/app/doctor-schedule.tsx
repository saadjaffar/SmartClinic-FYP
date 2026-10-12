import React, {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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


type DoctorSchedule = {
  id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
};


type GeneratedSlot = {
  start_time: string;
  end_time: string;
};


type DateOption = {
  value: string;
  dayName: string;
  shortDay: string;
  dayNumber: string;
  month: string;
};


const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];


export default function DoctorScheduleScreen() {
  const router = useRouter();

  const [schedules, setSchedules] =
    useState<DoctorSchedule[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");


  // ============================================================
  // ADD / EDIT STATE
  // ============================================================

  const [
    modalVisible,
    setModalVisible,
  ] = useState(false);

  const [
    editingSchedule,
    setEditingSchedule,
  ] = useState<DoctorSchedule | null>(
    null
  );

  const [
    selectedDay,
    setSelectedDay,
  ] = useState("");

  const [
    startTime,
    setStartTime,
  ] = useState("09:00");

  const [
    endTime,
    setEndTime,
  ] = useState("13:00");

  const [
    slotDuration,
    setSlotDuration,
  ] = useState("30");

  const [saving, setSaving] =
    useState(false);

  const [
    removingId,
    setRemovingId,
  ] = useState<number | null>(
    null
  );


  // ============================================================
  // SLOT GENERATION STATE
  // ============================================================

  const [
    selectedGenerateDate,
    setSelectedGenerateDate,
  ] = useState("");

  const [
    generatingSlots,
    setGeneratingSlots,
  ] = useState(false);

  const [
    generatedSlots,
    setGeneratedSlots,
  ] = useState<GeneratedSlot[]>([]);

  const [
    generationSuccess,
    setGenerationSuccess,
  ] = useState("");

  const [
    generationError,
    setGenerationError,
  ] = useState("");


  // ============================================================
  // LOAD SCHEDULE
  // ============================================================

  const loadSchedule =
    useCallback(
      async () => {
        try {
          setError("");

          const response =
            await apiRequest(
              "/api/doctors/schedule"
            );

          const list =
            Array.isArray(
              response?.schedules
            )
              ? response.schedules
              : [];

          setSchedules(list);

        } catch (err: any) {
          setError(
            err?.message ||
              "Unable to load your schedule."
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
      loadSchedule();
    }, [loadSchedule])
  );


  const onRefresh = () => {
    setRefreshing(true);
    loadSchedule();
  };


  // ============================================================
  // ACTIVE DAYS
  // ============================================================

  const activeDays = new Set(
    schedules.map(
      (schedule) =>
        schedule.day_of_week
    )
  );


  const availableDays =
    DAYS.filter(
      (day) =>
        !activeDays.has(day)
    );


  // ============================================================
  // NEXT 14 DAYS
  // ============================================================

  const dateOptions =
    useMemo(
      () =>
        createDateOptions(14),
      []
    );


  const eligibleDates =
    dateOptions.filter(
      (option) =>
        activeDays.has(
          option.dayName
        )
    );


  const effectiveGenerateDate =
    eligibleDates.some(
      (option) =>
        option.value ===
        selectedGenerateDate
    )
      ? selectedGenerateDate
      : eligibleDates[0]?.value || "";


  // ============================================================
  // CLEAR GENERATION RESULT
  // ============================================================

  const clearGenerationResult =
    () => {
      setGeneratedSlots([]);
      setGenerationSuccess("");
      setGenerationError("");
    };


  // ============================================================
  // GENERATE APPOINTMENT SLOTS
  // ============================================================

  const handleGenerateSlots =
    async () => {

      if (
        !effectiveGenerateDate
      ) {
        showMessage(
          "No Available Date",
          "Add an active weekly schedule first."
        );

        return;
      }


      try {
        setGeneratingSlots(true);

        setGenerationError("");
        setGenerationSuccess("");
        setGeneratedSlots([]);


        const response =
          await apiRequest(
            "/api/doctors/schedule/generate-slots",
            {
              method: "POST",

              body: JSON.stringify({
                date:
                  effectiveGenerateDate,
              }),
            }
          );


        const slots =
          Array.isArray(
            response?.slots
          )
            ? response.slots
            : [];


        setGeneratedSlots(
          slots
        );


        setGenerationSuccess(
          `${response?.count ?? slots.length} appointment slots generated successfully for ${formatLongDate(
            effectiveGenerateDate
          )}.`
        );

      } catch (err: any) {

        setGenerationError(
          err?.message ||
            "Unable to generate appointment slots."
        );

      } finally {
        setGeneratingSlots(
          false
        );
      }
    };


  // ============================================================
  // OPEN ADD
  // ============================================================

  const openAddModal = () => {

    if (
      availableDays.length === 0
    ) {
      showMessage(
        "Schedule Complete",
        "You already have an active schedule for all seven days."
      );

      return;
    }


    setEditingSchedule(
      null
    );

    setSelectedDay(
      availableDays[0]
    );

    setStartTime("09:00");
    setEndTime("13:00");
    setSlotDuration("30");

    setModalVisible(true);
  };


  // ============================================================
  // OPEN EDIT
  // ============================================================

  const openEditModal = (
    schedule: DoctorSchedule
  ) => {

    setEditingSchedule(
      schedule
    );

    setSelectedDay(
      schedule.day_of_week
    );

    setStartTime(
      schedule.start_time
    );

    setEndTime(
      schedule.end_time
    );

    setSlotDuration(
      String(
        schedule.slot_duration_minutes
      )
    );

    setModalVisible(true);
  };


  const closeModal = () => {

    if (saving) {
      return;
    }

    setModalVisible(false);

    setEditingSchedule(
      null
    );
  };


  // ============================================================
  // VALIDATE SCHEDULE FORM
  // ============================================================

  const validateForm = () => {

    if (!selectedDay) {
      showMessage(
        "Select Day",
        "Please select a working day."
      );

      return null;
    }


    const timeRegex =
      /^([01]\d|2[0-3]):[0-5]\d$/;


    const cleanStart =
      startTime.trim();

    const cleanEnd =
      endTime.trim();


    if (
      !timeRegex.test(
        cleanStart
      )
    ) {
      showMessage(
        "Invalid Start Time",
        "Please use HH:MM format, for example 09:00."
      );

      return null;
    }


    if (
      !timeRegex.test(
        cleanEnd
      )
    ) {
      showMessage(
        "Invalid End Time",
        "Please use HH:MM format, for example 13:00."
      );

      return null;
    }


    const startMinutes =
      timeToMinutes(
        cleanStart
      );

    const endMinutes =
      timeToMinutes(
        cleanEnd
      );


    if (
      endMinutes <=
      startMinutes
    ) {
      showMessage(
        "Invalid Time",
        "End time must be later than start time."
      );

      return null;
    }


    const duration =
      Number(
        slotDuration.trim()
      );


    if (
      !Number.isInteger(
        duration
      ) ||
      duration <= 0
    ) {
      showMessage(
        "Invalid Slot Duration",
        "Please enter a valid slot duration in minutes."
      );

      return null;
    }


    const scheduleMinutes =
      endMinutes -
      startMinutes;


    if (
      duration >
      scheduleMinutes
    ) {
      showMessage(
        "Invalid Slot Duration",
        "Slot duration cannot be longer than the schedule time."
      );

      return null;
    }


    return {
      day_of_week:
        selectedDay,

      start_time:
        cleanStart,

      end_time:
        cleanEnd,

      slot_duration_minutes:
        duration,
    };
  };


  // ============================================================
  // ADD / EDIT
  // ============================================================

  const handleSaveSchedule =
    async () => {

      const payload =
        validateForm();

      if (!payload) {
        return;
      }


      try {
        setSaving(true);


        if (editingSchedule) {

          await apiRequest(
            `/api/doctors/schedule/${editingSchedule.id}`,
            {
              method: "PUT",
              body:
                JSON.stringify(
                  payload
                ),
            }
          );


          setModalVisible(
            false
          );

          setEditingSchedule(
            null
          );

          clearGenerationResult();

          await loadSchedule();


          showMessage(
            "Schedule Updated",
            `${payload.day_of_week} schedule has been updated successfully.`
          );

          return;
        }


        await apiRequest(
          "/api/doctors/schedule",
          {
            method: "POST",
            body:
              JSON.stringify(
                payload
              ),
          }
        );


        setModalVisible(
          false
        );

        clearGenerationResult();

        await loadSchedule();


        showMessage(
          "Schedule Added",
          `${payload.day_of_week} schedule has been added successfully.`
        );


      } catch (err: any) {

        showMessage(
          editingSchedule
            ? "Unable to Update Schedule"
            : "Unable to Add Schedule",

          err?.message ||
            "Please try again."
        );

      } finally {
        setSaving(false);
      }
    };


  // ============================================================
  // REMOVE
  // ============================================================

  const handleRemoveSchedule =
    async (
      schedule: DoctorSchedule
    ) => {

      const removeSchedule =
        async () => {

          try {
            setRemovingId(
              schedule.id
            );


            await apiRequest(
              `/api/doctors/schedule/${schedule.id}`,
              {
                method: "DELETE",
              }
            );


            clearGenerationResult();

            await loadSchedule();


            showMessage(
              "Schedule Removed",
              `${schedule.day_of_week} schedule has been removed successfully.`
            );


          } catch (err: any) {

            showMessage(
              "Unable to Remove Schedule",
              err?.message ||
                "Please try again."
            );


          } finally {
            setRemovingId(
              null
            );
          }
        };


      if (
        Platform.OS === "web" &&
        typeof window !==
          "undefined"
      ) {

        const confirmed =
          window.confirm(
            `Remove ${schedule.day_of_week} schedule?\n\nThis will deactivate the recurring weekly schedule.`
          );


        if (confirmed) {
          await removeSchedule();
        }

        return;
      }


      Alert.alert(
        "Remove Schedule",

        `Are you sure you want to remove ${schedule.day_of_week} from your weekly schedule?`,

        [
          {
            text: "Cancel",
            style: "cancel",
          },

          {
            text: "Remove",
            style: "destructive",

            onPress: () => {
              void removeSchedule();
            },
          },
        ]
      );
    };


  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading your schedule...
        </Text>
      </View>
    );
  }


  // ============================================================
  // MAIN UI
  // ============================================================

  return (
    <View style={styles.container}>

      <ScrollView
        showsVerticalScrollIndicator={
          false
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
      >

        {/* HEADER */}

        <View
          style={
            styles.header
          }
        >
          <Pressable
            style={
              styles.backButton
            }
            onPress={() =>
              router.back()
            }
          >
            <Text
              style={
                styles.backText
              }
            >
              ‹
            </Text>
          </Pressable>


          <View>
            <Text
              style={
                styles.headerTitle
              }
            >
              My Schedule
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              Manage your weekly
              availability
            </Text>
          </View>
        </View>


        <View
          style={
            styles.content
          }
        >

          {/* LOAD ERROR */}

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
                Unable to load schedule
              </Text>

              <Text
                style={
                  styles.errorText
                }
              >
                {error}
              </Text>

              <Pressable
                style={
                  styles.retryButton
                }
                onPress={
                  loadSchedule
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


          {/* ===================================================
              GENERATE SLOTS
          ==================================================== */}

          <View
            style={
              styles.generatorCard
            }
          >

            <View
              style={
                styles.generatorHeader
              }
            >
              <View
                style={
                  styles.generatorHeadingArea
                }
              >
                <Text
                  style={
                    styles.generatorTitle
                  }
                >
                  Generate Appointment Slots
                </Text>

                <Text
                  style={
                    styles.generatorSubtitle
                  }
                >
                  Select a scheduled date
                  from the next 14 days.
                </Text>
              </View>


              <View
                style={
                  styles.daysBadge
                }
              >
                <Text
                  style={
                    styles.daysBadgeText
                  }
                >
                  Next 14 days
                </Text>
              </View>
            </View>


            {eligibleDates.length ===
            0 ? (

              <View
                style={
                  styles.noDatesCard
                }
              >
                <Text
                  style={
                    styles.noDatesIcon
                  }
                >
                  📅
                </Text>

                <View
                  style={{ flex: 1 }}
                >
                  <Text
                    style={
                      styles.noDatesTitle
                    }
                  >
                    No scheduled dates
                  </Text>

                  <Text
                    style={
                      styles.noDatesText
                    }
                  >
                    Add a weekly schedule
                    first to generate
                    appointment slots.
                  </Text>
                </View>
              </View>

            ) : (
              <>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={
                    false
                  }
                  contentContainerStyle={
                    styles.dateList
                  }
                >
                  {eligibleDates.map(
                    (option) => {

                      const selected =
                        option.value ===
                        effectiveGenerateDate;


                      return (
                        <Pressable
                          key={
                            option.value
                          }
                          disabled={
                            generatingSlots
                          }
                          onPress={() => {
                            setSelectedGenerateDate(
                              option.value
                            );

                            clearGenerationResult();
                          }}
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
                            {
                              option.shortDay
                            }
                          </Text>

                          <Text
                            style={[
                              styles.dateNumber,

                              selected &&
                                styles.dateTextSelected,
                            ]}
                          >
                            {
                              option.dayNumber
                            }
                          </Text>

                          <Text
                            style={[
                              styles.dateMonth,

                              selected &&
                                styles.dateTextSelected,
                            ]}
                          >
                            {
                              option.month
                            }
                          </Text>
                        </Pressable>
                      );
                    }
                  )}
                </ScrollView>


                <View
                  style={
                    styles.selectedDateInfo
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.selectedDateLabel
                      }
                    >
                      SELECTED DATE
                    </Text>

                    <Text
                      style={
                        styles.selectedDateValue
                      }
                    >
                      {formatLongDate(
                        effectiveGenerateDate
                      )}
                    </Text>
                  </View>


                  <Pressable
                    disabled={
                      generatingSlots
                    }
                    onPress={
                      handleGenerateSlots
                    }
                    style={[
                      styles.generateButton,

                      generatingSlots &&
                        styles.disabledButton,
                    ]}
                  >
                    {generatingSlots ? (
                      <ActivityIndicator
                        size="small"
                        color="#FFFFFF"
                      />
                    ) : (
                      <Text
                        style={
                          styles.generateButtonText
                        }
                      >
                        Generate Slots
                      </Text>
                    )}
                  </Pressable>
                </View>

              </>
            )}


            {/* GENERATION ERROR */}

            {generationError ? (
              <View
                style={
                  styles.generationError
                }
              >
                <Text
                  style={
                    styles.generationErrorTitle
                  }
                >
                  Unable to Generate Slots
                </Text>

                <Text
                  style={
                    styles.generationErrorText
                  }
                >
                  {generationError}
                </Text>
              </View>
            ) : null}


            {/* GENERATION SUCCESS */}

            {generationSuccess ? (
              <View
                style={
                  styles.generationSuccess
                }
              >
                <Text
                  style={
                    styles.generationSuccessTitle
                  }
                >
                  ✓ Slots Generated
                </Text>

                <Text
                  style={
                    styles.generationSuccessText
                  }
                >
                  {
                    generationSuccess
                  }
                </Text>


                {generatedSlots.length >
                0 ? (

                  <View
                    style={
                      styles.generatedSlotList
                    }
                  >
                    {generatedSlots.map(
                      (
                        slot,
                        index
                      ) => (
                        <View
                          key={`${slot.start_time}-${index}`}
                          style={
                            styles.generatedSlotChip
                          }
                        >
                          <Text
                            style={
                              styles.generatedSlotText
                            }
                          >
                            {formatTime(
                              slot.start_time
                            )}
                          </Text>
                        </View>
                      )
                    )}
                  </View>

                ) : null}

              </View>
            ) : null}


            <View
              style={
                styles.slotNotice
              }
            >
              <Text
                style={
                  styles.slotNoticeIcon
                }
              >
                ℹ
              </Text>

              <Text
                style={
                  styles.slotNoticeText
                }
              >
                Slots are generated for
                one specific date. Once
                generated, the same date
                cannot be generated again.
              </Text>
            </View>

          </View>


          {/* ===================================================
              WEEKLY SCHEDULE HEADER
          ==================================================== */}

          <View
            style={
              styles.sectionHeader
            }
          >

            <View
              style={
                styles.sectionText
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Weekly Schedule
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Recurring weekly
                availability •{" "}
                {schedules.length} active{" "}
                {schedules.length === 1
                  ? "day"
                  : "days"}
              </Text>
            </View>


            <Pressable
              style={[
                styles.addButton,

                availableDays.length ===
                  0 &&
                  styles.disabledButton,
              ]}
              disabled={
                availableDays.length ===
                0
              }
              onPress={
                openAddModal
              }
            >
              <Text
                style={
                  styles.addButtonText
                }
              >
                + Add
              </Text>
            </Pressable>

          </View>


          {/* EMPTY */}

          {schedules.length === 0 ? (

            <View
              style={
                styles.emptyCard
              }
            >
              <Text
                style={
                  styles.emptyIcon
                }
              >
                📅
              </Text>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                No schedule added
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                Add your weekly
                availability so
                appointment slots can
                be generated.
              </Text>

              <Pressable
                style={
                  styles.emptyAddButton
                }
                onPress={
                  openAddModal
                }
              >
                <Text
                  style={
                    styles.emptyAddButtonText
                  }
                >
                  Add Schedule
                </Text>
              </Pressable>
            </View>

          ) : (

            <View
              style={
                styles.scheduleList
              }
            >

              {schedules.map(
                (schedule) => {

                  const removing =
                    removingId ===
                    schedule.id;


                  return (
                    <View
                      key={
                        schedule.id
                      }
                      style={
                        styles.scheduleCard
                      }
                    >

                      <View
                        style={
                          styles.scheduleTop
                        }
                      >

                        <View>
                          <Text
                            style={
                              styles.dayText
                            }
                          >
                            {
                              schedule.day_of_week
                            }
                          </Text>

                          <Text
                            style={
                              styles.recurringText
                            }
                          >
                            Every{" "}
                            {
                              schedule.day_of_week
                            }
                          </Text>

                          <Text
                            style={
                              styles.timeText
                            }
                          >
                            {formatTime(
                              schedule.start_time
                            )}

                            {"  →  "}

                            {formatTime(
                              schedule.end_time
                            )}
                          </Text>
                        </View>


                        <View
                          style={
                            styles.activeBadge
                          }
                        >
                          <Text
                            style={
                              styles.activeText
                            }
                          >
                            Active
                          </Text>
                        </View>

                      </View>


                      <View
                        style={
                          styles.divider
                        }
                      />


                      <View
                        style={
                          styles.scheduleBottom
                        }
                      >

                        <View>
                          <Text
                            style={
                              styles.infoLabel
                            }
                          >
                            SLOT DURATION
                          </Text>

                          <Text
                            style={
                              styles.infoValue
                            }
                          >
                            {
                              schedule.slot_duration_minutes
                            }{" "}
                            minutes
                          </Text>
                        </View>


                        <View
                          style={
                            styles.actionButtons
                          }
                        >

                          <Pressable
                            disabled={
                              removing
                            }
                            style={[
                              styles.editButton,

                              removing &&
                                styles.disabledButton,
                            ]}
                            onPress={() =>
                              openEditModal(
                                schedule
                              )
                            }
                          >
                            <Text
                              style={
                                styles.editButtonText
                              }
                            >
                              Edit
                            </Text>
                          </Pressable>


                          <Pressable
                            disabled={
                              removing
                            }
                            style={[
                              styles.removeButton,

                              removing &&
                                styles.disabledButton,
                            ]}
                            onPress={() =>
                              handleRemoveSchedule(
                                schedule
                              )
                            }
                          >

                            {removing ? (
                              <ActivityIndicator
                                size="small"
                              />
                            ) : (
                              <Text
                                style={
                                  styles.removeButtonText
                                }
                              >
                                Remove
                              </Text>
                            )}

                          </Pressable>

                        </View>

                      </View>

                    </View>
                  );
                }
              )}

            </View>
          )}

        </View>

      </ScrollView>


      {/* ======================================================
          ADD / EDIT MODAL
      ======================================================= */}

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

        <KeyboardAvoidingView
          style={
            styles.modalOverlay
          }
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >

          <Pressable
            style={
              styles.modalBackdrop
            }
            onPress={
              closeModal
            }
          />


          <View
            style={
              styles.modalWrapper
            }
          >

            <ScrollView
              style={
                styles.modalCard
              }
              contentContainerStyle={
                styles.modalContent
              }
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={
                false
              }
            >

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
                    {editingSchedule
                      ? "Edit Schedule"
                      : "Add Schedule"}
                  </Text>

                  <Text
                    style={
                      styles.modalSubtitle
                    }
                  >
                    {editingSchedule
                      ? "Update your recurring weekly availability"
                      : "Add a recurring weekly availability"}
                  </Text>
                </View>


                <Pressable
                  style={
                    styles.closeButton
                  }
                  disabled={
                    saving
                  }
                  onPress={
                    closeModal
                  }
                >
                  <Text
                    style={
                      styles.closeButtonText
                    }
                  >
                    ×
                  </Text>
                </Pressable>

              </View>


              {/* DAY */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Working Day
              </Text>


              <View
                style={
                  styles.dayGrid
                }
              >

                {DAYS.map(
                  (day) => {

                    const ownDay =
                      editingSchedule
                        ?.day_of_week ===
                      day;

                    const alreadyUsed =
                      activeDays.has(
                        day
                      ) &&
                      !ownDay;

                    const selected =
                      selectedDay ===
                      day;


                    return (
                      <Pressable
                        key={day}
                        disabled={
                          alreadyUsed ||
                          saving
                        }
                        onPress={() =>
                          setSelectedDay(
                            day
                          )
                        }
                        style={[
                          styles.dayButton,

                          selected &&
                            styles.dayButtonSelected,

                          alreadyUsed &&
                            styles.dayButtonDisabled,
                        ]}
                      >

                        <Text
                          style={[
                            styles.dayButtonText,

                            selected &&
                              styles.dayButtonTextSelected,

                            alreadyUsed &&
                              styles.dayButtonTextDisabled,
                          ]}
                        >
                          {day}
                        </Text>


                        {alreadyUsed ? (
                          <Text
                            style={
                              styles.dayUsedText
                            }
                          >
                            Added
                          </Text>
                        ) : null}

                      </Pressable>
                    );
                  }
                )}

              </View>


              {/* START */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Start Time
              </Text>

              <TextInput
                value={
                  startTime
                }
                onChangeText={
                  setStartTime
                }
                editable={
                  !saving
                }
                placeholder="09:00"
                placeholderTextColor="#94A3B8"
                style={
                  styles.input
                }
                maxLength={5}
              />

              <Text
                style={
                  styles.helperText
                }
              >
                Use 24-hour HH:MM
                format. Example: 09:00
              </Text>


              {/* END */}

              <Text
                style={[
                  styles.fieldLabel,
                  styles.fieldSpacing,
                ]}
              >
                End Time
              </Text>

              <TextInput
                value={
                  endTime
                }
                onChangeText={
                  setEndTime
                }
                editable={
                  !saving
                }
                placeholder="13:00"
                placeholderTextColor="#94A3B8"
                style={
                  styles.input
                }
                maxLength={5}
              />

              <Text
                style={
                  styles.helperText
                }
              >
                Example: 17:30 for
                5:30 PM
              </Text>


              {/* DURATION */}

              <Text
                style={[
                  styles.fieldLabel,
                  styles.fieldSpacing,
                ]}
              >
                Slot Duration
              </Text>


              <View
                style={
                  styles.durationRow
                }
              >

                <TextInput
                  value={
                    slotDuration
                  }
                  onChangeText={
                    setSlotDuration
                  }
                  editable={
                    !saving
                  }
                  keyboardType="number-pad"
                  placeholder="30"
                  placeholderTextColor="#94A3B8"
                  style={[
                    styles.input,
                    styles.durationInput,
                  ]}
                />


                <View
                  style={
                    styles.minutesBadge
                  }
                >
                  <Text
                    style={
                      styles.minutesBadgeText
                    }
                  >
                    minutes
                  </Text>
                </View>

              </View>


              <View
                style={
                  styles.infoNotice
                }
              >
                <Text
                  style={
                    styles.infoNoticeIcon
                  }
                >
                  ℹ
                </Text>

                <Text
                  style={
                    styles.infoNoticeText
                  }
                >
                  This schedule repeats
                  every week. Appointment
                  slots for actual dates
                  are generated separately.
                </Text>
              </View>


              <View
                style={
                  styles.modalActions
                }
              >

                <Pressable
                  disabled={
                    saving
                  }
                  onPress={
                    closeModal
                  }
                  style={[
                    styles.cancelButton,

                    saving &&
                      styles.disabledButton,
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
                  disabled={
                    saving
                  }
                  onPress={
                    handleSaveSchedule
                  }
                  style={[
                    styles.saveButton,

                    saving &&
                      styles.disabledButton,
                  ]}
                >

                  {saving ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <Text
                      style={
                        styles.saveButtonText
                      }
                    >
                      {editingSchedule
                        ? "Save Changes"
                        : "Add Schedule"}
                    </Text>
                  )}

                </Pressable>

              </View>

            </ScrollView>

          </View>

        </KeyboardAvoidingView>

      </Modal>

    </View>
  );
}


// ============================================================
// HELPERS
// ============================================================

function timeToMinutes(
  value: string
) {
  const [
    hour,
    minute,
  ] = value
    .split(":")
    .map(Number);

  return (
    hour * 60 +
    minute
  );
}


function formatTime(
  value: string
) {
  const [
    hourText,
    minute,
  ] = value.split(":");

  const hour =
    Number(hourText);

  if (
    Number.isNaN(hour)
  ) {
    return value;
  }

  const period =
    hour >= 12
      ? "PM"
      : "AM";

  const displayHour =
    hour % 12 || 12;

  return `${displayHour}:${minute} ${period}`;
}


function createDateOptions(
  days: number
): DateOption[] {

  const result:
    DateOption[] = [];

  const today =
    new Date();

  today.setHours(
    12,
    0,
    0,
    0
  );


  for (
    let index = 0;
    index < days;
    index += 1
  ) {

    const current =
      new Date(today);

    current.setDate(
      today.getDate() +
        index
    );


    result.push({
      value:
        formatLocalDateValue(
          current
        ),

      dayName:
        current.toLocaleDateString(
          "en-US",
          {
            weekday: "long",
          }
        ),

      shortDay:
        current.toLocaleDateString(
          "en-US",
          {
            weekday: "short",
          }
        ),

      dayNumber:
        String(
          current.getDate()
        ),

      month:
        current.toLocaleDateString(
          "en-US",
          {
            month: "short",
          }
        ),
    });
  }


  return result;
}


function formatLocalDateValue(
  value: Date
) {

  const year =
    value.getFullYear();

  const month =
    String(
      value.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      value.getDate()
    ).padStart(
      2,
      "0"
    );


  return `${year}-${month}-${day}`;
}


function formatLongDate(
  value: string
) {

  if (!value) {
    return "";
  }


  const parts =
    value
      .split("-")
      .map(Number);


  if (
    parts.length !== 3
  ) {
    return value;
  }


  const [
    year,
    month,
    day,
  ] = parts;


  const date =
    new Date(
      year,
      month - 1,
      day,
      12
    );


  return date.toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  );
}


function showMessage(
  title: string,
  message: string
) {

  if (
    Platform.OS === "web" &&
    typeof window !==
      "undefined"
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
}


// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor: "#F4F7FB",
    },

    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#F4F7FB",
    },

    loadingText: {
      marginTop: 12,
      color: "#64748B",
    },

    header: {
      backgroundColor: "#0F766E",
      paddingHorizontal: 18,
      paddingTop: 24,
      paddingBottom: 22,
      flexDirection: "row",
      alignItems: "center",
    },

    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor:
        "rgba(255,255,255,0.16)",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },

    backText: {
      color: "#FFFFFF",
      fontSize: 30,
      lineHeight: 32,
    },

    headerTitle: {
      color: "#FFFFFF",
      fontSize: 24,
      fontWeight: "800",
    },

    headerSubtitle: {
      color: "#CCFBF1",
      fontSize: 12,
      marginTop: 3,
    },

    content: {
      width: "100%",
      maxWidth: 900,
      alignSelf: "center",
      padding: 18,
    },


    // --------------------------------------------------------
    // GENERAL ERROR
    // --------------------------------------------------------

    errorCard: {
      backgroundColor: "#FEF2F2",
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
    },

    errorTitle: {
      color: "#991B1B",
      fontSize: 15,
      fontWeight: "800",
    },

    errorText: {
      color: "#B91C1C",
      fontSize: 13,
      marginTop: 4,
    },

    retryButton: {
      alignSelf: "flex-start",
      backgroundColor: "#FFFFFF",
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginTop: 10,
    },

    retryText: {
      color: "#991B1B",
      fontWeight: "700",
    },


    // --------------------------------------------------------
    // SLOT GENERATOR
    // --------------------------------------------------------

    generatorCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "#DDE7E6",
      padding: 18,
      marginBottom: 28,
    },

    generatorHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 18,
    },

    generatorHeadingArea: {
      flex: 1,
    },

    generatorTitle: {
      color: "#172033",
      fontSize: 18,
      fontWeight: "800",
    },

    generatorSubtitle: {
      color: "#64748B",
      fontSize: 12,
      marginTop: 4,
      lineHeight: 18,
    },

    daysBadge: {
      backgroundColor: "#F0FDFA",
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },

    daysBadgeText: {
      color: "#0F766E",
      fontSize: 10,
      fontWeight: "800",
    },

    dateList: {
      gap: 8,
      paddingBottom: 4,
    },

    dateCard: {
      minWidth: 68,
      borderWidth: 1,
      borderColor: "#CBD5E1",
      borderRadius: 12,
      backgroundColor: "#F8FAFC",
      paddingHorizontal: 12,
      paddingVertical: 10,
      alignItems: "center",
    },

    dateCardSelected: {
      backgroundColor: "#0F766E",
      borderColor: "#0F766E",
    },

    dateDay: {
      color: "#64748B",
      fontSize: 10,
      fontWeight: "700",
    },

    dateNumber: {
      color: "#172033",
      fontSize: 20,
      fontWeight: "900",
      marginTop: 2,
    },

    dateMonth: {
      color: "#64748B",
      fontSize: 10,
      marginTop: 1,
    },

    dateTextSelected: {
      color: "#FFFFFF",
    },

    selectedDateInfo: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 14,
      marginTop: 18,
    },

    selectedDateLabel: {
      color: "#94A3B8",
      fontSize: 9,
      fontWeight: "800",
    },

    selectedDateValue: {
      color: "#172033",
      fontSize: 13,
      fontWeight: "800",
      marginTop: 3,
    },

    generateButton: {
      backgroundColor: "#0F766E",
      borderRadius: 10,
      minWidth: 140,
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
    },

    generateButtonText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "800",
    },

    generationError: {
      backgroundColor: "#FEF2F2",
      borderRadius: 12,
      padding: 13,
      marginTop: 16,
    },

    generationErrorTitle: {
      color: "#991B1B",
      fontSize: 12,
      fontWeight: "800",
    },

    generationErrorText: {
      color: "#B91C1C",
      fontSize: 11,
      marginTop: 3,
    },

    generationSuccess: {
      backgroundColor: "#F0FDF4",
      borderRadius: 12,
      padding: 14,
      marginTop: 16,
    },

    generationSuccessTitle: {
      color: "#166534",
      fontSize: 13,
      fontWeight: "800",
    },

    generationSuccessText: {
      color: "#15803D",
      fontSize: 11,
      marginTop: 4,
      lineHeight: 17,
    },

    generatedSlotList: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
      marginTop: 12,
    },

    generatedSlotChip: {
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#BBF7D0",
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },

    generatedSlotText: {
      color: "#166534",
      fontSize: 10,
      fontWeight: "800",
    },

    slotNotice: {
      flexDirection: "row",
      backgroundColor: "#F8FAFC",
      borderRadius: 10,
      padding: 11,
      marginTop: 16,
    },

    slotNoticeIcon: {
      color: "#0F766E",
      fontWeight: "900",
      marginRight: 8,
    },

    slotNoticeText: {
      flex: 1,
      color: "#64748B",
      fontSize: 10,
      lineHeight: 15,
    },

    noDatesCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#F8FAFC",
      borderRadius: 12,
      padding: 14,
      gap: 12,
    },

    noDatesIcon: {
      fontSize: 24,
    },

    noDatesTitle: {
      color: "#172033",
      fontSize: 13,
      fontWeight: "800",
    },

    noDatesText: {
      color: "#64748B",
      fontSize: 11,
      marginTop: 3,
    },


    // --------------------------------------------------------
    // WEEKLY SCHEDULE
    // --------------------------------------------------------

    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
      gap: 12,
    },

    sectionText: {
      flex: 1,
    },

    sectionTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: "#172033",
    },

    sectionSubtitle: {
      marginTop: 3,
      color: "#64748B",
      fontSize: 13,
    },

    addButton: {
      backgroundColor: "#0F766E",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
    },

    addButtonText: {
      color: "#FFFFFF",
      fontWeight: "800",
    },

    disabledButton: {
      opacity: 0.5,
    },

    scheduleList: {
      gap: 12,
    },

    scheduleCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: "#E2E8F0",
    },

    scheduleTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },

    dayText: {
      fontSize: 17,
      fontWeight: "800",
      color: "#172033",
    },

    recurringText: {
      color: "#0F766E",
      fontSize: 11,
      fontWeight: "700",
      marginTop: 3,
    },

    timeText: {
      marginTop: 6,
      color: "#475569",
      fontSize: 14,
      fontWeight: "600",
    },

    activeBadge: {
      backgroundColor: "#DCFCE7",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },

    activeText: {
      color: "#166534",
      fontSize: 11,
      fontWeight: "800",
    },

    divider: {
      height: 1,
      backgroundColor: "#E2E8F0",
      marginVertical: 14,
    },

    scheduleBottom: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },

    infoLabel: {
      color: "#94A3B8",
      fontSize: 10,
      fontWeight: "800",
    },

    infoValue: {
      color: "#172033",
      fontSize: 14,
      fontWeight: "700",
      marginTop: 3,
    },

    actionButtons: {
      flexDirection: "row",
      gap: 8,
    },

    editButton: {
      backgroundColor: "#EFF6FF",
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: 8,
      minWidth: 62,
      alignItems: "center",
    },

    editButtonText: {
      color: "#2563EB",
      fontSize: 11,
      fontWeight: "800",
    },

    removeButton: {
      backgroundColor: "#FEF2F2",
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: 8,
      minWidth: 72,
      alignItems: "center",
    },

    removeButtonText: {
      color: "#DC2626",
      fontSize: 11,
      fontWeight: "800",
    },

    emptyCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      padding: 28,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#E2E8F0",
    },

    emptyIcon: {
      fontSize: 34,
    },

    emptyTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: "#172033",
      marginTop: 10,
    },

    emptyText: {
      color: "#64748B",
      fontSize: 13,
      textAlign: "center",
      marginTop: 6,
      maxWidth: 340,
      lineHeight: 19,
    },

    emptyAddButton: {
      backgroundColor: "#0F766E",
      paddingHorizontal: 18,
      paddingVertical: 11,
      borderRadius: 10,
      marginTop: 16,
    },

    emptyAddButtonText: {
      color: "#FFFFFF",
      fontWeight: "800",
    },


    // --------------------------------------------------------
    // MODAL
    // --------------------------------------------------------

    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },

    modalBackdrop: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor:
        "rgba(15, 23, 42, 0.55)",
    },

    modalWrapper: {
      width: "100%",
      maxWidth: 620,
      maxHeight: "92%",
      paddingHorizontal: 18,
    },

    modalCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 20,
    },

    modalContent: {
      padding: 22,
    },

    modalHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 22,
    },

    modalTitle: {
      color: "#172033",
      fontSize: 22,
      fontWeight: "800",
    },

    modalSubtitle: {
      color: "#64748B",
      fontSize: 12,
      marginTop: 4,
    },

    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "#F1F5F9",
      alignItems: "center",
      justifyContent: "center",
    },

    closeButtonText: {
      fontSize: 25,
      color: "#475569",
      lineHeight: 27,
    },

    fieldLabel: {
      color: "#172033",
      fontSize: 13,
      fontWeight: "800",
      marginBottom: 8,
    },

    fieldSpacing: {
      marginTop: 18,
    },

    dayGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 20,
    },

    dayButton: {
      borderWidth: 1,
      borderColor: "#CBD5E1",
      backgroundColor: "#FFFFFF",
      borderRadius: 10,
      paddingHorizontal: 13,
      paddingVertical: 9,
      minWidth: 92,
      alignItems: "center",
    },

    dayButtonSelected: {
      borderColor: "#0F766E",
      backgroundColor: "#ECFDF5",
    },

    dayButtonDisabled: {
      backgroundColor: "#F1F5F9",
      borderColor: "#E2E8F0",
    },

    dayButtonText: {
      color: "#475569",
      fontSize: 12,
      fontWeight: "700",
    },

    dayButtonTextSelected: {
      color: "#0F766E",
      fontWeight: "800",
    },

    dayButtonTextDisabled: {
      color: "#94A3B8",
    },

    dayUsedText: {
      color: "#94A3B8",
      fontSize: 9,
      marginTop: 2,
    },

    input: {
      borderWidth: 1,
      borderColor: "#CBD5E1",
      backgroundColor: "#F8FAFC",
      borderRadius: 11,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 15,
      color: "#172033",
    },

    helperText: {
      color: "#94A3B8",
      fontSize: 10,
      marginTop: 6,
    },

    durationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    durationInput: {
      flex: 1,
    },

    minutesBadge: {
      backgroundColor: "#F1F5F9",
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },

    minutesBadgeText: {
      color: "#475569",
      fontSize: 12,
      fontWeight: "700",
    },

    infoNotice: {
      flexDirection: "row",
      backgroundColor: "#F0FDFA",
      borderRadius: 12,
      padding: 13,
      marginTop: 20,
    },

    infoNoticeIcon: {
      color: "#0F766E",
      fontWeight: "900",
      marginRight: 9,
    },

    infoNoticeText: {
      flex: 1,
      color: "#475569",
      fontSize: 11,
      lineHeight: 17,
    },

    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: 24,
    },

    cancelButton: {
      borderWidth: 1,
      borderColor: "#CBD5E1",
      backgroundColor: "#FFFFFF",
      borderRadius: 10,
      paddingHorizontal: 18,
      paddingVertical: 12,
      alignItems: "center",
    },

    cancelButtonText: {
      color: "#475569",
      fontWeight: "800",
    },

    saveButton: {
      minWidth: 130,
      backgroundColor: "#0F766E",
      borderRadius: 10,
      paddingHorizontal: 18,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
    },

    saveButtonText: {
      color: "#FFFFFF",
      fontWeight: "800",
    },
  });