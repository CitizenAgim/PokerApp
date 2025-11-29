// Import the functions you need from the SDKs you need
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
//@ts-ignore
import { Auth, getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBRm4-ITRtxhDF29KDxW-1I0OnM5P5z75s",
  authDomain: "pokerapp-6e1fe.firebaseapp.com",
  projectId: "pokerapp-6e1fe",
  storageBucket: "pokerapp-6e1fe.firebasestorage.app",
  messagingSenderId: "432275305630",
  appId: "1:432275305630:web:3cd9bd40db2404c460778f",
  measurementId: "G-KQ7J65W9Q5"
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
  db = getFirestore(app);
} else {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
}

export { app, auth, db };

