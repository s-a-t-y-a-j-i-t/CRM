import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

async function main() {
  if (process.env.ALLOW_SEED !== "true") {
    throw new Error("Refusing to create Super Admin. Set ALLOW_SEED=true.");
  }

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const firstName = process.env.SEED_ADMIN_FIRST_NAME ?? "Super";
  const lastName = process.env.SEED_ADMIN_LAST_NAME ?? "Admin";

  if (!email || !password) {
    throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD.");
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin credentials are required.");
  }

  const app = getApps()[0] ?? initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  const auth = getAuth(app);
  const db = getFirestore(app);

  const existing = await auth.getUserByEmail(email).catch(() => null);
  const user = existing ?? await auth.createUser({
    email,
    password,
    displayName: `${firstName} ${lastName}`,
    emailVerified: true,
  });
  await auth.setCustomUserClaims(user.uid, { role: "super_admin" });

  const now = new Date().toISOString();
  await db.collection("users").doc(user.uid).set(
    {
      id: user.uid,
      firebaseUid: user.uid,
      employeeId: "EMP-0001",
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      email,
      departmentId: "admin",
      departmentName: "Administration",
      designation: "Super Admin",
      roleId: "super_admin",
      roleName: "Super Admin",
      status: "ACTIVE",
      joiningDate: now.slice(0, 10),
      createdAt: now,
      updatedAt: now,
      createdBy: user.uid,
      updatedBy: user.uid,
    },
    { merge: true },
  );

  await db.collection("counters").doc("employeeId").set({ seq: 1 }, { merge: true });
  console.log(`Super Admin ready: ${email} (${user.uid})`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
