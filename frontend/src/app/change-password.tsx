import React, {
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  type Href,
  router,
} from "expo-router";

import {
  apiRequest,
} from "../api/client";

import {
  getToken,
  getUser,
  saveAuth,
} from "../storage/authStorage";


// ============================================================
// ALERT HELPER
// ============================================================

function showMessage(
  title: string,
  message: string
) {
  if (
    Platform.OS === "web"
    && typeof window !== "undefined"
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
// HOME ROUTE
// ============================================================

function getHomeRoute(
  role?: string
): Href {

  if (role === "doctor") {
    return "/doctor";
  }

  if (role === "receptionist") {
    return "/receptionist";
  }

  return "/";
}


// ============================================================
// SCREEN
// ============================================================

export default function ChangePasswordScreen() {

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState("");

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] = useState(false);

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);


  // =========================================================
  // CHANGE PASSWORD
  // =========================================================

  async function handleChangePassword() {

    if (
      !currentPassword
      || !newPassword
      || !confirmPassword
    ) {
      showMessage(
        "Required",
        "Please complete all password fields."
      );

      return;
    }


    if (
      newPassword.length < 8
    ) {
      showMessage(
        "Invalid Password",
        "New password must be at least 8 characters long."
      );

      return;
    }


    if (
      newPassword !==
      confirmPassword
    ) {
      showMessage(
        "Password Mismatch",
        "New password and confirm password do not match."
      );

      return;
    }


    if (
      currentPassword ===
      newPassword
    ) {
      showMessage(
        "Invalid Password",
        "New password must be different from your temporary password."
      );

      return;
    }


    try {

      setLoading(
        true
      );


      await apiRequest(
        "/api/auth/change-password",
        {
          method: "PATCH",

          body: JSON.stringify({
            current_password:
              currentPassword,

            new_password:
              newPassword,
          }),
        }
      );


      // ------------------------------------------------------
      // UPDATE SAVED USER
      // ------------------------------------------------------

      const token =
        await getToken();

      const user =
        await getUser();


      if (
        token
        && user
      ) {

        const updatedUser = {
          ...user,

          must_change_password:
            false,
        };


        await saveAuth(
          token,
          updatedUser
        );


        showMessage(
          "Password Changed",
          "Your temporary password has been changed successfully."
        );


        router.replace(
          getHomeRoute(
            updatedUser.role
          )
        );

        return;
      }


      router.replace(
        "/"
      );


    } catch (
      error: any
    ) {

      showMessage(
        "Password Change Failed",
        error?.message ||
          "Unable to change password."
      );

    } finally {

      setLoading(
        false
      );
    }
  }


  return (

    <KeyboardAvoidingView
      style={
        styles.container
      }

      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >

      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }

        keyboardShouldPersistTaps=
          "handled"
      >

        <View
          style={
            styles.card
          }
        >

          {/* =================================================
              HEADER
          ================================================= */}

          <View
            style={
              styles.iconCircle
            }
          >

            <Ionicons
              name=
                "shield-checkmark-outline"

              size={
                34
              }

              color=
                "#0F8B8D"
            />

          </View>


          <Text
            style={
              styles.title
            }
          >
            Change Temporary Password
          </Text>


          <Text
            style={
              styles.subtitle
            }
          >
            For security, you must create your own password before accessing SmartClinic.
          </Text>


          {/* =================================================
              INFO
          ================================================= */}

          <View
            style={
              styles.infoBox
            }
          >

            <Ionicons
              name=
                "information-circle-outline"

              size={
                21
              }

              color=
                "#0F8B8D"
            />


            <Text
              style={
                styles.infoText
              }
            >
              The password provided by the administrator is temporary. Your new password will remain private.
            </Text>

          </View>


          {/* =================================================
              CURRENT PASSWORD
          ================================================= */}

          <Text
            style={
              styles.label
            }
          >
            Temporary Password
          </Text>


          <View
            style={
              styles.passwordContainer
            }
          >

            <TextInput
              style={
                styles.passwordInput
              }

              value={
                currentPassword
              }

              onChangeText={
                setCurrentPassword
              }

              placeholder=
                "Enter temporary password"

              placeholderTextColor=
                "#8B9AA5"

              secureTextEntry={
                !showCurrentPassword
              }

              autoCapitalize=
                "none"

              editable={
                !loading
              }
            />


            <Pressable
              style={
                styles.eyeButton
              }

              onPress={
                () =>
                  setShowCurrentPassword(
                    (value) =>
                      !value
                  )
              }
            >

              <Ionicons
                name={
                  showCurrentPassword
                    ? "eye-off-outline"
                    : "eye-outline"
                }

                size={
                  22
                }

                color=
                  "#60757F"
              />

            </Pressable>

          </View>


          {/* =================================================
              NEW PASSWORD
          ================================================= */}

          <Text
            style={
              styles.label
            }
          >
            New Password
          </Text>


          <View
            style={
              styles.passwordContainer
            }
          >

            <TextInput
              style={
                styles.passwordInput
              }

              value={
                newPassword
              }

              onChangeText={
                setNewPassword
              }

              placeholder=
                "Enter new password"

              placeholderTextColor=
                "#8B9AA5"

              secureTextEntry={
                !showNewPassword
              }

              autoCapitalize=
                "none"

              editable={
                !loading
              }
            />


            <Pressable
              style={
                styles.eyeButton
              }

              onPress={
                () =>
                  setShowNewPassword(
                    (value) =>
                      !value
                  )
              }
            >

              <Ionicons
                name={
                  showNewPassword
                    ? "eye-off-outline"
                    : "eye-outline"
                }

                size={
                  22
                }

                color=
                  "#60757F"
              />

            </Pressable>

          </View>


          {/* =================================================
              CONFIRM PASSWORD
          ================================================= */}

          <Text
            style={
              styles.label
            }
          >
            Confirm New Password
          </Text>


          <View
            style={
              styles.passwordContainer
            }
          >

            <TextInput
              style={
                styles.passwordInput
              }

              value={
                confirmPassword
              }

              onChangeText={
                setConfirmPassword
              }

              placeholder=
                "Confirm new password"

              placeholderTextColor=
                "#8B9AA5"

              secureTextEntry={
                !showConfirmPassword
              }

              autoCapitalize=
                "none"

              editable={
                !loading
              }

              onSubmitEditing={
                handleChangePassword
              }
            />


            <Pressable
              style={
                styles.eyeButton
              }

              onPress={
                () =>
                  setShowConfirmPassword(
                    (value) =>
                      !value
                  )
              }
            >

              <Ionicons
                name={
                  showConfirmPassword
                    ? "eye-off-outline"
                    : "eye-outline"
                }

                size={
                  22
                }

                color=
                  "#60757F"
              />

            </Pressable>

          </View>


          <Text
            style={
              styles.passwordHint
            }
          >
            Password must contain at least 8 characters.
          </Text>


          {/* =================================================
              BUTTON
          ================================================= */}

          <Pressable
            style={[
              styles.button,

              loading
                ? styles.buttonDisabled
                : null,
            ]}

            disabled={
              loading
            }

            onPress={
              handleChangePassword
            }
          >

            {
              loading
                ? (

                  <ActivityIndicator
                    color=
                      "#FFFFFF"
                  />

                )
                : (

                  <>

                    <Ionicons
                      name=
                        "lock-closed-outline"

                      size={
                        20
                      }

                      color=
                        "#FFFFFF"
                    />


                    <Text
                      style={
                        styles.buttonText
                      }
                    >
                      Change Password
                    </Text>

                  </>

                )
            }

          </Pressable>

        </View>

      </ScrollView>

    </KeyboardAvoidingView>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor:
        "#F3F8F8",
    },

    scrollContent: {
      flexGrow: 1,
      justifyContent:
        "center",
      alignItems:
        "center",
      padding: 20,
    },

    card: {
      width: "100%",
      maxWidth: 480,

      backgroundColor:
        "#FFFFFF",

      borderRadius: 22,
      padding: 28,

      shadowColor:
        "#000000",

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity:
        0.08,

      shadowRadius:
        14,

      elevation: 4,
    },

    iconCircle: {
      width: 68,
      height: 68,

      borderRadius: 34,

      backgroundColor:
        "#E8F6F6",

      alignItems:
        "center",

      justifyContent:
        "center",

      alignSelf:
        "center",

      marginBottom: 18,
    },

    title: {
      fontSize: 26,
      fontWeight: "800",

      color:
        "#15343B",

      textAlign:
        "center",
    },

    subtitle: {
      marginTop: 10,

      fontSize: 15,
      lineHeight: 22,

      color:
        "#657982",

      textAlign:
        "center",

      marginBottom: 22,
    },

    infoBox: {
      flexDirection:
        "row",

      alignItems:
        "flex-start",

      gap: 10,

      padding: 14,

      borderRadius: 12,

      backgroundColor:
        "#EDF8F8",

      marginBottom: 24,
    },

    infoText: {
      flex: 1,

      color:
        "#41656B",

      fontSize: 13,
      lineHeight: 19,
    },

    label: {
      color:
        "#29464D",

      fontSize: 14,
      fontWeight: "700",

      marginBottom: 7,
      marginTop: 10,
    },

    passwordContainer: {
      minHeight: 52,

      borderWidth: 1,
      borderColor:
        "#D6E1E3",

      borderRadius: 12,

      backgroundColor:
        "#FAFCFC",

      flexDirection:
        "row",

      alignItems:
        "center",
    },

    passwordInput: {
      flex: 1,

      paddingHorizontal: 14,
      paddingVertical: 13,

      color:
        "#19373E",

      fontSize: 15,
    },

    eyeButton: {
      width: 50,
      minHeight: 50,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    passwordHint: {
      color:
        "#7B8E95",

      fontSize: 12,

      marginTop: 8,
      marginBottom: 22,
    },

    button: {
      minHeight: 52,

      backgroundColor:
        "#0F8B8D",

      borderRadius: 12,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 9,

      paddingHorizontal: 18,
    },

    buttonDisabled: {
      opacity: 0.65,
    },

    buttonText: {
      color:
        "#FFFFFF",

      fontSize: 15,
      fontWeight: "800",
    },
  });