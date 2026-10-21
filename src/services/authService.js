import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onIdTokenChanged,
  updatePassword,
} from "firebase/auth";
import { auth } from "./firebaseApp";

/**
 * Firebase Authentication wrapper.
 *
 * Sign-in happens directly against Firebase; the resulting ID token (a signed JWT)
 * is what authorises both the Firestore listeners and every call to the Spring Boot
 * API. The backend never sees a password.
 */

// Login handles are mapped onto a synthetic domain, so users still type "admin"
// rather than an email address. Must match `svems.auth.email-domain` on the backend.
const EMAIL_DOMAIN = "svems.local";

export function emailFor(username) {
  const handle = (username ?? "").trim();
  return handle.includes("@") ? handle : `${handle.toLowerCase()}@${EMAIL_DOMAIN}`;
}

export async function login(username, password) {
  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      emailFor(username),
      password
    );
    return { ok: true, user: credential.user };
  } catch (err) {
    return { ok: false, message: describeAuthError(err) };
  }
}

export function logout() {
  return firebaseSignOut(auth);
}

/**
 * Replace the signed-in user's password. Firebase requires a recent sign-in for
 * this, so the current password is verified first.
 */
export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user) return { ok: false, message: "You are not signed in." };
  try {
    await reauthenticateWithCredential(
      user,
      EmailAuthProvider.credential(user.email, currentPassword)
    );
    await updatePassword(user, newPassword);
    return { ok: true };
  } catch (err) {
    if (err?.code === "auth/weak-password") {
      return { ok: false, message: "Choose a stronger password (at least 8 characters)." };
    }
    if (["auth/invalid-credential", "auth/wrong-password"].includes(err?.code)) {
      return { ok: false, message: "Current password is incorrect." };
    }
    return { ok: false, message: describeAuthError(err) };
  }
}

/**
 * Fires on sign-in, sign-out, and on every silent token refresh (roughly hourly),
 * which is what keeps the cached token the API client sends from going stale.
 */
export function subscribeToSession(callback) {
  return onIdTokenChanged(auth, callback);
}

/** Current ID token, refreshed automatically when close to expiry. */
export async function getIdToken(forceRefresh = false) {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}

/** Role and profile fields the backend signed into the token as custom claims. */
export async function getSessionClaims(forceRefresh = false) {
  const user = auth.currentUser;
  if (!user) return null;
  const result = await user.getIdTokenResult(forceRefresh);
  return {
    uid: user.uid,
    email: user.email,
    name: result.claims.name ?? user.displayName ?? result.claims.username,
    username: result.claims.username ?? user.email?.split("@")[0],
    role: result.claims.role ?? null,
  };
}

function describeAuthError(err) {
  switch (err?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "Invalid username or password.";
    case "auth/user-disabled":
      return "This account has been deactivated. Contact an administrator.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Try again in a few minutes.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return err?.message ?? "Sign-in failed. Please try again.";
  }
}
