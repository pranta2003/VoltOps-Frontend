import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";

export interface FirebaseEnvConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export function getFirebaseConfig(): FirebaseEnvConfig {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
}

export function isFirebaseConfigured(): boolean {
  const config = getFirebaseConfig();
  return Boolean(
    config.apiKey &&
    config.authDomain &&
    config.projectId &&
    config.appId
  );
}

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let googleAuthProvider: GoogleAuthProvider | null = null;

export function initializeFirebase(): {
  app: FirebaseApp | null;
  auth: Auth | null;
  googleProvider: GoogleAuthProvider | null;
  isConfigured: boolean;
} {
  const isConfig = isFirebaseConfigured();
  if (!isConfig) {
    return {
      app: null,
      auth: null,
      googleProvider: null,
      isConfigured: false,
    };
  }

  try {
    if (!firebaseApp) {
      const config = getFirebaseConfig();
      firebaseApp = getApps().length > 0 ? getApp() : initializeApp(config as Record<string, string>);
      firebaseAuth = getAuth(firebaseApp);
      googleAuthProvider = new GoogleAuthProvider();
      // Request standard Google profile and email scopes
      googleAuthProvider.addScope("profile");
      googleAuthProvider.addScope("email");
      googleAuthProvider.setCustomParameters({
        prompt: "select_account",
      });
    }

    return {
      app: firebaseApp,
      auth: firebaseAuth,
      googleProvider: googleAuthProvider,
      isConfigured: true,
    };
  } catch (err) {
    console.warn("[VoltOps Firebase] Initialization failed:", err);
    return {
      app: null,
      auth: null,
      googleProvider: null,
      isConfigured: false,
    };
  }
}

export { firebaseAuth, googleAuthProvider };
