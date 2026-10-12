import React, {
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
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
  type Href,
  useRouter,
} from "expo-router";

import {
  apiRequest,
} from "../api/client";


type Step =
  | "email"
  | "otp"
  | "password"
  | "success";


export default function ForgotPasswordScreen() {
  const router =
    useRouter();


  const [
    step,
    setStep,
  ] = useState<Step>(
    "email"
  );

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    code,
    setCode,
  ] = useState("");

  const [
    resetToken,
    setResetToken,
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
    loading,
    setLoading,
  ] = useState(false);

  const [
    cooldown,
    setCooldown,
  ] = useState(0);


  // =========================================================
  // RESEND TIMER
  // =========================================================

  useEffect(() => {
    if (
      cooldown <= 0
    ) {
      return;
    }

    const timer =
      setInterval(() => {
        setCooldown(
          (current) =>
            current > 0
              ? current - 1
              : 0
        );
      }, 1000);


    return () =>
      clearInterval(
        timer
      );

  }, [cooldown]);


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
  // REQUEST OTP
  // =========================================================

  const requestResetCode =
    async () => {
      const cleanEmail =
        email
          .trim()
          .toLowerCase();


      if (!cleanEmail) {
        showMessage(
          "Email Required",
          "Please enter your email."
        );

        return;
      }


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


      try {
        setLoading(true);


        await apiRequest(
          "/api/auth/forgot-password",
          {
            method: "POST",

            body: JSON.stringify({
              email: cleanEmail,
            }),
          }
        );


        setEmail(
          cleanEmail
        );

        setStep(
          "otp"
        );

        setCooldown(
          60
        );


        showMessage(
          "Reset Code Sent",
          "If this is a verified account, a 6-digit reset code has been sent to the email."
        );

      } catch (err: any) {
        showMessage(
          "Unable to Send Code",
          err?.message ||
            "Please try again."
        );

      } finally {
        setLoading(false);
      }
    };


  // =========================================================
  // VERIFY OTP
  // =========================================================

  const verifyResetCode =
    async () => {
      const cleanCode =
        code.trim();


      if (
        !/^\d{6}$/.test(
          cleanCode
        )
      ) {
        showMessage(
          "Invalid Code",
          "Please enter the 6-digit reset code."
        );

        return;
      }


      try {
        setLoading(true);


        const response =
          await apiRequest(
            "/api/auth/verify-reset-code",
            {
              method: "POST",

              body: JSON.stringify({
                email,
                code:
                  cleanCode,
              }),
            }
          );


        if (
          !response?.reset_token
        ) {
          throw new Error(
            "Reset authorization was not received."
          );
        }


        setResetToken(
          response.reset_token
        );

        setStep(
          "password"
        );

      } catch (err: any) {
        showMessage(
          "Verification Failed",
          err?.message ||
            "Unable to verify reset code."
        );

      } finally {
        setLoading(false);
      }
    };


  // =========================================================
  // RESEND OTP
  // =========================================================

  const resendCode =
    async () => {
      if (
        cooldown > 0
      ) {
        return;
      }


      try {
        setLoading(true);


        await apiRequest(
          "/api/auth/forgot-password",
          {
            method: "POST",

            body: JSON.stringify({
              email,
            }),
          }
        );


        setCode("");

        setCooldown(
          60
        );


        showMessage(
          "Code Sent",
          "A new password reset code has been requested."
        );

      } catch (err: any) {
        showMessage(
          "Unable to Resend Code",
          err?.message ||
            "Please try again."
        );

      } finally {
        setLoading(false);
      }
    };


  // =========================================================
  // RESET PASSWORD
  // =========================================================

  const resetPassword =
    async () => {
      if (
        newPassword.length < 8
      ) {
        showMessage(
          "Weak Password",
          "Password must be at least 8 characters long."
        );

        return;
      }


      if (
        newPassword !==
        confirmPassword
      ) {
        showMessage(
          "Passwords Do Not Match",
          "New password and confirm password must be the same."
        );

        return;
      }


      if (
        !resetToken
      ) {
        showMessage(
          "Reset Session Expired",
          "Please request a new reset code."
        );

        setStep(
          "email"
        );

        return;
      }


      try {
        setLoading(true);


        await apiRequest(
          "/api/auth/reset-password",
          {
            method: "POST",

            body: JSON.stringify({
              email,

              reset_token:
                resetToken,

              new_password:
                newPassword,
            }),
          }
        );


        setResetToken("");

        setCode("");

        setNewPassword("");

        setConfirmPassword("");

        setStep(
          "success"
        );

      } catch (err: any) {
        showMessage(
          "Password Reset Failed",
          err?.message ||
            "Unable to reset password."
        );

      } finally {
        setLoading(false);
      }
    };


  // =========================================================
  // EMAIL STEP
  // =========================================================

  const renderEmailStep =
    () => (
      <>
        <View
          style={
            styles.iconCircle
          }
        >
          <Ionicons
            name="mail-outline"
            size={29}
            color="#0F766E"
          />
        </View>


        <Text
          style={
            styles.title
          }
        >
          Forgot Password?
        </Text>

        <Text
          style={
            styles.subtitle
          }
        >
          Enter your registered email.
          We will send a 6-digit reset code.
        </Text>


        <Text
          style={
            styles.label
          }
        >
          Your Email
        </Text>

        <TextInput
          value={
            email
          }
          onChangeText={
            setEmail
          }
          editable={
            !loading
          }
          placeholder="Enter your email"
          placeholderTextColor="#94A3B8"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={
            styles.input
          }
          onSubmitEditing={
            requestResetCode
          }
        />


        <PrimaryButton
          title="Send Reset Code"
          loading={
            loading
          }
          icon="send-outline"
          onPress={
            requestResetCode
          }
        />
      </>
    );


  // =========================================================
  // OTP STEP
  // =========================================================

  const renderOtpStep =
    () => (
      <>
        <View
          style={
            styles.iconCircle
          }
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={29}
            color="#0F766E"
          />
        </View>


        <Text
          style={
            styles.title
          }
        >
          Verify Reset Code
        </Text>

        <Text
          style={
            styles.subtitle
          }
        >
          Enter the 6-digit code sent to{" "}
          <Text
            style={
              styles.emailHighlight
            }
          >
            {email}
          </Text>
        </Text>


        <Text
          style={
            styles.label
          }
        >
          Reset Code
        </Text>

        <TextInput
          value={
            code
          }
          onChangeText={(
            value
          ) =>
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
          editable={
            !loading
          }
          placeholder="000000"
          placeholderTextColor="#94A3B8"
          keyboardType="number-pad"
          maxLength={6}
          style={[
            styles.input,
            styles.otpInput,
          ]}
        />


        <PrimaryButton
          title="Verify Code"
          loading={
            loading
          }
          icon="checkmark-circle-outline"
          onPress={
            verifyResetCode
          }
        />


        <Pressable
          disabled={
            loading ||
            cooldown > 0
          }
          onPress={
            resendCode
          }
          style={
            styles.secondaryButton
          }
        >
          <Text
            style={[
              styles.secondaryText,

              cooldown > 0 &&
                styles.disabledText,
            ]}
          >
            {cooldown > 0
              ? `Resend code in ${cooldown}s`
              : "Resend Code"}
          </Text>
        </Pressable>
      </>
    );


  // =========================================================
  // PASSWORD STEP
  // =========================================================

  const renderPasswordStep =
    () => (
      <>
        <View
          style={
            styles.iconCircle
          }
        >
          <Ionicons
            name="lock-closed-outline"
            size={29}
            color="#0F766E"
          />
        </View>


        <Text
          style={
            styles.title
          }
        >
          Create New Password
        </Text>

        <Text
          style={
            styles.subtitle
          }
        >
          Choose a new password for your
          SmartClinic account.
        </Text>


        <Text
          style={
            styles.label
          }
        >
          New Password
        </Text>

        <TextInput
          value={
            newPassword
          }
          onChangeText={
            setNewPassword
          }
          editable={
            !loading
          }
          secureTextEntry
          placeholder="Minimum 8 characters"
          placeholderTextColor="#94A3B8"
          style={
            styles.input
          }
        />


        <Text
          style={
            styles.label
          }
        >
          Confirm New Password
        </Text>

        <TextInput
          value={
            confirmPassword
          }
          onChangeText={
            setConfirmPassword
          }
          editable={
            !loading
          }
          secureTextEntry
          placeholder="Enter password again"
          placeholderTextColor="#94A3B8"
          style={
            styles.input
          }
          onSubmitEditing={
            resetPassword
          }
        />


        <PrimaryButton
          title="Reset Password"
          loading={
            loading
          }
          icon="key-outline"
          onPress={
            resetPassword
          }
        />
      </>
    );


  // =========================================================
  // SUCCESS STEP
  // =========================================================

  const renderSuccessStep =
    () => (
      <>
        <View
          style={
            styles.successCircle
          }
        >
          <Ionicons
            name="checkmark-circle"
            size={39}
            color="#15803D"
          />
        </View>


        <Text
          style={
            styles.title
          }
        >
          Password Reset
        </Text>

        <Text
          style={
            styles.subtitle
          }
        >
          Your password has been changed
          successfully. You can now login
          using your new password.
        </Text>


        <PrimaryButton
          title="Back to Login"
          loading={false}
          icon="log-in-outline"
          onPress={() =>
            router.replace(
              "/" as Href
            )
          }
        />
      </>
    );


  return (
    <View
      style={
        styles.screen
      }
    >
      <View
        style={
          styles.card
        }
      >
        {step === "email" &&
          renderEmailStep()}

        {step === "otp" &&
          renderOtpStep()}

        {step === "password" &&
          renderPasswordStep()}

        {step === "success" &&
          renderSuccessStep()}


        {step !==
          "success" ? (
          <Pressable
            disabled={
              loading
            }
            onPress={() =>
              router.replace(
                "/" as Href
              )
            }
            style={
              styles.backToLogin
            }
          >
            <Ionicons
              name="arrow-back-outline"
              size={15}
              color="#64748B"
            />

            <Text
              style={
                styles.backToLoginText
              }
            >
              Back to Login
            </Text>
          </Pressable>
        ) : null}


        <View
          style={
            styles.patientOnlyBox
          }
        >
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="#0F766E"
          />

          <Text
            style={
              styles.patientOnlyText
            }
          >
            Self-service password recovery
            is available.
          </Text>
        </View>
      </View>
    </View>
  );
}


