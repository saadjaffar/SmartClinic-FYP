import { Platform } from "react-native";
import Constants from "expo-constants";
import { router } from "expo-router";

import {
  clearAuth,
  getToken,
} from "../storage/authStorage";


// ============================================================
// DETECT CURRENT DEVELOPMENT HOST
// ============================================================

function getDetectedHost(): string | null {

  // ----------------------------------------------------------
  // WEB
  // ----------------------------------------------------------

  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      return window.location.hostname || "localhost";
    }

    return "localhost";
  }


  // ----------------------------------------------------------
  // EXPO GO / ANDROID / IOS
  // ----------------------------------------------------------

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost;


  if (!hostUri) {
    return null;
  }


  // Usually something like:
  // 192.168.1.7:8081

  const cleanHost =
    hostUri
      .replace(/^https?:\/\//, "")
      .split(":")[0];


  return cleanHost || null;
}


// ============================================================
// API BASE URL
// ============================================================

function getApiBaseUrl(): string {

  const detectedHost =
    getDetectedHost();


  if (detectedHost) {
    return `http://${detectedHost}:5000`;
  }


  // Optional fallback
  const envUrl =
    process.env.EXPO_PUBLIC_API_URL?.trim();


  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }


  throw new Error(
    "Unable to determine SmartClinic API address."
  );
}


// Do not calculate at module load time.
// Calculate only when an API request is actually made.
export function getApiUrl(): string {
  return getApiBaseUrl();
}


// ============================================================
// PUBLIC AUTH ENDPOINTS
// ============================================================

const PUBLIC_AUTH_ENDPOINTS =
  new Set([
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/verify-email",
    "/api/auth/resend-verification",
    "/api/auth/forgot-password",
    "/api/auth/verify-reset-code",
    "/api/auth/reset-password",
  ]);


// ============================================================
// API REQUEST
// ============================================================

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
) {

  const API_BASE_URL =
    getApiBaseUrl();


  const token =
    await getToken();


  const headers: Record<string, string> = {
    "Content-Type": "application/json",

    ...(options.headers as
      | Record<string, string>
      | undefined),
  };


  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }


  let response: Response;


  try {

    response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        ...options,
        headers,
      }
    );

  } catch {

    throw new Error(
      "Unable to connect to the SmartClinic server. Make sure the backend is running and the phone and laptop are connected to the same Wi-Fi."
    );
  }


  let data: any = {};


  try {
    data =
      await response.json();
  } catch {
    data = {};
  }


  const isPublicAuthEndpoint =
    PUBLIC_AUTH_ENDPOINTS.has(endpoint);


  // =========================================================
  // EXPIRED / INVALID SESSION
  // =========================================================

  if (
    response.status === 401 &&
    !isPublicAuthEndpoint
  ) {

    await clearAuth();

    router.replace("/");

    throw new Error(
      data?.message ||
        "Your session has expired. Please login again."
    );
  }


  // =========================================================
  // OTHER API ERRORS
  // =========================================================

  if (!response.ok) {

    throw new Error(
      data?.message ||
        data?.error ||
        "Something went wrong. Please try again."
    );
  }


  return data;
}