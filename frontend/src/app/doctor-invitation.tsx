import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { apiRequest } from "../api/client";

type InvitationPreview = {
  clinic: {
    id: number;
    name: string;
  };
  doctor_name: string;
};

export default function DoctorInvitationScreen() {
  const params = useLocalSearchParams<{
    token?: string;
  }>();
  const token =
    typeof params.token === "string" ? params.token : "";

  const [invitation, setInvitation] =
    useState<InvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadInvitation() {
      if (!token) {
        setError("Invitation link is missing its token.");
        setLoading(false);
        return;
      }

      try {
        const response = await apiRequest(
          "/api/clinics/invitations/preview",
          {
            method: "POST",
            body: JSON.stringify({ token }),
          }
        );

        if (active) {
          setInvitation(response);
        }
      } catch (requestError: any) {
        if (active) {
          setError(
            requestError?.message ||
              "This invitation is invalid or has expired."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadInvitation();
    return () => {
      active = false;
    };
  }, [token]);

  const approveInvitation = async () => {
    try {
      setApproving(true);
      setError("");

      await apiRequest(
        "/api/clinics/invitations/approve",
        {
          method: "POST",
          body: JSON.stringify({ token }),
        }
      );

      setSuccess(true);
    } catch (requestError: any) {
      setError(
        requestError?.message ||
          "Unable to approve this clinic invitation."
      );
    } finally {
      setApproving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.brand}>SmartClinic</Text>
        <Text style={styles.title}>
          {success
            ? "Invitation approved"
            : "Doctor clinic invitation"}
        </Text>

        {loading ? (
          <ActivityIndicator
            color="#0F766E"
            size="large"
            style={styles.loader}
          />
        ) : null}

        {!loading && invitation && !success ? (
          <>
            <Text style={styles.body}>
              Hello {invitation.doctor_name}, you have been invited
              to join:
            </Text>
            <Text style={styles.clinicName}>
              {invitation.clinic.name}
            </Text>
            <Text style={styles.body}>
              Approving links this clinic to your existing
              SmartClinic doctor account.
            </Text>
            <Pressable
              disabled={approving}
              onPress={approveInvitation}
              style={[
                styles.button,
                approving && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.buttonText}>
                {approving ? "Approving..." : "Approve invitation"}
              </Text>
            </Pressable>
          </>
        ) : null}

        {success ? (
          <>
            <Text style={styles.body}>
              {invitation?.clinic.name} is now linked to your
              SmartClinic doctor account. Sign in with your existing
              email and password.
            </Text>
            <Pressable
              onPress={() => router.replace("/")}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Go to login</Text>
            </Pressable>
          </>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F6F8FB",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  brand: {
    color: "#0F766E",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  title: {
    color: "#172033",
    fontSize: 23,
    fontWeight: "900",
    marginBottom: 16,
  },
  body: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 12,
  },
  clinicName: {
    color: "#134E4A",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  loader: {
    marginVertical: 24,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#0F766E",
    marginTop: 10,
    paddingHorizontal: 16,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  error: {
    color: "#B91C1C",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 14,
  },
});
