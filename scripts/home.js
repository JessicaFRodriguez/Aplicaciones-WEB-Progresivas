// ===============================
// 1. SEGURIDAD: EL "PORTERO"
// ===============================
const storedUserId = localStorage.getItem("userId");

if (!storedUserId) {
  window.location.href = "login.html";
  throw new Error("Acceso denegado: No logueado.");
}

document.body.style.display = "block";


// ===============================
// 2. HOME.JS - Lógica de la App
// ===============================

// === ELEMENTOS DEL DOM ===
const pesoInput = document.getElementById('peso');
const estaturaInput = document.getElementById('estatura');
const calcBtn = document.getElementById('calcIMCBtn');
const resultadoIMC = document.getElementById('resultadoIMC');
const tablaEjercicios = document.getElementById('tablaEjercicios');
const edadCards = document.querySelectorAll('.edad-card');

const heartRateEl = document.getElementById('heartRate');
const oxygenEl = document.getElementById('oxygen');
const stressEl = document.getElementById('stress');
const stressAdvice = document.getElementById('stressAdvice');

// Carrito Elements
const listaCarrito = document.getElementById('listaCarrito');
const totalCarrito = document.getElementById('totalCarrito');
const comprarBtn = document.getElementById('comprarBtn');
const cerrarSesionBtn = document.getElementById('cerrarSesion');
const abrirCarritoBtn = document.getElementById('abrirCarritoBtn');
const cerrarCarritoBtn = document.getElementById('cerrarCarritoBtn');
const modalCarritoOverlay = document.getElementById('modalCarritoOverlay');
const contadorCarrito = document.getElementById('contadorCarrito');
const carritoVacioMsg = document.getElementById('carritoVacioMsg');

// Carrusel Elements
const carrusel = document.querySelector('.carrusel');
const carruselContainer = document.querySelector('.carrusel-container');
const prevBtn = document.querySelector('.carrusel-btn.prev');
const nextBtn = document.querySelector('.carrusel-btn.next');
const cargandoProductos = document.getElementById('cargandoProductos');

// IMC Elements
const pesoRegistrado = document.getElementById('pesoRegistrado');
const estaturaRegistrada = document.getElementById('estaturaRegistrada');

let imcGlobal = null;
let categoriaIMC = "";
let userId = null; 
let carrito = [];
let productosDisponibles = [];

const API_BASE = window.location.origin;

// === SESIÓN DE USUARIO ===
async function validarSesion() {
  try {
    const res = await fetch(`${API_BASE}/api/session`, {
      headers: { 'x-uid': localStorage.getItem('userId') }
    });
    
    if (!res.ok) { throw new Error("Error de sesión"); }

    const data = await res.json();

    if (!data.loggedIn) {
      localStorage.removeItem('userId');
      window.location.href = 'login.html';
      return;
    }

    userId = data.uid;
    
    // Cargar datos de perfil
    if (data.weight) {
      pesoInput.value = data.weight;
      pesoRegistrado.textContent = data.weight;
    }
    if (data.height) {
      estaturaInput.value = data.height;
      estaturaRegistrada.textContent = data.height;
    }
    if (data.bmi) {
      imcGlobal = data.bmi;
      categoriaIMC = data.categoriaIMC || "";
      if (categoriaIMC) {
        resultadoIMC.innerHTML = `Tu IMC es <strong>${imcGlobal}</strong> (${categoriaIMC.toUpperCase()})`;
        mostrarEjercicios();
      }
    }
    carrito = data.carrito || [];
    actualizarCarrito();
    await cargarProductos();
    
    // INICIAR LA LECTURA DE DATOS REALES
    iniciarLecturaIoT(); 

  } catch (err) {
    console.error("Error al validar sesión:", err);
    localStorage.clear();
    window.location.href = 'login.html';
  }
}

// === CERRAR SESIÓN ===
cerrarSesionBtn.addEventListener('click', async () => {
  try { await fetch(`${API_BASE}/api/logout`, { method: 'POST' }); } catch (e) {}
  localStorage.clear();
  alert('Sesión cerrada.');
  window.location.href = 'login.html';
});

