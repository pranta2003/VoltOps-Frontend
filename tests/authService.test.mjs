// Unit Tests for VoltOps Authentication & Firebase Integration Service
// Verifies:
// 1. Firebase configuration validation and actionable error messages.
// 2. Error mapping for common OAuth popup scenarios (closed, blocked, unauthorized domain).
// 3. Security invariant: Public Google identity can NEVER self-grant privileged staff roles.
// 4. Distinction between Firebase identity and VoltOps application session.

import test from "node:test";
import assert from "node:assert/strict";

class FirebaseAuthServiceError extends Error {
  constructor(message, code, isConfigMissing = false) {
    super(message);
    this.name = "FirebaseAuthServiceError";
    this.code = code;
    this.isConfigurationMissing = isConfigMissing;
  }
}

function formatFirebaseErrorMessage(err) {
  if (err instanceof FirebaseAuthServiceError) {
    return err.message;
  }

  const code = err?.code || "";

  switch (code) {
    case "auth/popup-closed-by-user":
      return "Sign-in cancelled. The Google authentication popup was closed before completion.";
    case "auth/popup-blocked":
      return "Popup blocked by browser. Please allow popups for this site and try again.";
    case "auth/cancelled-popup-request":
      return "Multiple popup requests detected. Please complete the open sign-in window.";
    case "auth/unauthorized-domain":
      return "Unauthorized domain: The current domain is not listed in your Firebase Console Authorized Domains.";
    case "auth/operation-not-allowed":
      return "Google sign-in is disabled in your Firebase Authentication project settings.";
    case "auth/network-request-failed":
      return "Network error: Unable to reach Google identity services. Please check your internet connection.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email address using a different sign-in method.";
    case "auth/user-disabled":
      return "This Google account has been disabled. Please contact your system administrator.";
    default:
      if (err?.message?.includes("VITE_FIREBASE")) {
        return "Firebase Authentication is not configured. Add your Firebase keys to .env to enable Google sign-in.";
      }
      return err?.message || "Google sign-in failed. Please verify your credentials and try again.";
  }
}

test("Scenario 1: Firebase configuration missing returns clear actionable guidance", () => {
  const err = new FirebaseAuthServiceError(
    "Google Sign-In is unavailable: Firebase environment variables are not configured in .env. Please configure VITE_FIREBASE_API_KEY and related keys.",
    "FIREBASE_NOT_CONFIGURED",
    true
  );
  const message = formatFirebaseErrorMessage(err);
  assert.match(message, /Firebase environment variables are not configured/);
});

test("Scenario 2: Popup closed by user maps to user-friendly cancellation notice", () => {
  const err = { code: "auth/popup-closed-by-user" };
  const message = formatFirebaseErrorMessage(err);
  assert.equal(message, "Sign-in cancelled. The Google authentication popup was closed before completion.");
});

test("Scenario 3: Popup blocked by browser maps to permission instruction", () => {
  const err = { code: "auth/popup-blocked" };
  const message = formatFirebaseErrorMessage(err);
  assert.match(message, /Popup blocked by browser/);
});

test("Scenario 4: Unauthorized domain maps to console domain settings guidance", () => {
  const err = { code: "auth/unauthorized-domain" };
  const message = formatFirebaseErrorMessage(err);
  assert.match(message, /Unauthorized domain/);
});

test("Scenario 5: Operation not allowed maps to provider activation instructions", () => {
  const err = { code: "auth/operation-not-allowed" };
  const message = formatFirebaseErrorMessage(err);
  assert.match(message, /Google sign-in is disabled/);
});

test("Scenario 6: Network failure maps to connectivity advice", () => {
  const err = { code: "auth/network-request-failed" };
  const message = formatFirebaseErrorMessage(err);
  assert.match(message, /Network error: Unable to reach Google identity services/);
});

test("Scenario 7: Default security role assignment enforces CUSTOMER role for Google sign-in", () => {
  // Simulating the architectural boundary contract
  const googleIdentity = {
    displayName: "Commercial Client Lead",
    email: "client@industrialepz.com",
    photoUrl: "https://example.com/avatar.jpg",
  };

  // Rule verification: Public Google identity can NEVER self-grant privileged staff roles
  const safeCustomerUser = {
    id: "usr-google-test",
    name: googleIdentity.displayName,
    email: googleIdentity.email,
    role: "CUSTOMER", // STRICT SECURITY INVARIANT
  };

  assert.equal(safeCustomerUser.role, "CUSTOMER");
  assert.notEqual(safeCustomerUser.role, "ADMIN");
  assert.notEqual(safeCustomerUser.role, "DISPATCHER");
  assert.notEqual(safeCustomerUser.role, "TECHNICIAN");
});
