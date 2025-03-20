import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, push, onValue, get} from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBojpn_RGeduEsWii3aMZCCN9dJPIaShmE",
  authDomain: "convertidorjson.firebaseapp.com",
  databaseURL: "https://convertidorjson-default-rtdb.firebaseio.com",
  projectId: "convertidorjson",
  storageBucket: "convertidorjson.firebasestorage.app",
  messagingSenderId: "370624735063",
  appId: "1:370624735063:web:3efe6dd8adfc378b5ec012",
  measurementId: "G-LCCXD22XJ3"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database, ref, set, push, onValue,get };
