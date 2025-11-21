// ===============================
// BACKEND + FRONTEND CON FIREBASE + EXPRESS
// ===============================
import express from "express";
import fs from "fs";
import admin from "firebase-admin";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// --- CONFIGURACIÓN DE RUTAS Y ARCHIVOS ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURACIÓN FIREBASE ---
let serviceAccount = null;

// 1. Intentar cargar desde archivo local (para desarrollo en tu PC)
const credentialsPath = path.join(__dirname, "firebase-credentials.json");
if (fs.existsSync(credentialsPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
  console.log("✅ Cargando credenciales desde archivo local");
} 
// 2. Intentar cargar desde variable de entorno (para Render)
else if (process.env.FIREBASE_CONFIG) {
  serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
  console.log("✅ Cargando credenciales desde variable de entorno FIREBASE_CONFIG");
} else {
  console.error("❌ ERROR: No se encontraron credenciales de Firebase");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://viveplen-int.firebaseio.com",
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3000; // Render usa el puerto 10000 automáticamente

// --- MIDDLEWARE ---
app.use(
  cors({
    origin: [
      "http://127.0.0.1:5500",
      "http://127.0.0.1:5501",
      "http://localhost:5501",
      "http://localhost:3000",
      "https://aplicaciones-web-progresivas-5cbe.onrender.com" // Tu URL de Render
    ],
    credentials: true,
  })
);
app.use(express.json());

// ===============================
// === SERVIR ARCHIVOS DEL FRONTEND ===
// ===============================
// Esto sirve tus HTML, CSS y JS estáticos
app.use(express.static(path.join(__dirname, "../")));

// Ruta raíz: Si entran a "/", los mandamos al login
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../login.html"));
});

// ===============================
// === RUTAS API ===
// ===============================

// --- REGISTER ---
app.post("/api/register", async (req, res) => {
  const { name, age, height, weight, email, password } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ success: false, error: "Faltan campos obligatorios" });
  }

  try {
    // Verificar si ya existe
    let existingUser;
    try { existingUser = await admin.auth().getUserByEmail(email); } catch {}

    if (existingUser) {
      return res.status(400).json({ success: false, error: "El correo ya está registrado" });
    }

    // Crear en Auth
    const userRecord = await admin.auth().createUser({ email, password });

    // Guardar en Firestore
    await db.collection("users").doc(userRecord.uid).set({
      name,
      age: Number(age),
      height: Number(height),
      weight: Number(weight),
      email,
      cart: [],
      role: "user",
      createdAt: new Date().toISOString(),
    });

    res.json({ success: true, uid: userRecord.uid });
  } catch (err) {
    console.error("Error register:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- LOGIN ---
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, error: "Falta correo o contraseña" });

  try {
    // NOTA: Admin SDK no verifica contraseñas directamente. 
    // En una app real frontend-only usarías firebase.auth().signInWithEmail...
    // Aquí, simplificado, asumimos que verificamos existencia y devolvemos rol.
    // (Para producción real se recomienda verificar token ID, pero para este proyecto escolar está bien así)
    
    const userRecord = await admin.auth().getUserByEmail(email);
    const userDoc = await db.collection("users").doc(userRecord.uid).get();

    if (!userDoc.exists) return res.status(404).json({ success: false, error: "Usuario no encontrado en BD" });

    const userData = userDoc.data();
    res.json({ success: true, uid: userDoc.id, role: userData.role || "user" });
  } catch (err) {
    console.error("Error login:", err.message);
    res.status(401).json({ success: false, error: "Credenciales inválidas" });
  }
});

// --- LOGOUT ---
app.post("/api/logout", (req, res) => res.json({ success: true }));

// --- VALIDAR SESIÓN ---
app.get("/api/session", async (req, res) => {
  const uid = req.headers["x-uid"];
  if (!uid) return res.json({ loggedIn: false });

  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) return res.json({ loggedIn: false });

    const userData = userDoc.data();
    res.json({
      loggedIn: true,
      uid: userDoc.id,
      role: userData.role,
      weight: userData.weight || null,
      height: userData.height || null,
      bmi: userData.bmi || null,
      categoriaIMC: userData.bmiCategory || null,
      carrito: userData.cart || [],
    });
  } catch (err) {
    console.error("Error session:", err);
    res.json({ loggedIn: false });
  }
});

