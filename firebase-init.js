const firebaseConfig = {
  apiKey: "AIzaSyCQSarHizvEeIvUUAMM61QBbItLx6X5PZY",
  authDomain: "surakshav2-ac01e.firebaseapp.com",
  projectId: "surakshav2-ac01e",
  storageBucket: "surakshav2-ac01e.firebasestorage.app",
  messagingSenderId: "525915624210",
  appId: "1:525915624210:web:833daa583feb128e6c99cb",
  measurementId: "G-S8YB2THD51"
};


import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Make auth and db globally accessible on the window object
window.firebaseAuth = auth;
window.firebaseDb = db;

console.log("Firebase initialized!");