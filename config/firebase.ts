// Import the functions you need from the SDKs you need
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
//@ts-ignore
import { Auth, getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { Firestore, getFirestore, initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

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
let storage: FirebaseStorage;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
  
  // Initialize Firestore with specific settings for React Native
  // Using memory cache to avoid potential persistence issues with the new SDK
  db = initializeFirestore(app, {
    localCache: memoryLocalCache(),
  });
  
  storage = getStorage(app);
} else {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, db, storage };

