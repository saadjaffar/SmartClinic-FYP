import React, {
  useEffect,
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
  router,
  useLocalSearchParams,
} from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import { apiRequest } from "@/api/client";


export default function VerifyEmailScreen() {
  const params =
    useLocalSearchParams<{
      email?: string;
    }>();

  const email =
    typeof params.email === "string"
      ? params.email
      : "";

  const [code, setCode] =
    useState("");

  const [verifying, setVerifying] =
    useState(false);

  const [resending, setResending] =
    useState(false);

  const [
    resendCooldown,
    setResendCooldown,
  ] = useState(60);


  // =====================================================
  // RESEND COUNTDOWN
  // =====================================================
  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setResendCooldown(
        (current) =>
          Math.max(
            current - 1,
            0
          )
      );
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [resendCooldown]);


  // =====================================================
  // VERIFY EMAIL
  // =====================================================
  const handleVerify = async () => {
    const cleanCode =
      code.trim();

    if (!email) {
      showMessage(
        "Email Missing",
        "Verification email is missing. Please register again."
      );

      return;
    }

    if (
      !/^\d{6}$/.test(
        cleanCode
      )
    ) {
      showMessage(
        "Invalid Code",
        "Please enter the 6-digit verification code."
      );

      return;
    }

    try {
      setVerifying(true);

      await apiRequest(
        "/api/auth/verify-email",
        {
          method: "POST",

          body: JSON.stringify({
            email,
            code: cleanCode,
          }),
        }
      );

      if (
        Platform.OS === "web"
      ) {
        window.alert(
          "Email Verified\n\nYour email has been verified successfully. You can now login."
        );

        router.replace("/");

        return;
      }

      Alert.alert(
        "Email Verified",
        "Your email has been verified successfully. You can now login.",
        [
          {
            text:
              "Continue to Login",

            onPress: () =>
              router.replace(
                "/"
              ),
          },
        ],
        {
          cancelable: false,
        }
      );

    } catch (
      error: any
    ) {
      showMessage(
        "Verification Failed",
        error?.message ||
          "Unable to verify your email."
      );

    } finally {
      setVerifying(false);
    }
  };


  // =====================================================
  // RESEND OTP
  // =====================================================
  const handleResend = async () => {
    if (!email) {
      showMessage(
        "Email Missing",
        "Verification email is missing. Please register again."
      );

      return;
    }

    if (
      resendCooldown > 0
    ) {
      return;
    }

    try {
      setResending(true);

      await apiRequest(
        "/api/auth/resend-verification",
        {
          method: "POST",

          body: JSON.stringify({
            email,
          }),
        }
      );

      setCode("");

      // Start new 60-second timer
      setResendCooldown(60);

      showMessage(
        "New Code Sent",
        "A new 6-digit verification code has been sent to your email."
      );

    } catch (
      error: any
    ) {
      showMessage(
        "Unable to Resend",
        error?.message ||
          "Unable to send a new verification code."
      );

    } finally {
      setResending(false);
    }
  };


  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : "height"
      }
    >
      <View style={styles.card}>

        {/* ICON */}
        <View
          style={
            styles.iconCircle
          }
        >
          <Ionicons
            name="mail-outline"
            size={32}
            color="#0F766E"
          />
        </View>


        {/* TITLE */}
        <Text
          style={styles.title}
        >
          Verify Your Email
        </Text>

        <Text
          style={
            styles.description
          }
        >
          We sent a 6-digit
          verification code to
        </Text>

        <Text
          style={styles.email}
        >
          {email ||
            "your email address"}
        </Text>


        {/* OTP INPUT */}
        <Text
          style={styles.label}
        >
          Verification Code
        </Text>

        <TextInput
          value={code}
          onChangeText={(value) =>
            setCode(
              value
                .replace(
                  /\D/g,
                  ""
                )
                .slice(
                  0,
                  6
                )
            )
          }
          placeholder="000000"
          placeholderTextColor="#94A3B8"
          keyboardType="number-pad"
          maxLength={6}
          editable={!verifying}
          style={
            styles.codeInput
          }
          returnKeyType="done"
          onSubmitEditing={
            handleVerify
          }
        />

        <Text
          style={
            styles.expiryText
          }
        >
          Code expires after
          10 minutes.
        </Text>


        {/* VERIFY BUTTON */}
        <Pressable
          onPress={
            handleVerify
          }
          disabled={verifying}
          style={({
            pressed,
          }) => [
            styles.verifyButton,

            verifying &&
              styles.disabledButton,

            pressed &&
              !verifying &&
              styles.pressed,
          ]}
        >
          {verifying ? (
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
                  styles.verifyButtonText
                }
              >
                Verifying...
              </Text>
            </View>
          ) : (
            <Text
              style={
                styles.verifyButtonText
              }
            >
              Verify Email
            </Text>
          )}
        </Pressable>


        {/* RESEND */}
        <View
          style={
            styles.resendSection
          }
        >
          <Text
            style={
              styles.resendInfo
            }
          >
            Didn't receive the
            code?
          </Text>

          <Pressable
            onPress={
              handleResend
            }
            disabled={
              resending ||
              resendCooldown > 0
            }
            style={({
              pressed,
            }) => [
              styles.resendButton,

              (
                resending ||
                resendCooldown > 0
              ) &&
                styles.resendButtonDisabled,

              pressed &&
                resendCooldown ===
                  0 &&
                !resending &&
                styles.pressed,
            ]}
          >
            {resending ? (
              <ActivityIndicator
                size="small"
                color="#0F766E"
              />
            ) : (
              <Text
                style={[
                  styles.resendText,

                  resendCooldown >
                    0 &&
                    styles.resendTextDisabled,
                ]}
              >
                {resendCooldown > 0
                  ? `Resend Code in ${resendCooldown}s`
                  : "Resend Code"}
              </Text>
            )}
          </Pressable>
        </View>


        {/* DIVIDER */}
        <View
          style={
            styles.divider
          }
        />


        {/* LOGIN */}
        <Pressable
          onPress={() =>
            router.replace(
              "/"
            )
          }
          style={({
            pressed,
          }) => [
            styles.loginButton,

            pressed &&
              styles.pressed,
          ]}
        >
          <Ionicons
            name="arrow-back-outline"
            size={17}
            color="#475569"
          />

          <Text
            style={
              styles.loginText
            }
          >
            Back to Login
          </Text>
        </Pressable>

      </View>
    </KeyboardAvoidingView>
  );
}


