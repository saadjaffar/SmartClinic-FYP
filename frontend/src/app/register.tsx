import React, { useState } from "react";

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

import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { apiRequest } from "../api/client";


type Gender =
  | "Male"
  | "Female"
  | "Other";


export default function RegisterScreen() {
  const router = useRouter();

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [contact, setContact] =
    useState("");

  const [age, setAge] =
    useState("");

  const [gender, setGender] =
    useState<Gender>("Male");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);


  const handleRegister = async () => {
    const cleanName =
      name.trim();

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    const cleanContact =
      contact.trim();

    const parsedAge =
      Number(age);

    // =====================================================
    // REQUIRED FIELDS
    // =====================================================
    if (
      !cleanName ||
      !cleanEmail ||
      !cleanContact ||
      !age.trim() ||
      !password ||
      !confirmPassword
    ) {
      showMessage(
        "Required Fields",
        "Please complete all required fields."
      );

      return;
    }

    // =====================================================
    // EMAIL VALIDATION
    // =====================================================
    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailRegex.test(cleanEmail)
    ) {
      showMessage(
        "Invalid Email",
        "Please enter a valid email address."
      );

      return;
    }

    // =====================================================
    // CONTACT VALIDATION
    // =====================================================
    if (
      cleanContact.length < 7
    ) {
      showMessage(
        "Invalid Contact",
        "Please enter a valid contact number."
      );

      return;
    }

    // =====================================================
    // AGE VALIDATION
    // =====================================================
    if (
      !Number.isInteger(
        parsedAge
      ) ||
      parsedAge < 0 ||
      parsedAge > 120
    ) {
      showMessage(
        "Invalid Age",
        "Please enter a valid age between 0 and 120."
      );

      return;
    }

    // =====================================================
    // PASSWORD VALIDATION
    // =====================================================
    if (
      password.length < 8
    ) {
      showMessage(
        "Weak Password",
        "Password must be at least 8 characters long."
      );

      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      showMessage(
        "Password Mismatch",
        "Passwords do not match."
      );

      return;
    }

    // =====================================================
    // REGISTER PATIENT
    // =====================================================
    try {
      setLoading(true);

      await apiRequest(
        "/api/auth/register",
        {
          method: "POST",

          body: JSON.stringify({
            name: cleanName,
            email: cleanEmail,
            contact: cleanContact,
            age: parsedAge,
            gender,
            password,
          }),
        }
      );

      // ===================================================
      // WEB
      // ===================================================
      if (
        Platform.OS === "web"
      ) {
        window.alert(
          "Registration successful.\n\nA 6-digit verification code has been sent to your email."
        );

        router.replace({
          pathname:
            "/verify-email",
          params: {
            email:
              cleanEmail,
          },
        });

        return;
      }

      // ===================================================
      // MOBILE
      // ===================================================
      Alert.alert(
        "Check Your Email",
        "Your patient account has been created. A 6-digit verification code has been sent to your email.",
        [
          {
            text:
              "Verify Email",

            onPress: () =>
              router.replace({
                pathname:
                  "/verify-email",

                params: {
                  email:
                    cleanEmail,
                },
              }),
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
        "Registration Failed",
        error?.message ||
          "Unable to create your account."
      );

    } finally {
      setLoading(false);
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
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={
          Platform.OS === "ios"
            ? "interactive"
            : "on-drag"
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.card}>

          {/* BACK */}
          <Pressable
            onPress={() =>
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
            <Text
              style={
                styles.backIcon
              }
            >
              ‹
            </Text>
          </Pressable>

          {/* LOGO */}
          <View
            style={
              styles.logoCircle
            }
          >
            <Text
              style={
                styles.logoIcon
              }
            >
              🏥
            </Text>
          </View>

          <Text
            style={styles.logo}
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

          <Text
            style={
              styles.heading
            }
          >
            Create Patient Account
          </Text>

          <Text
            style={
              styles.description
            }
          >
            Register to book
            appointments, track your
            queue and view your medical
            history.
          </Text>


          {/* NAME */}
          <View
            style={
              styles.formGroup
            }
          >
            <Text
              style={
                styles.label
              }
            >
              Full Name
            </Text>

            <TextInput
              value={name}
              onChangeText={
                setName
              }
              placeholder="Enter your full name"
              placeholderTextColor="#94A3B8"
              autoCapitalize="words"
              returnKeyType="next"
              style={
                styles.input
              }
            />
          </View>


          {/* EMAIL */}
          <View
            style={
              styles.formGroup
            }
          >
            <Text
              style={
                styles.label
              }
            >
              Email Address
            </Text>

            <TextInput
              value={email}
              onChangeText={
                setEmail
              }
              placeholder="example@email.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="next"
              style={
                styles.input
              }
            />

            <Text
              style={
                styles.helperText
              }
            >
              We will send a
              verification code to
              this email.
            </Text>
          </View>


          {/* CONTACT */}
          <View
            style={
              styles.formGroup
            }
          >
            <Text
              style={
                styles.label
              }
            >
              Contact Number
            </Text>

            <TextInput
              value={contact}
              onChangeText={
                setContact
              }
              placeholder="e.g. 03123456789"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              returnKeyType="next"
              style={
                styles.input
              }
            />
          </View>


          {/* AGE */}
          <View
            style={
              styles.formGroup
            }
          >
            <Text
              style={
                styles.label
              }
            >
              Age
            </Text>

            <TextInput
              value={age}
              onChangeText={
                setAge
              }
              placeholder="Enter your age"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={3}
              style={
                styles.input
              }
            />
          </View>


          {/* GENDER */}
          <View
            style={
              styles.formGroup
            }
          >
            <Text
              style={
                styles.label
              }
            >
              Gender
            </Text>

            <View
              style={
                styles.genderRow
              }
            >
              {(
                [
                  "Male",
                  "Female",
                  "Other",
                ] as Gender[]
              ).map(
                (item) => {
                  const selected =
                    gender ===
                    item;

                  return (
                    <Pressable
                      key={item}
                      onPress={() =>
                        setGender(
                          item
                        )
                      }
                      style={[
                        styles.genderButton,

                        selected &&
                          styles.genderButtonSelected,
                      ]}
                    >
                      <View
                        style={[
                          styles.radioOuter,

                          selected &&
                            styles.radioOuterSelected,
                        ]}
                      >
                        {selected ? (
                          <View
                            style={
                              styles.radioInner
                            }
                          />
                        ) : null}
                      </View>

                      <Text
                        style={[
                          styles.genderText,

                          selected &&
                            styles.genderTextSelected,
                        ]}
                      >
                        {item}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </View>
          </View>


          {/* PASSWORD */}
          <View
            style={
              styles.formGroup
            }
          >
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
                value={password}
                onChangeText={
                  setPassword
                }
                placeholder="Minimum 8 characters"
                placeholderTextColor="#94A3B8"
                secureTextEntry={
                  !showPassword
                }
                autoCapitalize="none"
                autoCorrect={
                  false
                }
                autoComplete="new-password"
                textContentType="newPassword"
                style={
                  styles.passwordInput
                }
              />

              <Pressable
                onPress={() =>
                  setShowPassword(
                    (value) =>
                      !value
                  )
                }
                style={
                  styles.eyeButton
                }
                hitSlop={10}
              >
                <Ionicons
                  name={
                    showPassword
                      ? "eye-off-outline"
                      : "eye-outline"
                  }
                  size={22}
                  color="#64748B"
                />
              </Pressable>
            </View>

            <Text
              style={
                styles.helperText
              }
            >
              Use at least 8
              characters.
            </Text>
          </View>


          {/* CONFIRM PASSWORD */}
          <View
            style={
              styles.formGroup
            }
          >
            <Text
              style={
                styles.label
              }
            >
              Confirm Password
            </Text>

            <View
              style={
                styles.passwordContainer
              }
            >
              <TextInput
                value={
                  confirmPassword
                }
                onChangeText={
                  setConfirmPassword
                }
                placeholder="Enter password again"
                placeholderTextColor="#94A3B8"
                secureTextEntry={
                  !showConfirmPassword
                }
                autoCapitalize="none"
                autoCorrect={
                  false
                }
                autoComplete="new-password"
                textContentType="newPassword"
                style={
                  styles.passwordInput
                }
              />

              <Pressable
                onPress={() =>
                  setShowConfirmPassword(
                    (value) =>
                      !value
                  )
                }
                style={
                  styles.eyeButton
                }
                hitSlop={10}
              >
                <Ionicons
                  name={
                    showConfirmPassword
                      ? "eye-off-outline"
                      : "eye-outline"
                  }
                  size={22}
                  color="#64748B"
                />
              </Pressable>
            </View>
          </View>


          {/* CREATE ACCOUNT */}
          <Pressable
            disabled={loading}
            onPress={
              handleRegister
            }
            style={({
              pressed,
            }) => [
              styles.registerButton,

              loading &&
                styles.registerButtonDisabled,

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
                    styles.registerButtonText
                  }
                >
                  Creating
                  account...
                </Text>
              </View>
            ) : (
              <Text
                style={
                  styles.registerButtonText
                }
              >
                Create Account
              </Text>
            )}
          </Pressable>


          {/* LOGIN */}
          <View
            style={
              styles.loginRow
            }
          >
            <Text
              style={
                styles.loginText
              }
            >
              Already have an
              account?
            </Text>

            <Pressable
              onPress={() =>
                router.replace(
                  "/"
                )
              }
            >
              <Text
                style={
                  styles.loginLink
                }
              >
                Login
              </Text>
            </Pressable>
          </View>


          {/* INFO */}
          <View
            style={
              styles.infoBox
            }
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color="#0F766E"
              style={
                styles.infoIcon
              }
            />

            <Text
              style={
                styles.infoText
              }
            >
              Registration is for
              patients only. Your
              email must be verified
              before you can login.
              Doctor and staff
              accounts are created by
              the clinic
              administrator.
            </Text>
          </View>

        </View>
      </ScrollView>
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
    },

    scrollContent: {
      flexGrow: 1,
      justifyContent:
        "center",
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 60,
    },

    card: {
      width: "100%",
      maxWidth: 520,
      alignSelf: "center",
      backgroundColor:
        "#FFFFFF",
      borderRadius: 22,
      padding: 28,
      borderWidth: 1,
      borderColor:
        "#E5EAF0",
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        "#F1F5F9",
      justifyContent:
        "center",
      alignItems: "center",
      alignSelf:
        "flex-start",
    },

    backIcon: {
      color: "#334155",
      fontSize: 32,
      lineHeight: 34,
    },

    logoCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor:
        "#CCFBF1",
      justifyContent:
        "center",
      alignItems: "center",
      alignSelf: "center",
      marginTop: 6,
    },

    logoIcon: {
      fontSize: 27,
    },

    logo: {
      color: "#0F766E",
      fontSize: 30,
      fontWeight: "900",
      textAlign: "center",
      marginTop: 10,
    },

    subtitle: {
      color: "#64748B",
      textAlign: "center",
      fontSize: 12,
      marginTop: 3,
    },

    heading: {
      color: "#172033",
      fontSize: 23,
      fontWeight: "800",
      marginTop: 30,
    },

    description: {
      color: "#64748B",
      fontSize: 12,
      lineHeight: 18,
      marginTop: 6,
      marginBottom: 22,
    },

    formGroup: {
      marginBottom: 16,
    },

    label: {
      color: "#334155",
      fontSize: 12,
      fontWeight: "700",
      marginBottom: 7,
    },

    input: {
      backgroundColor:
        "#F8FAFC",
      borderWidth: 1,
      borderColor:
        "#E2E8F0",
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      color: "#172033",
      fontSize: 14,
    },

    passwordContainer: {
      minHeight: 50,
      backgroundColor:
        "#F8FAFC",
      borderWidth: 1,
      borderColor:
        "#E2E8F0",
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
    },

    passwordInput: {
      flex: 1,
      paddingHorizontal: 14,
      paddingVertical: 13,
      color: "#172033",
      fontSize: 14,
    },

    eyeButton: {
      width: 50,
      height: 50,
      justifyContent:
        "center",
      alignItems: "center",
    },

    helperText: {
      color: "#94A3B8",
      fontSize: 10,
      marginTop: 5,
    },

    genderRow: {
      flexDirection: "row",
      gap: 8,
    },

    genderButton: {
      flex: 1,
      borderWidth: 1,
      borderColor:
        "#E2E8F0",
      backgroundColor:
        "#FFFFFF",
      borderRadius: 11,
      paddingVertical: 12,
      paddingHorizontal: 8,
      alignItems: "center",
      justifyContent:
        "center",
      flexDirection: "row",
    },

    genderButtonSelected: {
      backgroundColor:
        "#F0FDFA",
      borderColor:
        "#0F766E",
    },

    radioOuter: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 2,
      borderColor:
        "#CBD5E1",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 6,
    },

    radioOuterSelected: {
      borderColor:
        "#0F766E",
    },

    radioInner: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor:
        "#0F766E",
    },

    genderText: {
      color: "#64748B",
      fontSize: 11,
      fontWeight: "700",
    },

    genderTextSelected: {
      color: "#0F766E",
    },

    registerButton: {
      backgroundColor:
        "#0F766E",
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 8,
    },

    registerButtonDisabled: {
      opacity: 0.6,
    },

    registerButtonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
    },

    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    loginRow: {
      flexDirection: "row",
      justifyContent:
        "center",
      alignItems: "center",
      marginTop: 20,
      gap: 5,
    },

    loginText: {
      color: "#64748B",
      fontSize: 12,
    },

    loginLink: {
      color: "#0F766E",
      fontSize: 12,
      fontWeight: "800",
    },

    infoBox: {
      backgroundColor:
        "#F0FDFA",
      borderWidth: 1,
      borderColor:
        "#CCFBF1",
      borderRadius: 12,
      padding: 12,
      flexDirection: "row",
      alignItems:
        "flex-start",
      marginTop: 20,
    },

    infoIcon: {
      marginRight: 8,
      marginTop: 1,
    },

    infoText: {
      flex: 1,
      color: "#475569",
      fontSize: 10,
      lineHeight: 16,
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