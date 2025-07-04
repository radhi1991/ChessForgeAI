
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
// import { getFirestore } from 'firebase/firestore'; // Uncomment for Firestore

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// For debugging API key issues
if (typeof window !== 'undefined') {
  console.log("Firebase Init: Attempting to use Firebase API Key:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "Key Present (see next log)" : "Key NOT Present or Empty");
  if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    console.log("Firebase Init: API Key value being used:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
  }
}


// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  if (typeof window !== 'undefined') {
    console.log("Firebase Init: Firebase App Initialized.");
  }
} else {
  app = getApp();
  if (typeof window !== 'undefined') {
    console.log("Firebase Init: Firebase App already exists, getting instance.");
  }
}

const auth: Auth = getAuth(app);
// const db = getFirestore(app); // Uncomment for Firestore

export { app, auth /*, db */ };
