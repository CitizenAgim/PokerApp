// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
let app;
let auth;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} else {
  app = getApp();
  auth = getAuth(app);
}

export { app, auth };

