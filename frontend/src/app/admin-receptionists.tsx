import React, {
  useCallback,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
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

type Receptionist = {
  id: number;

  name: string;

  email: string;

  role: string;

  status:
    | "active"
    | "inactive";

  email_verified?: boolean;

  must_change_password?: boolean;

  created_at?: string | null;
};


// ============================================================
// SCREEN
// ============================================================

export default function AdminReceptionistsScreen() {

  const router =
    useRouter();


  const {
    width,
  } =
    useWindowDimensions();


  const compact =
    width < 700;


  // =========================================================
  // DATA
  // =========================================================

  const [
    receptionists,
    setReceptionists,
  ] =
    useState<
      Receptionist[]
    >([]);


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
    error,
    setError,
  ] =
    useState("");


  // =========================================================
  // MODAL
  // =========================================================

  const [
    modalVisible,
    setModalVisible,
  ] =
    useState(false);


  const [
    saving,
    setSaving,
  ] =
    useState(false);


  // =========================================================
  // FORM
  // =========================================================

  const [
    name,
    setName,
  ] =
    useState("");


  const [
    email,
    setEmail,
  ] =
    useState("");


  const [
    password,
    setPassword,
  ] =
    useState("");


  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);


  // =========================================================
  // LOAD RECEPTIONISTS
  // =========================================================

  const loadReceptionists =
    useCallback(
      async () => {

        try {

          setError(
            ""
          );


          const response =
            await apiRequest(
              "/api/admin/receptionists"
            );


          setReceptionists(
            Array.isArray(
              response?.receptionists
            )
              ? response.receptionists
              : []
          );

        } catch (
          err: any
        ) {

          setError(
            err?.message ||
              "Unable to load receptionists."
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

        loadReceptionists();

      },
      [
        loadReceptionists,
      ]
    )
  );


  // =========================================================
  // REFRESH
  // =========================================================

  const onRefresh = () => {

    setRefreshing(
      true
    );

    loadReceptionists();
  };


  // =========================================================
  // RESET FORM
  // =========================================================

  const resetForm = () => {

    setName(
      ""
    );

    setEmail(
      ""
    );

    setPassword(
      ""
    );

    setShowPassword(
      false
    );
  };


  // =========================================================
  // CLOSE MODAL
  // =========================================================

  const closeModal = () => {

    if (saving) {
      return;
    }


    setModalVisible(
      false
    );


    resetForm();
  };


  // =========================================================
  // MESSAGE
  // =========================================================

  const showMessage = (
    title: string,
    message: string
  ) => {

    if (
      Platform.OS === "web"
      &&
      typeof window !== "undefined"
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
  };


  // =========================================================
  // CREATE RECEPTIONIST
  // =========================================================

  const handleCreateReceptionist =
    async () => {

      const cleanName =
        name.trim();


      const cleanEmail =
        email
          .trim()
          .toLowerCase();


      // ------------------------------------------------------
      // REQUIRED FIELDS
      // ------------------------------------------------------

      if (
        !cleanName
        ||
        !cleanEmail
        ||
        !password
      ) {

        showMessage(
          "Required Fields",
          "Name, email and password are required."
        );

        return;
      }


      // ------------------------------------------------------
      // EMAIL
      // ------------------------------------------------------

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


      if (
        !emailRegex.test(
          cleanEmail
        )
      ) {

        showMessage(
          "Invalid Email",
          "Please enter a valid email address."
        );

        return;
      }


      // ------------------------------------------------------
      // PASSWORD
      // ------------------------------------------------------

      if (
        password.length < 8
      ) {

        showMessage(
          "Weak Password",
          "Password must be at least 8 characters long."
        );

        return;
      }


      // ------------------------------------------------------
      // CREATE
      // ------------------------------------------------------

      try {

        setSaving(
          true
        );


        await apiRequest(
          "/api/admin/receptionists",
          {
            method:
              "POST",

            body:
              JSON.stringify({
                name:
                  cleanName,

                email:
                  cleanEmail,

                password,
              }),
          }
        );


        setModalVisible(
          false
        );


        resetForm();


        await loadReceptionists();


        showMessage(
          "Receptionist Created",
          "Receptionist account created successfully."
        );

      } catch (
        err: any
      ) {

        showMessage(
          "Unable to Create Receptionist",
          err?.message ||
            "Please try again."
        );

      } finally {

        setSaving(
          false
        );
      }
    };


  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {

    return (

      <View
        style={
          styles.centerContainer
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
          Loading receptionists...
        </Text>

      </View>
    );
  }


  // =========================================================
  // UI
  // =========================================================

  return (

    <View
      style={
        styles.screen
      }
    >

      <ScrollView
        contentContainerStyle={
          styles.scrollContent
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

        showsVerticalScrollIndicator={
          false
        }
      >

        <View
          style={
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
                color="#0F766E"
              />

            </Pressable>


            <View
              style={
                styles.headerContent
              }
            >

              <Text
                style={
                  styles.headerTitle
                }
              >
                Manage Receptionists
              </Text>


              <Text
                style={
                  styles.headerSubtitle
                }
              >
                View and create receptionist accounts
              </Text>

            </View>


            <Pressable
              onPress={
                () => {

                  resetForm();

                  setModalVisible(
                    true
                  );
                }
              }

              style={({
                pressed,
              }) => [
                styles.addButton,

                pressed &&
                  styles.pressed,
              ]}
            >

              <Ionicons
                name="add"
                size={18}
                color="#FFFFFF"
              />


              {
                !compact
                  ? (

                    <Text
                      style={
                        styles.addButtonText
                      }
                    >
                      Add Receptionist
                    </Text>

                  )
                  : null
              }

            </Pressable>

          </View>


          {/* =================================================
              SUMMARY
          ================================================= */}

          <View
            style={
              styles.summaryCard
            }
          >

            <View
              style={
                styles.summaryIcon
              }
            >

              <Ionicons
                name=
                  "desktop-outline"

                size={24}

                color="#0F766E"
              />

            </View>


            <View>

              <Text
                style={
                  styles.summaryValue
                }
              >
                {
                  receptionists.length
                }
              </Text>


              <Text
                style={
                  styles.summaryLabel
                }
              >
                Registered Receptionists
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

                  <Text
                    style={
                      styles.errorTitle
                    }
                  >
                    Unable to load receptionists
                  </Text>


                  <Text
                    style={
                      styles.errorText
                    }
                  >
                    {error}
                  </Text>


                  <Pressable
                    onPress={
                      loadReceptionists
                    }

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

              )
              : null
          }


          {/* =================================================
              LIST
          ================================================= */}

          <Text
            style={
              styles.sectionTitle
            }
          >
            Receptionist Accounts
          </Text>


          <Text
            style={
              styles.sectionSubtitle
            }
          >
            Front desk staff registered by the administrator
          </Text>


          {
            receptionists.length === 0
              ? (

                <View
                  style={
                    styles.emptyCard
                  }
                >

                  <Ionicons
                    name=
                      "desktop-outline"

                    size={35}

                    color="#94A3B8"
                  />


                  <Text
                    style={
                      styles.emptyTitle
                    }
                  >
                    No Receptionists Yet
                  </Text>


                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    Add your first receptionist account.
                  </Text>

                </View>

              )
              : (

                receptionists.map(
                  (
                    receptionist
                  ) => (

                    <ReceptionistCard
                      key={
                        receptionist.id
                      }

                      receptionist={
                        receptionist
                      }
                    />

                  )
                )

              )
          }

        </View>

      </ScrollView>


      {/* =====================================================
          ADD RECEPTIONIST MODAL
      ===================================================== */}

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

        <View
          style={
            styles.modalBackdrop
          }
        >

          <View
            style={
              styles.modalWrapper
            }
          >

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }

              keyboardShouldPersistTaps=
                "handled"
            >

              {/* =============================================
                  HEADER
              ============================================= */}

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
                    Add Receptionist
                  </Text>


                  <Text
                    style={
                      styles.modalSubtitle
                    }
                  >
                    Create a new front desk account
                  </Text>

                </View>


                <Pressable
                  onPress={
                    closeModal
                  }

                  disabled={
                    saving
                  }

                  style={
                    styles.closeButton
                  }
                >

                  <Ionicons
                    name="close"
                    size={22}
                    color="#64748B"
                  />

                </Pressable>

              </View>


              {/* =============================================
                  FULL NAME
              ============================================= */}

              <Text
                style={
                  styles.formLabel
                }
              >
                Full Name *
              </Text>


              <TextInput
                value={
                  name
                }

                onChangeText={
                  setName
                }

                placeholder=
                  "Receptionist Sara"

                placeholderTextColor=
                  "#94A3B8"

                editable={
                  !saving
                }

                style={
                  styles.input
                }
              />


              {/* =============================================
                  EMAIL
              ============================================= */}

              <Text
                style={
                  styles.formLabel
                }
              >
                Email *
              </Text>


              <TextInput
                value={
                  email
                }

                onChangeText={
                  setEmail
                }

                placeholder=
                  "receptionist@gmail.com"

                placeholderTextColor=
                  "#94A3B8"

                autoCapitalize=
                  "none"

                autoCorrect={
                  false
                }

                keyboardType=
                  "email-address"

                editable={
                  !saving
                }

                style={
                  styles.input
                }
              />


              {/* =============================================
                  PASSWORD WITH EYE
              ============================================= */}

              <Text
                style={
                  styles.formLabel
                }
              >
                Password *
              </Text>


              <View
                style={
                  styles.passwordContainer
                }
              >

                <TextInput
                  value={
                    password
                  }

                  onChangeText={
                    setPassword
                  }

                  placeholder=
                    "Minimum 8 characters"

                  placeholderTextColor=
                    "#94A3B8"

                  secureTextEntry={
                    !showPassword
                  }

                  autoCapitalize=
                    "none"

                  autoCorrect={
                    false
                  }

                  editable={
                    !saving
                  }

                  style={
                    styles.passwordInput
                  }
                />


                <Pressable
                  disabled={
                    saving
                  }

                  onPress={
                    () =>
                      setShowPassword(
                        (
                          current
                        ) =>
                          !current
                      )
                  }

                  style={({
                    pressed,
                  }) => [
                    styles.eyeButton,

                    pressed &&
                      styles.eyePressed,
                  ]}
                >

                  <Ionicons
                    name={
                      showPassword
                        ? "eye-off-outline"
                        : "eye-outline"
                    }

                    size={21}

                    color="#64748B"
                  />

                </Pressable>

              </View>


              {/* =============================================
                  INFO
              ============================================= */}

              <View
                style={
                  styles.infoCard
                }
              >

                <Ionicons
                  name=
                    "information-circle-outline"

                  size={20}

                  color="#0F766E"
                />


                <Text
                  style={
                    styles.infoText
                  }
                >
                  The password created by the administrator is temporary. The receptionist will be required to change it on first login.
                </Text>

              </View>


              {/* =============================================
                  CREATE BUTTON
              ============================================= */}

              <Pressable
                onPress={
                  handleCreateReceptionist
                }

                disabled={
                  saving
                }

                style={({
                  pressed,
                }) => [
                  styles.saveButton,

                  saving &&
                    styles.disabled,

                  pressed &&
                    !saving &&
                    styles.pressed,
                ]}
              >

                {
                  saving
                    ? (

                      <ActivityIndicator
                        color="#FFFFFF"
                      />

                    )
                    : (

                      <>

                        <Ionicons
                          name=
                            "person-add-outline"

                          size={18}

                          color="#FFFFFF"
                        />


                        <Text
                          style={
                            styles.saveButtonText
                          }
                        >
                          Create Receptionist
                        </Text>

                      </>

                    )
                }

              </Pressable>

            </ScrollView>

          </View>

        </View>

      </Modal>

    </View>
  );
}


// ============================================================
// RECEPTIONIST CARD
// ============================================================

function ReceptionistCard({
  receptionist,
}: {
  receptionist: Receptionist;
}) {

  const initials =
    receptionist.name
      .split(" ")
      .filter(Boolean)
      .slice(
        0,
        2
      )
      .map(
        (
          part
        ) =>
          part.charAt(0)
      )
      .join("")
      .toUpperCase();


  return (

    <View
      style={
        styles.receptionistCard
      }
    >

      <View
        style={
          styles.avatar
        }
      >

        <Text
          style={
            styles.avatarText
          }
        >
          {initials || "RC"}
        </Text>

      </View>


      <View
        style={
          styles.receptionistContent
        }
      >

        <View
          style={
            styles.topRow
          }
        >

          <View
            style={{
              flex: 1,
            }}
          >

            <Text
              style={
                styles.receptionistName
              }
            >
              {receptionist.name}
            </Text>


            <Text
              style={
                styles.roleText
              }
            >
              Receptionist
            </Text>

          </View>


          <View
            style={[
              styles.statusBadge,

              receptionist.status ===
              "active"
                ? styles.activeBadge
                : styles.inactiveBadge,
            ]}
          >

            <Text
              style={[
                styles.statusBadgeText,

                receptionist.status ===
                "active"
                  ? styles.activeText
                  : styles.inactiveText,
              ]}
            >
              {
                receptionist.status ===
                "active"
                  ? "Active"
                  : "Inactive"
              }
            </Text>

          </View>

        </View>


        <Text
          style={
            styles.emailText
          }
        >
          {receptionist.email}
        </Text>

      </View>

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


    scrollContent: {
      flexGrow: 1,
    },


    container: {
      width: "100%",

      maxWidth: 1050,

      alignSelf:
        "center",

      paddingHorizontal: 18,

      paddingTop: 22,

      paddingBottom: 35,
    },


    centerContainer: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#F6F8FB",
    },


    loadingText: {
      color:
        "#64748B",

      fontSize: 12,

      marginTop: 10,
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

      borderWidth: 1,

      borderColor:
        "#E5EAF0",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 12,
    },


    headerContent: {
      flex: 1,
    },


    headerTitle: {
      color:
        "#172033",

      fontSize: 21,

      fontWeight:
        "900",
    },


    headerSubtitle: {
      color:
        "#94A3B8",

      fontSize: 10,

      marginTop: 3,
    },


    addButton: {
      height: 42,

      paddingHorizontal: 14,

      borderRadius: 12,

      backgroundColor:
        "#0F766E",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 6,
    },


    addButtonText: {
      color:
        "#FFFFFF",

      fontSize: 11,

      fontWeight:
        "800",
    },


    // ========================================================
    // SUMMARY
    // ========================================================

    summaryCard: {
      backgroundColor:
        "#ECFDF5",

      borderWidth: 1,

      borderColor:
        "#CCFBF1",

      borderRadius: 16,

      padding: 16,

      flexDirection:
        "row",

      alignItems:
        "center",

      marginBottom: 22,
    },


    summaryIcon: {
      width: 48,

      height: 48,

      borderRadius: 14,

      backgroundColor:
        "#FFFFFF",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 13,
    },


    summaryValue: {
      color:
        "#134E4A",

      fontSize: 22,

      fontWeight:
        "900",
    },


    summaryLabel: {
      color:
        "#52716E",

      fontSize: 10,

      marginTop: 2,
    },


    // ========================================================
    // SECTION
    // ========================================================

    sectionTitle: {
      color:
        "#172033",

      fontSize: 16,

      fontWeight:
        "900",
    },


    sectionSubtitle: {
      color:
        "#94A3B8",

      fontSize: 10,

      marginTop: 3,

      marginBottom: 12,
    },


    // ========================================================
    // RECEPTIONIST CARD
    // ========================================================

    receptionistCard: {
      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "#E5EAF0",

      borderRadius: 16,

      padding: 15,

      flexDirection:
        "row",

      marginBottom: 10,
    },


    avatar: {
      width: 48,

      height: 48,

      borderRadius: 15,

      backgroundColor:
        "#CCFBF1",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 13,
    },


    avatarText: {
      color:
        "#0F766E",

      fontSize: 13,

      fontWeight:
        "900",
    },


    receptionistContent: {
      flex: 1,
    },


    topRow: {
      flexDirection:
        "row",

      alignItems:
        "flex-start",

      gap: 10,
    },


    receptionistName: {
      color:
        "#172033",

      fontSize: 13,

      fontWeight:
        "900",
    },


    roleText: {
      color:
        "#0F766E",

      fontSize: 10,

      fontWeight:
        "700",

      marginTop: 3,
    },


    emailText: {
      color:
        "#64748B",

      fontSize: 10,

      marginTop: 6,
    },


    statusBadge: {
      paddingHorizontal: 9,

      paddingVertical: 5,

      borderRadius: 20,
    },


    activeBadge: {
      backgroundColor:
        "#DCFCE7",
    },


    inactiveBadge: {
      backgroundColor:
        "#F1F5F9",
    },


    statusBadgeText: {
      fontSize: 8,

      fontWeight:
        "900",
    },


    activeText: {
      color:
        "#15803D",
    },


    inactiveText: {
      color:
        "#64748B",
    },


    // ========================================================
    // EMPTY
    // ========================================================

    emptyCard: {
      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "#E5EAF0",

      borderRadius: 16,

      padding: 30,

      alignItems:
        "center",
    },


    emptyTitle: {
      color:
        "#334155",

      fontSize: 14,

      fontWeight:
        "900",

      marginTop: 10,
    },


    emptyText: {
      color:
        "#94A3B8",

      fontSize: 10,

      marginTop: 4,
    },


    // ========================================================
    // ERROR
    // ========================================================

    errorCard: {
      backgroundColor:
        "#FEF2F2",

      borderRadius: 14,

      padding: 15,

      marginBottom: 18,
    },


    errorTitle: {
      color:
        "#991B1B",

      fontWeight:
        "900",

      fontSize: 13,
    },


    errorText: {
      color:
        "#B91C1C",

      fontSize: 10,

      marginTop: 4,
    },


    retryButton: {
      alignSelf:
        "flex-start",

      backgroundColor:
        "#FFFFFF",

      borderRadius: 8,

      paddingHorizontal: 12,

      paddingVertical: 7,

      marginTop: 9,
    },


    retryText: {
      color:
        "#991B1B",

      fontSize: 10,

      fontWeight:
        "800",
    },


    // ========================================================
    // MODAL
    // ========================================================

    modalBackdrop: {
      position:
        "absolute",

      top: 0,

      right: 0,

      bottom: 0,

      left: 0,

      backgroundColor:
        "rgba(15, 23, 42, 0.55)",

      alignItems:
        "center",

      justifyContent:
        "center",

      padding: 16,
    },


    modalWrapper: {
      width: "100%",

      maxWidth: 520,

      maxHeight: "92%",

      backgroundColor:
        "#FFFFFF",

      borderRadius: 20,

      padding: 20,
    },


    modalHeader: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "flex-start",

      marginBottom: 18,
    },


    modalTitle: {
      color:
        "#172033",

      fontSize: 19,

      fontWeight:
        "900",
    },


    modalSubtitle: {
      color:
        "#94A3B8",

      fontSize: 10,

      marginTop: 3,
    },


    closeButton: {
      width: 36,

      height: 36,

      borderRadius: 10,

      backgroundColor:
        "#F8FAFC",

      alignItems:
        "center",

      justifyContent:
        "center",
    },


    formLabel: {
      color:
        "#334155",

      fontSize: 10,

      fontWeight:
        "800",

      marginBottom: 6,
    },


    input: {
      minHeight: 45,

      borderWidth: 1,

      borderColor:
        "#DDE4EC",

      backgroundColor:
        "#F8FAFC",

      borderRadius: 11,

      paddingHorizontal: 13,

      fontSize: 12,

      color:
        "#172033",

      marginBottom: 14,
    },


    // ========================================================
    // PASSWORD WITH EYE
    // ========================================================

    passwordContainer: {
      minHeight: 45,

      borderWidth: 1,

      borderColor:
        "#DDE4EC",

      backgroundColor:
        "#F8FAFC",

      borderRadius: 11,

      flexDirection:
        "row",

      alignItems:
        "center",

      marginBottom: 14,
    },


    passwordInput: {
      flex: 1,

      minHeight: 43,

      paddingLeft: 13,

      paddingRight: 4,

      fontSize: 12,

      color:
        "#172033",
    },


    eyeButton: {
      width: 48,

      minHeight: 43,

      alignItems:
        "center",

      justifyContent:
        "center",
    },


    eyePressed: {
      opacity: 0.5,
    },


    // ========================================================
    // INFO
    // ========================================================

    infoCard: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 8,

      backgroundColor:
        "#ECFDF5",

      borderRadius: 11,

      padding: 12,

      marginBottom: 16,
    },


    infoText: {
      flex: 1,

      color:
        "#52716E",

      fontSize: 10,

      lineHeight: 15,
    },


    // ========================================================
    // SAVE BUTTON
    // ========================================================

    saveButton: {
      minHeight: 47,

      backgroundColor:
        "#0F766E",

      borderRadius: 12,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 8,
    },


    saveButtonText: {
      color:
        "#FFFFFF",

      fontSize: 11,

      fontWeight:
        "900",
    },


    disabled: {
      opacity: 0.6,
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