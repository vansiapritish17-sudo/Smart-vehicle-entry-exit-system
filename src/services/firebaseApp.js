import { initializeApp } from "firebase/app";
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// These values identify the project to Firebase; they are not secrets and ship in
// every client bundle. Access is controlled by Firestore rules and the API's token
// check, not by hiding this config. The service account key — which IS a secret —
// lives only in the backend's environment (see backend/.env.example).
const firebaseConfig = {
  apiKey: "AIzaSyCQNM9FytElmHX80tBwlgMYZDlRNSXd1y8",
  authDomain: "vehicle-monitoring-syste-25292.firebaseapp.com",
  projectId: "vehicle-monitoring-syste-25292",
  storageBucket: "vehicle-monitoring-syste-25292.firebasestorage.app",
  messagingSenderId: "805949574142",
  appId: "1:805949574142:web:085930ceeefb1ee75eceaf",
  measurementId: "G-6SCX5WBFZG",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

// Survive a page reload; Firebase refreshes the ID token in the background.
setPersistence(auth, browserLocalPersistence).catch((err) =>
  console.error("auth persistence:", err)
);
