function readPublic(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export interface FirebasePublicConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export function getFirebasePublicConfig(): FirebasePublicConfig | null {
  const apiKey = readPublic("NEXT_PUBLIC_FIREBASE_API_KEY");
  const authDomain = readPublic("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  const projectId = readPublic("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  const storageBucket = readPublic("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
  const messagingSenderId = readPublic("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
  const appId = readPublic("NEXT_PUBLIC_FIREBASE_APP_ID");

  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId: readPublic("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"),
  };
}

export function isFirebaseConfigured(): boolean {
  return getFirebasePublicConfig() !== null;
}

export function isDemoMode(): boolean {
  return readPublic("NEXT_PUBLIC_DEMO_MODE") === "true" || !isFirebaseConfigured();
}

export function getAdminCredentials(): {
  projectId: string;
  clientEmail: string;
  privateKey: string;
} | null {
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return { projectId, clientEmail, privateKey };
}
