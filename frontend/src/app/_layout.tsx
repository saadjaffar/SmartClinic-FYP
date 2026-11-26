import React, {
  useEffect,
} from "react";

import {
  StatusBar,
} from "react-native";
import {
  Stack,
  type Href,
  useRouter,
  useSegments,
} from "expo-router";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  clearAuth,
  getToken,
  getUser,
} from "../storage/authStorage";


// ============================================================
// ROUTES
// ============================================================

const PUBLIC_ROUTES = new Set([
  "",
  "register",
  "verify-email",
  "forgot-password",
]);

const PATIENT_ROUTES = new Set([
  "patient",
  "doctors",
  "booking",
  "appointments",
  "queue",
  "consultations",
  "profile",
]);

const DOCTOR_ROUTES = new Set([
  "doctor",
  "doctor-queue",
  "doctor-consultation",
  "doctor-schedule",
]);

const ADMIN_ROUTES = new Set([
  "admin",
  "admin-doctors",
  "admin-receptionists",
  "admin-clinics",
]);

const CLINIC_ADMIN_ROUTES = new Set([
  "clinic-admin",
]);

const RECEPTIONIST_ROUTES = new Set([
  "receptionist",
  "receptionist-appointments",
  "receptionist-live-queue",
  "receptionist-emergency",
  "receptionist-walk-in",
]);

const CHANGE_PASSWORD_ROUTE =
  "change-password";


// ============================================================
// HOME ROUTE
// ============================================================

function getHomeRoute(
  role?: string
): Href | null {
  if (role === "patient") {
    return "/patient";
  }

  if (role === "doctor") {
    return "/doctor";
  }

  if (role === "admin") {
    return "/admin";
  }

  if (role === "clinic_admin") {
    return "/clinic-admin";
  }

  if (role === "receptionist") {
    return "/receptionist";
  }

  return null;
}


// ============================================================
// ROLE ROUTE CHECK
// ============================================================

function isAllowedRoute(
  route: string,
  role?: string
) {
  if (role === "patient") {
    return PATIENT_ROUTES.has(
      route
    );
  }

  if (role === "doctor") {
    return DOCTOR_ROUTES.has(
      route
    );
  }

  if (role === "admin") {
    return ADMIN_ROUTES.has(
      route
    );
  }

  if (role === "clinic_admin") {
    return CLINIC_ADMIN_ROUTES.has(
      route
    );
  }

  if (
    role === "receptionist"
  ) {
    return RECEPTIONIST_ROUTES.has(
      route
    );
  }

  return false;
}


// ============================================================
// PROTECTED ROUTE CHECK
// ============================================================

function isProtectedRoute(
  route: string
) {
  return (
    PATIENT_ROUTES.has(route)
    || DOCTOR_ROUTES.has(route)
    || ADMIN_ROUTES.has(route)
    || CLINIC_ADMIN_ROUTES.has(route)
    || RECEPTIONIST_ROUTES.has(route)
    || route === CHANGE_PASSWORD_ROUTE
  );
}


// ============================================================
// ROOT LAYOUT
// ============================================================

export default function RootLayout() {
  const router =
    useRouter();

  const segments =
    useSegments();


  useEffect(
    () => {
      let cancelled =
        false;


      async function guardRoute() {
        const route =
          String(
            segments[0] || ""
          );


        const [
          token,
          user,
        ] =
          await Promise.all([
            getToken(),
            getUser(),
          ]);


        if (cancelled) {
          return;
        }


        // ====================================================
        // NOT LOGGED IN
        // ====================================================

        if (
          !token
          || !user
        ) {
          if (
            isProtectedRoute(
              route
            )
          ) {
            await clearAuth();

            router.replace(
              "/"
            );
          }

          return;
        }


        const role =
          user?.role;


        const isStaff =
          role === "doctor"
          || role ===
            "receptionist"
          || role === "clinic_admin";


        const mustChangePassword =
          isStaff
          && user?.must_change_password
            === true;


        // ====================================================
        // FORCE STAFF PASSWORD CHANGE
        // ====================================================

        if (
          mustChangePassword
        ) {
          if (
            route !==
            CHANGE_PASSWORD_ROUTE
          ) {
            router.replace("/change-password" as Href);
          }

          return;
        }


        // ====================================================
        // STAFF ALREADY CHANGED PASSWORD
        //
        // Block manual /change-password access.
        // ====================================================

        if (
          route ===
          CHANGE_PASSWORD_ROUTE
        ) {
          const homeRoute =
            getHomeRoute(
              role
            );


          if (homeRoute) {
            router.replace(
              homeRoute
            );

            return;
          }


          await clearAuth();

          router.replace(
            "/"
          );

          return;
        }


        // ====================================================
        // LOGGED-IN USER ON PUBLIC PAGE
        // ====================================================

        if (
          PUBLIC_ROUTES.has(
            route
          )
        ) {
          const homeRoute =
            getHomeRoute(
              role
            );


          if (homeRoute) {
            router.replace(
              homeRoute
            );
          }

          return;
        }


        // ====================================================
        // WRONG ROLE ACCESS
        // ====================================================

        if (
          isProtectedRoute(
            route
          )
          &&
          !isAllowedRoute(
            route,
            role
          )
        ) {
          const homeRoute =
            getHomeRoute(
              role
            );


          if (homeRoute) {
            router.replace(
              homeRoute
            );

            return;
          }


          await clearAuth();

          router.replace(
            "/"
          );
        }
      }


      guardRoute();


      return () => {
        cancelled = true;
      };
    },
    [
      segments,
      router,
    ]
  );


  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#F6F8FB" }}
        edges={["top", "bottom"]}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#F6F8FB"
          translucent={false}
        />
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}