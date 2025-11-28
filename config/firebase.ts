// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
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
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
