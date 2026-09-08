import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { getAdminCredentials } from "@/lib/env";

let adminApp: App | null = null;

export function getAdminApp(): App | null {
  if (adminApp) {
    return adminApp;
  }
  if (getApps().length > 0) {
    adminApp = getApps()[0] ?? null;
    return adminApp;
  }

  const credentials = getAdminCredentials();
  if (!credentials) {
    return null;
  }

  adminApp = initializeApp({
    credential: cert({
      projectId: credentials.projectId,
      clientEmail: credentials.clientEmail,
      privateKey: credentials.privateKey,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });

  return adminApp;
}

export function getAdminAuth(): Auth | null {
  const app = getAdminApp();
  return app ? getAuth(app) : null;
}

export function getAdminDb(): Firestore | null {
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
}

export function getAdminStorage(): Storage | null {
  const app = getAdminApp();
  return app ? getStorage(app) : null;
}
