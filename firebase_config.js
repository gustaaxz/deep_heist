import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyABx53ZNUfAX9K8oUfiTsD7WcWXXENCz2k",
  authDomain: "deep-heist.firebaseapp.com",
  databaseURL: "https://deep-heist-default-rtdb.firebaseio.com",
  projectId: "deep-heist",
  storageBucket: "deep-heist.firebasestorage.app",
  messagingSenderId: "467368792789",
  appId: "1:467368792789:web:6d14cf2f84ba9bfd31885c",
  measurementId: "G-CZ7049X0L9"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
