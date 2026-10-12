import React, {
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  router,
  type Href,
} from "expo-router";

import {
  apiRequest,
} from "@/api/client";

import {
  saveAuth,
} from "@/storage/authStorage";


export default function LoginScreen() {
  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);


  // =========================================================
  // MESSAGE
  // =========================================================

  const showMessage = (
    title: string,
    message: string
  ) => {
    if (
      Platform.OS === "web"
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
  // LOGIN
  // =========================================================

  async function handleLogin() {
    const cleanEmail =
      email
        .trim()
        .toLowerCase();


    if (
      !cleanEmail ||
      !password
    ) {
      showMessage(
        "Required",
        "Please enter email and password."
      );

      return;
    }


    try {
      setLoading(true);


      const data =
        await apiRequest(
          "/api/auth/login",
          {
            method: "POST",

            body: JSON.stringify({
              email:
                cleanEmail,

              password,
            }),
          }
        );


      if (
        !data?.token ||
        !data?.user
      ) {
        throw new Error(
          "Invalid login response."
        );
      }


      await saveAuth(
        data.token,
        data.user
      );


      const role =
        data.user.role;

        const mustChangePassword =
  data.user.must_change_password === true;

const isStaff =
  role === "doctor" ||
  role === "receptionist";


// Staff using temporary password
if (
  isStaff &&
  mustChangePassword
) {
  router.replace(
    "/change-password"
  );

  return;
}



      // =====================================================
      // ROLE REDIRECTION
      // =====================================================

      if (
        role === "patient"
      ) {
        router.replace(
          "/patient" as Href
        );

        return;
      }


      if (
        role === "doctor"
      ) {
        router.replace(
          "/doctor" as Href
        );

        return;
      }


      if (
        role === "receptionist"
      ) {
        router.replace(
          "/receptionist" as Href
        );

        return;
      }


      if (
        role === "admin"
      ) {
        router.replace(
          "/admin" as Href
        );

        return;
      }


      showMessage(
        "Unsupported Account",
        "This account role is not supported."
      );

    } catch (
      error: any
    ) {
      showMessage(
        "Login Failed",
        error?.message ||
          "Unable to login."
      );

    } finally {
      setLoading(false);
    }
  }


  // =========================================================
  // UI
  // =========================================================

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
      <View
        style={
          styles.card
        }
      >
        {/* ================================================= */}
        {/* LOGO */}
        {/* ================================================= */}

        <View
          style={
            styles.logoCircle
          }
        >
          <Ionicons
            name="medical"
            size={28}
            color="#0F766E"
          />
        </View>


        <Text
          style={
            styles.logo
          }
        >
          SmartClinic
        </Text>


        <Text
          style={
            styles.subtitle
          }
        >
          Clinic Management System
        </Text>


        {/* ================================================= */}
        {/* HEADING */}
        {/* ================================================= */}

        <Text
          style={
            styles.heading
          }
        >
          Welcome Back
        </Text>

        <Text
          style={
            styles.headingSubtitle
          }
        >
          Sign in to continue to your account
        </Text>


        {/* ================================================= */}
        {/* EMAIL */}
        {/* ================================================= */}

        <Text
          style={
            styles.label
          }
        >
          Email
        </Text>

        <TextInput
          style={
            styles.input
          }
          placeholder="Enter your email"
          placeholderTextColor="#94A3B8"
          value={
            email
          }
          onChangeText={
            setEmail
          }
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={
            !loading
          }
        />


        {/* ================================================= */}
        {/* PASSWORD */}
        {/* ================================================= */}

        <Text
          style={
            styles.label
          }
        >
          Password
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
            placeholder="Enter your password"
            placeholderTextColor="#94A3B8"
            value={
              password
            }
            onChangeText={
              setPassword
            }
            secureTextEntry={
              !showPassword
            }
            editable={
              !loading
            }
            onSubmitEditing={
              handleLogin
            }
          />


          <Pressable
            disabled={
              loading
            }
            onPress={() =>
              setShowPassword(
                (current) =>
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


        {/* ================================================= */}
        {/* FORGOT PASSWORD */}
        {/* ================================================= */}

        <Pressable
          disabled={
            loading
          }
          onPress={() =>
            router.push(
              "/forgot-password" as Href
            )
          }
          style={({
            pressed,
          }) => [
            styles.forgotButton,

            pressed &&
              styles.pressed,
          ]}
        >
          <Text
            style={
              styles.forgotText
            }
          >
            Forgot Password?
          </Text>
        </Pressable>


        {/* ================================================= */}
        {/* LOGIN BUTTON */}
        {/* ================================================= */}

        <Pressable
          onPress={
            handleLogin
          }
          disabled={
            loading
          }
          style={({
            pressed,
          }) => [
            styles.button,

            loading &&
              styles.buttonDisabled,

            pressed &&
              !loading &&
              styles.pressed,
          ]}
        >
          {loading ? (
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
                  styles.buttonText
                }
              >
                Logging in...
              </Text>
            </View>

          ) : (
            <Text
              style={
                styles.buttonText
              }
            >
              Login
            </Text>
          )}
        </Pressable>


        {/* ================================================= */}
        {/* REGISTER */}
        {/* ================================================= */}

        <Pressable
          disabled={
            loading
          }
          onPress={() =>
            router.push(
              "/register" as Href
            )
          }
          style={({
            pressed,
          }) => [
            styles.registerButton,

            pressed &&
              styles.pressed,
          ]}
        >
          <Text
            style={
              styles.registerText
            }
          >
            Don't have an account?{" "}

            <Text
              style={
                styles.registerLink
              }
            >
              Register
            </Text>
          </Text>
        </Pressable>


        {/* ================================================= */}
        {/* FOOTER */}
        {/* ================================================= */}

        <View
          style={
            styles.footer
          }
        >
          <Text
            style={
              styles.footerText
            }
          >
            SmartClinic FYP
          </Text>
        </View>
      </View>
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
      justifyContent:
        "center",
      backgroundColor:
        "#F5F7FA",
      padding: 20,
    },

    card: {
      width: "100%",
      maxWidth: 480,
      alignSelf: "center",
      backgroundColor:
        "#FFFFFF",
      padding: 26,
      borderRadius: 20,
      borderWidth: 1,
      borderColor:
        "#E5EAF0",
    },

    logoCircle: {
      width: 58,
      height: 58,
      borderRadius: 18,
      backgroundColor:
        "#ECFDF5",
      alignSelf: "center",
      alignItems: "center",
      justifyContent:
        "center",
    },

    logo: {
      fontSize: 30,
      fontWeight: "900",
      textAlign: "center",
      color: "#172033",
      marginTop: 10,
    },

    subtitle: {
      textAlign: "center",
      marginTop: 4,
      color: "#94A3B8",
      fontSize: 12,
    },

    heading: {
      fontSize: 23,
      fontWeight: "900",
      color: "#172033",
      marginTop: 32,
    },

    headingSubtitle: {
      color: "#94A3B8",
      fontSize: 11,
      marginTop: 4,
      marginBottom: 20,
    },

    label: {
      color: "#334155",
      fontSize: 11,
      fontWeight: "800",
      marginBottom: 7,
    },

    input: {
      minHeight: 48,
      borderWidth: 1,
      borderColor:
        "#DDE4EC",
      borderRadius: 12,
      paddingHorizontal: 14,
      marginBottom: 16,
      fontSize: 14,
      color: "#172033",
      backgroundColor:
        "#F8FAFC",
    },

    // ======================================================
    // PASSWORD WITH EYE
    // ======================================================

    passwordContainer: {
      minHeight: 48,
      borderWidth: 1,
      borderColor:
        "#DDE4EC",
      borderRadius: 12,
      backgroundColor:
        "#F8FAFC",
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 5,
    },

    passwordInput: {
      flex: 1,
      minHeight: 46,
      paddingLeft: 14,
      paddingRight: 5,
      fontSize: 14,
      color: "#172033",
      outlineStyle: "none",
    } as any,

    eyeButton: {
      width: 48,
      minHeight: 46,
      alignItems: "center",
      justifyContent:
        "center",
    },

    eyePressed: {
      opacity: 0.5,
    },

    // ======================================================
    // FORGOT PASSWORD
    // ======================================================

    forgotButton: {
      alignSelf:
        "flex-end",
      paddingVertical: 8,
      paddingLeft: 10,
      marginBottom: 5,
    },

    forgotText: {
      color: "#0F766E",
      fontSize: 11,
      fontWeight: "800",
    },

    // ======================================================
    // LOGIN
    // ======================================================

    button: {
      minHeight: 49,
      backgroundColor:
        "#0F766E",
      borderRadius: 12,
      alignItems: "center",
      justifyContent:
        "center",
      marginTop: 5,
    },

    buttonDisabled: {
      opacity: 0.65,
    },

    buttonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "900",
    },

    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },

    registerButton: {
      alignItems: "center",
      marginTop: 20,
      paddingVertical: 6,
    },

    registerText: {
      color: "#64748B",
      fontSize: 12,
    },

    registerLink: {
      color: "#0F766E",
      fontWeight: "900",
    },

    footer: {
      alignItems: "center",
      marginTop: 28,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor:
        "#F1F5F9",
    },

    footerText: {
      color: "#CBD5E1",
      fontSize: 9,
      fontWeight: "700",
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