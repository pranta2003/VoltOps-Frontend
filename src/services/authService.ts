import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  AuthError,
} from "firebase/auth";
import { initializeFirebase } from "./firebase";
import api from "../api/axios";
import { AuthUser, LoginResponse } from "../types";

// ============================================================================
// ARCHITECTURAL CONTRACT: FIREBASE IDENTITY & VOLTOPS APPLICATION JWT
// ============================================================================
// Google Account -> Firebase Google Auth -> Firebase ID Token
// -> Future VoltOps Backend (/api/auth/google)
// -> Backend verifies Firebase ID token via Firebase Admin SDK
// -> Backend looks up / creates VoltOps User Account with role
// -> Backend issues official VoltOps Application JWT (or HttpOnly cookie session)
// ============================================================================

export interface BackendGoogleExchangeDTO {
  idToken: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
}

export interface BackendGoogleExchangeResponse {
  token: string;
  user: AuthUser;
  isNewUser?: boolean;
}

export class FirebaseAuthServiceError extends Error {
  code: string;
  isConfigurationMissing: boolean;
  constructor(message: string, code: string, isConfigMissing = false) {
    super(message);
    this.name = "FirebaseAuthServiceError";
    this.code = code;
    this.isConfigurationMissing = isConfigMissing;
  }
}

/**
 * Maps raw Firebase authentication error codes into clear, user-friendly messages.
 */
export function formatFirebaseErrorMessage(err: any): string {
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

export const authService = {
  /**
   * Check if Firebase client configuration is available in environment.
   */
  isConfigured(): boolean {
    const { isConfigured } = initializeFirebase();
    return isConfigured;
  },

  /**
   * Authenticate user with Google via Firebase Popup.
   * Obtains the Firebase ID token and delivers it to the backend exchange adapter.
   */
  async signInWithGoogle(): Promise<{
    firebaseUser: FirebaseUser;
    idToken: string;
    voltOpsUser: AuthUser;
    voltOpsToken: string;
    isOfflineMock: boolean;
  }> {
    const { auth, googleProvider, isConfigured } = initializeFirebase();

    if (!isConfigured || !auth || !googleProvider) {
      throw new FirebaseAuthServiceError(
        "Google Sign-In is unavailable: Firebase environment variables are not configured in .env. Please configure VITE_FIREBASE_API_KEY and related keys.",
        "FIREBASE_NOT_CONFIGURED",
        true
      );
    }

    // 1. Trigger Firebase Google Popup sign-in
    const userCredential = await signInWithPopup(auth, googleProvider);
    const firebaseUser = userCredential.user;

    // 2. Obtain fresh Firebase ID Token
    const idToken = await firebaseUser.getIdToken();

    // 3. Exchange Firebase ID Token with VoltOps Backend
    const exchangeResult = await this.exchangeFirebaseTokenWithBackend({
      idToken,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoUrl: firebaseUser.photoURL,
    });

    return {
      firebaseUser,
      idToken,
      voltOpsUser: exchangeResult.user,
      voltOpsToken: exchangeResult.token,
      isOfflineMock: exchangeResult.isOfflineMock,
    };
  },

  /**
   * Future Backend Integration Boundary:
   * Passes the Firebase ID token to the backend endpoint POST /api/auth/google
   * If the backend is not yet implemented or unreachable, safely provides a structured
   * customer role session boundary labeled as [Local Google Session].
   * NEVER grants privileged ADMIN or DISPATCHER roles to arbitrary Google accounts.
   */
  async exchangeFirebaseTokenWithBackend(
    dto: BackendGoogleExchangeDTO
  ): Promise<{ user: AuthUser; token: string; isOfflineMock: boolean }> {
    try {
      const res = await api.post<BackendGoogleExchangeResponse>("/auth/google", dto);
      if (res.data?.token && res.data?.user) {
        return {
          user: res.data.user,
          token: res.data.token,
          isOfflineMock: false,
        };
      }
    } catch {
      // Backend not yet running or /auth/google endpoint not yet mounted in backend repo.
      // Fall through to clean frontend identity boundary:
    }

    // SAFE FRONTEND BOUNDARY:
    // When backend is not reachable, map verified Google identity strictly to CUSTOMER role.
    // Privileged roles (ADMIN, DISPATCHER, TECHNICIAN) can NEVER be self-granted.
    const safeCustomerUser: AuthUser = {
      id: `usr-google-${Date.now()}`,
      name: dto.displayName || "Google User",
      email: dto.email || "google-user@voltops.local",
      role: "CUSTOMER", // Strict security rule: default public login role is always CUSTOMER
      initials: (dto.displayName || "GU")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      avatarUrl: dto.photoUrl || undefined,
      company: "Commercial Facility Client",
    };

    const simulatedToken = `demo-google-session-${Date.now()}`;

    return {
      user: safeCustomerUser,
      token: simulatedToken,
      isOfflineMock: true,
    };
  },

  /**
   * Firebase Auth state change observer.
   */
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
    const { auth } = initializeFirebase();
    if (!auth) {
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(auth, callback);
  },

  /**
   * Sign out from Firebase identity session.
   */
  async signOut(): Promise<void> {
    const { auth } = initializeFirebase();
    if (auth) {
      try {
        await firebaseSignOut(auth);
      } catch (err) {
        console.warn("[VoltOps Auth] Firebase sign out error:", err);
      }
    }
  },
};
