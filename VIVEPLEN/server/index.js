// server/index.js
import express from "express";
import fs from "fs";
import admin from "firebase-admin";
import cors from "cors";

// --- CONFIGURACIÓN DE FIREBASE ADMIN ---
const serviceAccount = JSON.parse(
  fs.readFileSync(new URL("./firebase-credentials.json", import.meta.url))
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://viveplen-int.firebaseio.com"
});

const db = admin.firestore();
const app = express();
const PORT = 3000;

// --- MIDDLEWARE ---
app.use(cors({ origin: "*" })); // Para pruebas locales
app.use(express.json());

// --- ENDPOINTS DE PRUEBA ---
app.get("/", (req, res) => {
  res.send("Servidor activo en /");
});

// --- REGISTRO DE USUARIO ---
app.post("/api/register", async (req, res) => {
  const { nombre, edad, estatura, peso, email, password } = req.body;

  try {
    // Crear usuario en Firebase Auth
    const userRecord = await admin.auth().createUser({ email, password });

    // Guardar datos en Firestore
    await db.collection("usuarios").doc(userRecord.uid).set({
      nombre,
      edad,
      estatura,
      peso,
      email,
      role: "user"
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Error register:", err.message);
    res.json({ success: false, error: err.message });
  }
});

// --- LOGIN DE USUARIO ---
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Obtener usuario de Auth
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log("Firebase Auth UID:", userRecord.uid);

    // Obtener documento Firestore
    const userDoc = await db.collection("usuarios").doc(userRecord.uid).get();
    console.log("Firestore Doc exists:", userDoc.exists);

    if (!userDoc.exists) {
      return res.json({ success: false, error: "Usuario no encontrado en Firestore" });
    }

    const userData = userDoc.data();

    // Para pruebas, aceptamos cualquier password (en producción deberías validar con Auth)
    res.json({ success: true, role: userData.role || "user", uid: userDoc.id });
  } catch (err) {
    console.error("Error login:", err.message);
    res.json({ success: false, error: "Usuario no encontrado o error: " + err.message });
  }
});

// --- LOGOUT ---
app.post("/api/logout", (req, res) => {
  res.json({ success: true });
});

// --- INICIAR SERVIDOR ---
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
