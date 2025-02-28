import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, push, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCzP8cTRHQdesQf_P867bPzbNOTlal480Q",
  authDomain: "optimus-8c58b.firebaseapp.com",
  databaseURL: "https://optimus-8c58b-default-rtdb.firebaseio.com",
  projectId: "optimus-8c58b",
  storageBucket: "optimus-8c58b.firebasestorage.app",
  messagingSenderId: "879501239544",
  appId: "1:879501239544:web:3015f9549c9c6908d2470d",
  measurementId: "G-7LHPQ8Z1LJ"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database, ref, set, push, onValue };
