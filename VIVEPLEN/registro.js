import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.2/firebase-app.js';

import {sendEmailVerification, getAuth, signInWithPopup, 
    createUserWithEmailAndPassword, signInWithEmailAndPassword,  
    onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/9.0.2/firebase-auth.js';


const firebaseConfig = {
  apiKey: "AIzaSyCk3ZTb7xeZV4nlKtGJC6CMM9izb4G8D5E",
  authDomain: "integradora-14ad6.firebaseapp.com",
  projectId: "integradora-14ad6",
  storageBucket: "integradora-14ad6.firebasestorage.app",
  messagingSenderId: "1070485584592",
  appId: "1:1070485584592:web:85f5159170d5171467bcd5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

registro.addEventListener('click', (e) => {
    var email = document.getElementById('emailreg').value;
    var password = document.getElementById('passwordreg').value;

    createUserWithEmailAndPassword(auth, email, password).then(cred => {
        alert ("Usuario creado");
        sendEmailVerification(auth.currentUser).then(() => {
            alert('Se ha enviado un correo de verificación');
        })
    }).catch(error => {
        const errorCode = error.code;

        if(errorCode == 'auth/email-already-in-use')
            alert('El correo ya está en uso');
        else if (errorCode == 'auth/invalid-email')
            alert('El correo no es válido');
        else if(errorCode == 'auth/weak-password')
            alert('La contraseña debe tener al menos 6 caracteres');
    });
});