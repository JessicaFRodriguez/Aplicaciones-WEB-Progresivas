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

// Carga de credenciales (Local o Nube)
const credentialsPath = path.join(__dirname, "firebase-credentials.json");
if (fs.existsSync(credentialsPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
  console.log("✅ Credenciales locales cargadas.");
} else if (process.env.FIREBASE_CONFIG) {
  serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
  console.log("✅ Credenciales de entorno cargadas.");
} else {
  console.error("❌ ERROR: No se encontraron credenciales.");
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
app.use(cors({ origin: "*", credentials: true })); // Permisivo para evitar bloqueos
app.use(express.json());

// ===============================
// === SERVIR FRONTEND ===
app.use(express.static(path.join(__dirname, "../")));

// Ruta raíz -> login.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../login.html"));
});

// ===============================
// === RUTAS API ===

// --- REGISTER ---
app.post("/api/register", async (req, res) => {
  const { name, age, height, weight, email, password } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: "Faltan datos" });

  try {
    const userRecord = await admin.auth().createUser({ email, password });
    await db.collection("users").doc(userRecord.uid).set({
      name, age: Number(age), height: Number(height), weight: Number(weight),
      email, cart: [], role: "user", createdAt: new Date().toISOString(),
    });
    res.json({ success: true, uid: userRecord.uid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- LOGIN ---
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Faltan credenciales" });

  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    const userDoc = await db.collection("users").doc(userRecord.uid).get();
    if (!userDoc.exists) return res.status(404).json({ error: "Usuario no encontrado en BD" });

    const userData = userDoc.data();
    res.json({ success: true, uid: userDoc.id, role: userData.role || "user" });
  } catch (err) {
    res.status(401).json({ error: "Login fallido" });
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
    const u = userDoc.data();
    res.json({
      loggedIn: true, uid: userDoc.id, role: u.role,
      weight: u.weight, height: u.height, bmi: u.bmi,
      categoriaIMC: u.bmiCategory, carrito: u.cart || []
    });
  } catch (err) { res.json({ loggedIn: false }); }
});

// --- NUEVA RUTA: DATOS IOT REAALES ---
app.get("/api/iot-data", async (req, res) => {
  const uid = req.headers["x-uid"];
  if (!uid) return res.status(400).json({ error: "UID required" });

  try {
    // Busca en la subcolección iotData del usuario
    const snapshot = await db.collection("users").doc(uid)
      .collection("iotData")
      .orderBy("timestamp", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      // Si no hay datos, enviamos bandera vacía
      return res.json({ empty: true });
    }

    const doc = snapshot.docs[0].data();
    // Calcular estrés si no viene del sensor
    let stress = doc.stress;
    if (stress == null) stress = (doc.heartRate > 95) ? 80 : 20;

    res.json({
      heartRate: doc.heartRate || 0,
      oxygen: doc.oxygen || 0,
      stress: stress,
      empty: false
    });
  } catch (err) {
    console.error("Error IoT:", err);
    res.json({ empty: true });
  }
});

// --- PRODUCTOS (Bilingüe: Inglés o Español) ---
app.get("/api/products", async (req, res) => {
  try {
    const snapshot = await db.collection("products").get(); // Si en Firebase se llama "productos", cambia esto.
    const products = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        nombre: d.name || d.nombre || "Sin nombre",
        descripcion: d.description || d.descripcion || "",
        precio: d.price || d.precio || 0,
        stock: d.stock || 0,
        img: d.imageUrl || d.img || "https://via.placeholder.com/150",
      };
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Error cargando productos" });
  }
});

// --- RUTA EMERGENCIA: RESTAURAR PRODUCTOS ---
app.get("/api/seed-products", async (req, res) => {
  const base = [
    { name: "SmartBand V1", description: "Monitor cardiaco", price: 599, stock: 50, imageUrl: "https://m.media-amazon.com/images/I/61s-W0B-NGL._AC_SL1500_.jpg" },
    { name: "VivePlen Pro", description: "Oxímetro avanzado", price: 1299, stock: 20, imageUrl: "https://m.media-amazon.com/images/I/61s-W0B-NGL._AC_SL1500_.jpg" }
  ];
  try {
    const batch = db.batch();
    base.forEach(p => batch.set(db.collection("products").doc(), p));
    await batch.commit();
    res.send("✅ Productos restaurados.");
  } catch (e) { res.status(500).send(e.message); }
});

// --- ACTUALIZAR CARRITO/USUARIO/IMC ---
app.post("/api/update-cart", async (req, res) => {
  const { uid, carrito } = req.body;
  if (uid) await db.collection("users").doc(uid).update({ cart: carrito });
  res.json({ success: true });
});

app.post("/api/update-bmi", async (req, res) => {
  const { uid, ...data } = req.body;
  if (uid) await db.collection("users").doc(uid).update(data);
  res.json({ success: true });
});

app.get("/api/users", async (req, res) => {
    const s = await db.collection("users").get();
    res.json(s.docs.map(d => ({ uid: d.id, ...d.data() })));
});
app.delete("/api/users/:id", async (req, res) => {
    await db.collection("users").doc(req.params.id).delete();
    res.json({success: true});
});
app.put("/api/users/:id", async (req, res) => {
    await db.collection("users").doc(req.params.id).update(req.body);
    res.json({success: true});
});


// ===============================
// === SPA FALLBACK (CORREGIDO) ===
app.get(/^(?!\/api).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, "../login.html"));
});

// ===============================
// === INICIAR SERVIDOR ===
app.listen(PORT, () => {
  console.log(`🚀 Server corriendo en: http://localhost:${PORT}`);
});