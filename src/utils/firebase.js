// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBwJ3IsHCFctaA6lHNHHfxZFEx1YgD1Xfo",
  authDomain: "heavenssystems.firebaseapp.com",
  projectId: "heavenssystems",
  storageBucket: "heavenssystems.firebasestorage.app",
  messagingSenderId: "861036188718",
  appId: "1:861036188718:web:64d3536b8d91d0abbffbbf"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);