// ==================================================
// === DATOS REALES IOT (ARDUINO) ===
// ==================================================
async function obtenerDatosRealesIOT() {
  if (!userId) return;

  try {
    // Llamamos a nuestro servidor
    const res = await fetch(`${API_BASE}/api/iot-data`, {
        headers: { 'x-uid': userId }
    });

    if (!res.ok) return; // Si falla silenciosamente, intentamos en la próxima vuelta

    const data = await res.json();

    // Actualizamos la interfaz con los datos reales
    heartRateEl.textContent = `${data.heartRate} bpm`;
    oxygenEl.textContent = `${data.oxygen}%`;

    // Lógica visual para el Estrés (HRV o calculado)
    const hrv = data.stress; 
    stressEl.textContent = hrv > 70 ? "Alto" : hrv > 40 ? "Medio" : "Bajo";

    // Consejos basados en datos reales
    if (data.oxygen < 90) {
        stressAdvice.textContent = "⚠️ Tu oxigenación es baja. Respira profundo.";
        stressAdvice.style.color = "red";
    } else if (hrv > 70 || data.heartRate > 100) {
        stressAdvice.textContent = "Nivel de estrés o ritmo cardiaco elevado. Toma un descanso.";
        stressAdvice.style.color = "orange";
    } else {
        stressAdvice.textContent = "Tus signos vitales están estables. ¡Bien hecho!";
        stressAdvice.style.color = "green";
    }

  } catch (error) {
    console.error("Error obteniendo datos del sensor:", error);
  }
}

function iniciarLecturaIoT() {
    // Llamamos una vez inmediatamente
    obtenerDatosRealesIOT();
    // Y luego cada 3 segundos
    setInterval(obtenerDatosRealesIOT, 3000);
}

// === CALCULAR IMC ===
async function calcularIMCFirebase(peso, estatura) {
  if (!peso || !estatura || estatura <= 0) return;
  const imc = peso / (estatura * estatura);
  imcGlobal = imc.toFixed(2);

  if (imc < 18.5) categoriaIMC = "bajo_peso";
  else if (imc < 25) categoriaIMC = "normal";
  else if (imc < 30) categoriaIMC = "sobrepeso";
  else categoriaIMC = "obesidad";

  const recomendaciones = {
    bajo_peso: "Aumenta calorías y haz ejercicios de fuerza.",
    normal: "Mantén una dieta equilibrada y ejercicio constante.",
    sobrepeso: "Realiza caminatas diarias y controla tu alimentación.",
    obesidad: "Empieza con ejercicios suaves y consulta un profesional."
  };

  resultadoIMC.innerHTML = `
    Tu IMC es <strong>${imcGlobal}</strong> (${categoriaIMC.toUpperCase()})<br>${recomendaciones[categoriaIMC]}
  `;

  pesoRegistrado.textContent = peso;
  estaturaRegistrada.textContent = estatura;

  if (userId) {
    await fetch(`${API_BASE}/api/update-bmi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: userId, bmi: imcGlobal, bmiCategory: categoriaIMC, weight: peso, height: estatura })
    });
  }

  mostrarEjercicios();
}

// === EJERCICIOS (Datos estáticos) ===
const ejerciciosPorIMC = {
  bajo_peso: [
    { nombre: "Sentadillas", duracion: "3x15", beneficio: "Gana masa muscular" },
    { nombre: "Flexiones suaves", duracion: "3x10", beneficio: "Fortalece pecho y brazos" },
    { nombre: "Zancadas", duracion: "3x12", beneficio: "Activa glúteos y piernas" }
  ],
  normal: [
    { nombre: "Trote ligero", duracion: "20 min", beneficio: "Cardio estable" },
    { nombre: "Yoga", duracion: "25 min", beneficio: "Equilibrio mental y físico" },
    { nombre: "Ciclismo", duracion: "20 min", beneficio: "Fortalece piernas" }
  ],
  sobrepeso: [
    { nombre: "Caminata rápida", duracion: "30 min", beneficio: "Activa metabolismo" },
    { nombre: "Natación", duracion: "20 min", beneficio: "Sin impacto articular" },
    { nombre: "Tai Chi", duracion: "20 min", beneficio: "Relajación activa" }
  ],
  obesidad: [
    { nombre: "Caminata suave", duracion: "25 min", beneficio: "Mejora circulación" },
    { nombre: "Ejercicios en silla", duracion: "3x10", beneficio: "Fortalece sin riesgo" },
    { nombre: "Respiración profunda", duracion: "10 min", beneficio: "Reduce estrés" }
  ]
};

function mostrarEjercicios() {
  if (!categoriaIMC) {
    tablaEjercicios.innerHTML = `<tr><td colspan="3">Calcula primero tu IMC.</td></tr>`;
    return;
  }
  const ejercicios = ejerciciosPorIMC[categoriaIMC] || [];
  tablaEjercicios.innerHTML = ejercicios.map(ej =>
    `<tr><td>${ej.nombre}</td><td>${ej.duracion}</td><td>${ej.beneficio}</td></tr>`
  ).join('');
}

// === PRODUCTOS ===
async function cargarProductos() {
  try {
    const res = await fetch(`${API_BASE}/api/products`);
    if (!res.ok) throw new Error("Error productos");
    productosDisponibles = await res.json();

    carrusel.innerHTML = '';
    if (productosDisponibles.length === 0) {
      carrusel.innerHTML = '<p>No hay productos disponibles.</p>';
      return;
    }

    productosDisponibles.forEach(prod => {
      const agotado = prod.stock <= 0;
      const tarjeta = document.createElement('div');
      tarjeta.className = `producto-card ${agotado ? 'agotado' : ''}`;
      tarjeta.innerHTML = `
        <img src="${prod.img}" alt="${prod.nombre}">
        <h3>${prod.nombre}</h3>
        <p>${prod.descripcion}</p>
        <div class="producto-footer">
          <span class="precio">$${prod.precio} MXN</span>
          <button class="agregar-carrito" data-id="${prod.id}" ${agotado ? 'disabled' : ''}>
            ${agotado ? 'Agotado' : '🛒'}
          </button>
        </div>`;
      carrusel.appendChild(tarjeta);
    });

    calcularCarrusel();
    asignarEventosCarrito();
  } catch (error) {
    console.error('Error al cargar productos:', error);
  }
}

// === CARRITO ===
function actualizarCarrito() {
  listaCarrito.innerHTML = '';
  let total = 0;

  if (carrito.length === 0) carritoVacioMsg.classList.add('visible');
  else carritoVacioMsg.classList.remove('visible');

  carrito.forEach((item, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="item-info">
        <span>${item.nombre}</span>
        <span>$${item.precio}</span>
      </div>
      <button class="eliminar" data-index="${i}">🗑️</button>`;
    listaCarrito.appendChild(li);
    total += item.precio;
  });

  totalCarrito.textContent = `Total: $${total} MXN`;
  contadorCarrito.textContent = carrito.length;

  document.querySelectorAll('.eliminar').forEach(btn =>
    btn.addEventListener('click', () => {
      carrito.splice(btn.dataset.index, 1);
      actualizarCarrito();
    })
  );

  guardarCarritoEnDB();
}