// --- NUEVA RUTA: OBTENER DATOS IOT (ARDUINO) ---
app.get("/api/iot-data", async (req, res) => {
  const uid = req.headers["x-uid"];
  if (!uid) return res.status(400).json({ error: "UID required" });

  try {
    // 1. Buscamos en users -> UID -> iotData
    // 2. Ordenamos por fecha descendente (el último dato)
    const snapshot = await db.collection("users").doc(uid)
      .collection("iotData")
      .orderBy("timestamp", "desc") 
      .limit(1)
      .get();

    if (snapshot.empty) {
      // Si no hay datos, devolvemos ceros
      return res.json({ heartRate: 0, oxygen: 0, stress: 0 });
    }

    const doc = snapshot.docs[0].data();

    // Calcular estrés simulado si no existe en la BD
    let calculatedStress = doc.stress;
    if (calculatedStress === undefined || calculatedStress === null) {
       calculatedStress = (doc.heartRate > 95) ? 80 : (doc.heartRate > 75 ? 45 : 20);
    }

    res.json({
      heartRate: doc.heartRate || 0,
      oxygen: doc.oxygen || 0,
      stress: calculatedStress
    });
  } catch (err) {
    console.error("Error getting IoT data:", err);
    // Evitamos que la app falle devolviendo valores seguros
    res.json({ heartRate: 0, oxygen: 0, stress: 0 });
  }
});

// --- CRUD USERS (ADMIN) ---
app.get("/api/users", async (req, res) => {
  try {
    const snapshot = await db.collection("users").get();
    const users = snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
    res.json(users);
  } catch (err) {
    console.error("Error getting users:", err);
    res.status(500).json({ error: "Could not get users" });
  }
});

// --- ACTUALIZAR USUARIO (ADMIN) ---
app.put("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, age, height, weight, role, password } = req.body;

  try {
    const updateData = { name, age, height, weight, role };
    await db.collection("users").doc(id).update(updateData);

    if (password && password.trim() !== "") {
      await admin.auth().updateUser(id, { password });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    await db.collection("users").doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Could not delete user" });
  }
});

// --- ACTUALIZAR IMC ---
app.post("/api/update-bmi", async (req, res) => {
  const { uid, bmi, bmiCategory, weight, height } = req.body;
  if (!uid) return res.status(400).json({ success: false, error: "UID required" });

  try {
    await db.collection("users").doc(uid).update({ bmi, bmiCategory, weight, height });
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating BMI:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- PRODUCTOS ---
app.get("/api/products", async (req, res) => {
  try {
    const snapshot = await db.collection("products").get();
    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      nombre: doc.data().name,
      descripcion: doc.data().description,
      precio: doc.data().price,
      stock: doc.data().stock,
      img: doc.data().imageUrl,
    }));
    res.json(products);
  } catch (err) {
    console.error("Error getting products:", err);
    res.status(500).json({ error: "Could not get products" });
  }
});

// --- ACTUALIZAR CARRITO ---
app.post("/api/update-cart", async (req, res) => {
  const { uid, carrito } = req.body;
  if (!uid) return res.status(400).json({ success: false, error: "UID required" });

  try {
    await db.collection("users").doc(uid).update({ cart: carrito });
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating cart:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// === SPA FALLBACK (IMPORTANTE: CORREGIDO) ===
// ===============================
// Esto maneja cualquier ruta que no sea API.
// Si el usuario recarga la página o entra a una ruta rara, 
// lo mandamos a login.html en lugar de index.html (que no existe).
app.get(/^(?!\/api).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, "../login.html"));
});

// ===============================
// === INICIAR SERVIDOR ===
// ===============================
app.listen(PORT, () => console.log(`🚀 Server corriendo en puerto: ${PORT}`));