function showMessage(
  title: string,
  message: string
) {
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
}


const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        "#F5F7FA",
      justifyContent:
        "center",
      padding: 20,
    },

    card: {
      width: "100%",
      maxWidth: 480,
      alignSelf: "center",
      backgroundColor:
        "#FFFFFF",
      borderRadius: 22,
      padding: 28,
      borderWidth: 1,
      borderColor:
        "#E2E8F0",
    },

    iconCircle: {
      width: 68,
      height: 68,
      borderRadius: 34,
      alignSelf: "center",
      backgroundColor:
        "#CCFBF1",
      justifyContent:
        "center",
      alignItems: "center",
    },

    title: {
      marginTop: 18,
      textAlign: "center",
      fontSize: 24,
      fontWeight: "800",
      color: "#172033",
    },

    description: {
      marginTop: 9,
      textAlign: "center",
      fontSize: 13,
      lineHeight: 20,
      color: "#64748B",
    },

    email: {
      marginTop: 3,
      textAlign: "center",
      fontSize: 14,
      fontWeight: "700",
      color: "#0F766E",
    },

    label: {
      marginTop: 28,
      marginBottom: 8,
      fontSize: 13,
      fontWeight: "700",
      color: "#334155",
    },

    codeInput: {
      width: "100%",
      minHeight: 58,
      borderWidth: 1,
      borderColor:
        "#CBD5E1",
      borderRadius: 12,
      backgroundColor:
        "#F8FAFC",
      color: "#172033",
      fontSize: 25,
      fontWeight: "800",
      textAlign: "center",
      letterSpacing: 9,
      paddingHorizontal: 14,
    },

    expiryText: {
      marginTop: 8,
      textAlign: "center",
      fontSize: 11,
      color: "#94A3B8",
    },

    verifyButton: {
      marginTop: 22,
      minHeight: 50,
      borderRadius: 12,
      backgroundColor:
        "#0F766E",
      justifyContent:
        "center",
      alignItems: "center",
      paddingHorizontal: 18,
    },

    verifyButtonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
    },

    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    disabledButton: {
      opacity: 0.65,
    },

    resendSection: {
      marginTop: 20,
      alignItems: "center",
      gap: 6,
    },

    resendInfo: {
      fontSize: 12,
      color: "#64748B",
    },

    resendButton: {
      minHeight: 34,
      justifyContent:
        "center",
      alignItems: "center",
      paddingHorizontal: 10,
    },

    resendButtonDisabled: {
      opacity: 0.7,
    },

    resendText: {
      fontSize: 13,
      fontWeight: "800",
      color: "#0F766E",
    },

    resendTextDisabled: {
      color: "#94A3B8",
    },

    divider: {
      height: 1,
      backgroundColor:
        "#E2E8F0",
      marginVertical: 22,
    },

    loginButton: {
      flexDirection: "row",
      justifyContent:
        "center",
      alignItems: "center",
      gap: 7,
      paddingVertical: 7,
    },

    loginText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#475569",
    },

    pressed: {
      opacity: 0.72,
    },
  });