async function guardarCarritoEnDB() {
  if (!userId) return;
  try {
    await fetch(`${API_BASE}/api/update-cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: userId, carrito })
    });
  } catch (err) { console.error(err); }
}

function asignarEventosCarrito() {
  document.querySelectorAll('.agregar-carrito').forEach(btn => {
    btn.addEventListener('click', () => {
      const producto = productosDisponibles.find(p => p.id === btn.dataset.id);
      if (!producto) return;
      carrito.push(producto);
      actualizarCarrito();
      // Animación simple
      contadorCarrito.style.transform = 'scale(1.3)';
      setTimeout(() => contadorCarrito.style.transform = 'scale(1)', 200);
    });
  });
}

comprarBtn.addEventListener('click', () => {
  if (carrito.length === 0) return alert('Carrito vacío.');
  alert('Compra realizada.');
  carrito = [];
  actualizarCarrito();
  modalCarritoOverlay.classList.remove('visible');
});

// === CARRUSEL LOGIC ===
let cardWidth = 0;
let autoSlide;

function calcularCarrusel() {
  const card = carrusel.querySelector('.producto-card');
  if (card) cardWidth = card.offsetWidth + 20;
}

function moverCarrusel(dir) {
  const maxScroll = carrusel.scrollWidth - carrusel.clientWidth;
  if (dir === 'next') {
    carrusel.scrollLeft = carrusel.scrollLeft >= maxScroll - 10 ? 0 : carrusel.scrollLeft + cardWidth;
  } else {
    carrusel.scrollLeft = carrusel.scrollLeft <= 10 ? maxScroll : carrusel.scrollLeft - cardWidth;
  }
}

nextBtn.addEventListener('click', () => moverCarrusel('next'));
prevBtn.addEventListener('click', () => moverCarrusel('prev'));

function iniciarAutoSlide() {
  clearInterval(autoSlide);
  autoSlide = setInterval(() => moverCarrusel('next'), 5000);
}

carruselContainer.addEventListener('mouseenter', () => clearInterval(autoSlide));
carruselContainer.addEventListener('mouseleave', iniciarAutoSlide);

// === MODAL ===
abrirCarritoBtn.addEventListener('click', () => modalCarritoOverlay.classList.add('visible'));
cerrarCarritoBtn.addEventListener('click', () => modalCarritoOverlay.classList.remove('visible'));
modalCarritoOverlay.addEventListener('click', e => {
  if (e.target === modalCarritoOverlay) modalCarritoOverlay.classList.remove('visible');
});

// === EVENTOS ===
calcBtn.addEventListener('click', () => {
  const peso = parseFloat(pesoInput.value);
  const estatura = parseFloat(estaturaInput.value);
  calcularIMCFirebase(peso, estatura);
});

edadCards.forEach(card => card.addEventListener('click', mostrarEjercicios));

// === INICIO