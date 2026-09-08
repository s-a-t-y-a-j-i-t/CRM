import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFirebasePublicConfig } from "@/lib/env";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  const config = getFirebasePublicConfig();
  if (!config) {
    return null;
  }
  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(config);
  }
  return app;
}

export function getClientAuth(): Auth | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!auth) {
    auth = getAuth(firebaseApp);
  }
  return auth;
}

export function getClientDb(): Firestore | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!db) {
    db = getFirestore(firebaseApp);
  }
  return db;
}

export function getClientStorage(): FirebaseStorage | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!storage) {
    storage = getStorage(firebaseApp);
  }
  return storage;
}