// ============================================================
// PRIMARY BUTTON
// ============================================================

function PrimaryButton({
  title,
  loading,
  icon,
  onPress,
}: {
  title: string;
  loading: boolean;
  icon:
    keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={
        loading
      }
      onPress={
        onPress
      }
      style={({
        pressed,
      }) => [
        styles.primaryButton,

        loading &&
          styles.disabledButton,

        pressed &&
          !loading &&
          styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color="#FFFFFF"
        />
      ) : (
        <>
          <Ionicons
            name={icon}
            size={18}
            color="#FFFFFF"
          />

          <Text
            style={
              styles.primaryButtonText
            }
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
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
        "#F5F7FA",
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
      borderRadius: 20,
      borderWidth: 1,
      borderColor:
        "#E5EAF0",
      padding: 26,
    },

    iconCircle: {
      width: 60,
      height: 60,
      borderRadius: 18,
      backgroundColor:
        "#ECFDF5",
      alignSelf:
        "center",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    successCircle: {
      width: 68,
      height: 68,
      borderRadius: 22,
      backgroundColor:
        "#DCFCE7",
      alignSelf:
        "center",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    title: {
      color: "#172033",
      fontSize: 23,
      fontWeight: "900",
      textAlign: "center",
      marginTop: 15,
    },

    subtitle: {
      color: "#64748B",
      fontSize: 11,
      lineHeight: 18,
      textAlign: "center",
      marginTop: 7,
      marginBottom: 24,
    },

    emailHighlight: {
      color: "#0F766E",
      fontWeight: "800",
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
      backgroundColor:
        "#F8FAFC",
      color: "#172033",
      paddingHorizontal: 14,
      fontSize: 14,
      marginBottom: 16,
    },

    otpInput: {
      textAlign: "center",
      fontSize: 22,
      fontWeight: "900",
      letterSpacing: 8,
    },

    primaryButton: {
      minHeight: 49,
      borderRadius: 12,
      backgroundColor:
        "#0F766E",
      alignItems:
        "center",
      justifyContent:
        "center",
      flexDirection:
        "row",
      gap: 8,
      marginTop: 3,
    },

    primaryButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "900",
    },

    secondaryButton: {
      alignItems:
        "center",
      paddingVertical: 12,
      marginTop: 5,
    },

    secondaryText: {
      color: "#0F766E",
      fontSize: 11,
      fontWeight: "800",
    },

    disabledText: {
      color: "#94A3B8",
    },

    backToLogin: {
      flexDirection:
        "row",
      justifyContent:
        "center",
      alignItems:
        "center",
      gap: 5,
      paddingVertical: 12,
      marginTop: 7,
    },

    backToLoginText: {
      color: "#64748B",
      fontSize: 11,
      fontWeight: "700",
    },

    patientOnlyBox: {
      backgroundColor:
        "#ECFDF5",
      borderRadius: 11,
      padding: 11,
      flexDirection:
        "row",
      gap: 7,
      marginTop: 8,
    },

    patientOnlyText: {
      flex: 1,
      color: "#52716E",
      fontSize: 9,
      lineHeight: 14,
    },

    disabledButton: {
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