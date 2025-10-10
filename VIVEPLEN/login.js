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

login.addEventListener('click', (e) => {
    var email = document.getElementById('emaillog').value;
    var password = document.getElementById('passwordlog').value;
    
    signInWithEmailAndPassword(auth, email, password).then(cred => {
        alert ("Usuario logueado");
        console.log(cred.user);
    }).catch(error => {
        const errorCode = error.code;
    
        if(errorCode ==  'auth/invalid-email')
            alert('El correo no es válido');
        else if (errorCode == 'auth/user-disabled')
            alert('El usuario ha sido deshabilitado');
        else if(errorCode == 'auth/user-not-found')
            alert('El usuario no existe');
        else if(errorCode == 'auth/wrong-password')
            alert('Contraseña incorrecta');
    });
});

cerrar.addEventListener('click', (e) => {
    auth.signOut().then(() => {
        alert('Sesión cerrada');
    }).catch((error) => {
        alert('Error al cerrar sesión');
    });
})

auth.onAuthStateChanged(user => {
    if(user){
        console.log("Usuario activo");
        var email = user.emailVerified;
        if(email){
            window.open("https://www.google.com/")
        
        }else{
            auth.signOut();
        }
    }else{
        console.log("Usuario inactivo")
    }
})