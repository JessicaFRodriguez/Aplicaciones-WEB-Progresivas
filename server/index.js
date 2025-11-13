// ===============================
// BACKEND + FRONTEND CON FIREBASE + EXPRESS
// ===============================
import express from "express";
import fs from "fs";
import admin from "firebase-admin";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// --- CONFIGURACIÓN FIREBASE ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serviceAccount = null;

// Intentar cargar desde archivo local (para desarrollo)
const credentialsPath = path.join(__dirname, "firebase-credentials.json");
if (fs.existsSync(credentialsPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
  console.log("Cargando credenciales desde archivo local");
} else if (process.env.FIREBASE_CONFIG) {
  serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
  console.log("Cargando credenciales desde variable de entorno FIREBASE_CONFIG");
} else {
  console.error("No se encontraron credenciales de Firebase");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://viveplen-int.firebaseio.com",
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE ---
app.use(
  cors({
    origin: [
      "http://127.0.0.1:5501",
      "http://localhost:5501",
      "http://127.0.0.1:5502",
      "http://localhost:5502",
      "http://localhost:3000",
    ],
    credentials: true,
  })
);
app.use(express.json());

// ===============================
// === SERVIR FRONTEND ===
app.use(express.static(path.join(__dirname, "../")));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "../login.html")));

// ===============================
// === RUTAS API ===

// --- REGISTER ---
app.post("/api/register", async (req, res) => {
  const { name, age, height, weight, email, password } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  try {
    let existingUser;
    try {
      existingUser = await admin.auth().getUserByEmail(email);
    } catch {}

    if (existingUser) {
      return res.status(400).json({ success: false, error: "Email already registered" });
    }

    const userRecord = await admin.auth().createUser({ email, password });

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
  if (!email || !password) return res.status(400).json({ success: false, error: "Email and password required" });

  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    const userDoc = await db.collection("users").doc(userRecord.uid).get();

    if (!userDoc.exists) return res.status(404).json({ success: false, error: "User not found" });

    const userData = userDoc.data();
    res.json({ success: true, uid: userDoc.id, role: userData.role || "user" });
  } catch (err) {
    console.error("Error login:", err.message);
    res.status(401).json({ success: false, error: "Invalid credentials" });
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

// --- ACTUALIZAR USUARIO (ADMIN) con contraseña ---
app.put("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, age, height, weight, role, password } = req.body;

  try {
    // Actualizar Firestore
    const updateData = { name, age, height, weight, role };
    await db.collection("users").doc(id).update(updateData);

    // Actualizar contraseña en Firebase Auth si se proporcionó
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
// === SPA FALLBACK (DEBE IR AL FINAL) ===
app.get(/^(?!\/api).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, "../index.html"));
});

// ===============================
// === INICIAR SERVIDOR ===
app.listen(PORT, () => console.log(`Server + Frontend corriendo en: http://localhost:${PORT}`));
