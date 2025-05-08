// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDpawZZghEI9eAlx7XEx8luR-UaPxwm2Vw",
  authDomain: "tanza-fighters.firebaseapp.com",
  projectId: "tanza-fighters",
  storageBucket: "tanza-fighters.firebasestorage.app",
  messagingSenderId: "537721612057",
  appId: "1:537721612057:web:6d5c94cf1cdda34a2e4788"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
