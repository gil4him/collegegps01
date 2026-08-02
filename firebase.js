const { initializeApp } = require("firebase/app");

const firebaseConfig = {
  apiKey: "AIzaSyCtvbt4zjwnNGw_180NrDI2z63k6nvA5VY",
  authDomain: "collegegps01.firebaseapp.com",
  projectId: "collegegps01",
  storageBucket: "collegegps01.firebasestorage.app",
  messagingSenderId: "417556717886",
  appId: "1:417556717886:web:c46579c846de75ce7d8c6f",
  measurementId: "G-FMHHHGL2S5",
};

const app = initializeApp(firebaseConfig);

module.exports = { app };
