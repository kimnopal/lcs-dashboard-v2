// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const firebaseConfig = {
//     apiKey: "AIzaSyBfWPRKj0Av3q6vE32GxMEvLpsfvW7qQrU",
//     authDomain: "test-db-27f5d.firebaseapp.com",
//     databaseURL: "https://test-db-27f5d-default-rtdb.asia-southeast1.firebasedatabase.app",
//     projectId: "test-db-27f5d",
//     storageBucket: "test-db-27f5d.firebasestorage.app",
//     messagingSenderId: "629260985258",
//     appId: "1:629260985258:web:422a72b884912395b081d3",
//     measurementId: "G-2GJRSL4HFM"
// };

const firebaseConfig = {
  apiKey: "AIzaSyDzRicoX7u82xKEdKKlMWe0wCjfAUoPLJw",
  authDomain: "testproject-2e69a.firebaseapp.com",
  databaseURL: "https://testproject-2e69a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "testproject-2e69a",
  storageBucket: "testproject-2e69a.firebasestorage.app",
  messagingSenderId: "598342802643",
  appId: "1:598342802643:web:cac81e0973d2c4e70b8826",
  measurementId: "G-QYBW8LF0BV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

export { database }