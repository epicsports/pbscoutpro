import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Import Twojego głównego komponentu
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDczmTRcZHXxsg5PTPDtDZrPel3qc7JUVY",
  authDomain: "pbscoutpro.firebaseapp.com",
  projectId: "pbscoutpro",
  storageBucket: "pbscoutpro.firebasestorage.app",
  messagingSenderId: "301394054921",
  appId: "1:301394054921:web:fccf50371b1398dd8a8dd8",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// To jest kluczowy fragment, którego brakuje:
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);