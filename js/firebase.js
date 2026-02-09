// studyapp/js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCeAxPKmoIzbmbK8MM-lDRJBtJFjWaLR-A",
  authDomain: "studyapp-debb8.firebaseapp.com",
  projectId: "studyapp-debb8",
  storageBucket: "studyapp-debb8.firebasestorage.app",
  messagingSenderId: "742083836001",
  appId: "1:742083836001:web:e15fa7958b088859a61220"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
