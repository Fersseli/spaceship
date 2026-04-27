import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // Adicione esta linha

const firebaseConfig = {
  apiKey: "AIzaSyBwJ3IsHCFctaA6lHNHHfxZFEx1YgD1Xfo",
  authDomain: "heavenssystems.firebaseapp.com",
  projectId: "heavenssystems",
  storageBucket: "heavenssystems.firebasestorage.app",
  messagingSenderId: "861036188718",
  appId: "1:861036188718:web:64d3536b8d91d0abbffbbf"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); // Exportar o auth