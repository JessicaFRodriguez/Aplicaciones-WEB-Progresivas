// ===============================
// 1. SEGURIDAD: EL "PORTERO"
// ===============================
// Esto se ejecuta ANTES de cargar nada más
const storedUserId = localStorage.getItem("userId");

if (!storedUserId) {
  // Si no hay ID en el navegador, adiós inmediato
  window.location.href = "login.html";
  throw new Error("Acceso denegado: No logueado.");
}

// Si hay ID, mostramos la página (que estaba oculta con display:none)
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

const heartRate = document.getElementById('heartRate');
const oxygen = document.getElementById('oxygen');
const stress = document.getElementById('stress');
const stressAdvice = document.getElementById('stressAdvice');

const listaCarrito = document.getElementById('listaCarrito');
const totalCarrito = document.getElementById('totalCarrito');
const comprarBtn = document.getElementById('comprarBtn');
const cerrarSesionBtn = document.getElementById('cerrarSesion');
const abrirCarritoBtn = document.getElementById('abrirCarritoBtn');
const cerrarCarritoBtn = document.getElementById('cerrarCarritoBtn');
const modalCarritoOverlay = document.getElementById('modalCarritoOverlay');
const contadorCarrito = document.getElementById('contadorCarrito');
const carritoVacioMsg = document.getElementById('carritoVacioMsg');

const carrusel = document.querySelector('.carrusel');
const carruselContainer = document.querySelector('.carrusel-container');
const prevBtn = document.querySelector('.carrusel-btn.prev');
const nextBtn = document.querySelector('.carrusel-btn.next');
const cargandoProductos = document.getElementById('cargandoProductos');
const pesoRegistrado = document.getElementById('pesoRegistrado');
const estaturaRegistrada = document.getElementById('estaturaRegistrada');

let imcGlobal = null;
let categoriaIMC = "";
let userId = null; // Se llenará con validarSesion
let carrito = [];
let productosDisponibles = [];

const API_BASE = window.location.origin;

// === SESIÓN DE USUARIO (Validación Servidor) ===
async function validarSesion() {
  try {
    const res = await fetch(`${API_BASE}/api/session`, {
      headers: { 'x-uid': localStorage.getItem('userId') }
    });
    
    // Si el servidor responde 401/403 o error
    if (!res.ok) {
        localStorage.clear();
        window.location.href = 'login.html';
        return;
    }

    const data = await res.json();

    if (!data.loggedIn) {
      localStorage.removeItem('userId');
      window.location.href = 'login.html';
      return;
    }

    // Si todo está bien, cargamos datos
    userId = data.uid;
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
  } catch (err) {
    console.error("Error al validar sesión:", err);
    // Opcional: si falla la conexión, ¿lo dejamos pasar o lo sacamos?
    // Por ahora solo alertamos
  }
}

// === CERRAR SESIÓN ===
cerrarSesionBtn.addEventListener('click', async () => {
  try {
      await fetch(`${API_BASE}/api/logout`, { method: 'POST' });
  } catch (e) {}
  
  localStorage.clear(); // Borra ID y ROL
  alert('Sesión cerrada.');
  window.location.href = 'login.html';
});

// === SENSOR SIMULADO IoT ===
function generarDatosIOT() {
  const bpm = Math.floor(Math.random() * (100 - 60 + 1)) + 60;
  const ox = Math.floor(Math.random() * (100 - 92 + 1)) + 92;
  const hrv = Math.floor(Math.random() * 100);

  heartRate.textContent = `${bpm} bpm`;
  oxygen.textContent = `${ox}%`;
  stress.textContent = hrv < 40 ? "Alto" : hrv < 70 ? "Medio" : "Bajo";

  if (hrv < 40) stressAdvice.textContent = "Tu nivel de estrés es alto. Respira profundo y relájate.";
  else if (hrv < 70) stressAdvice.textContent = "Estrés moderado. Mantén tus hábitos saludables.";
  else stressAdvice.textContent = "Excelente, estás tranquilo.";
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

// === EJERCICIOS ===
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
    if (!res.ok) throw new Error("No se pudieron cargar los productos");
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
  } catch (err) {
    console.error("Error al guardar carrito:", err);
  }
}

function asignarEventosCarrito() {
  document.querySelectorAll('.agregar-carrito').forEach(btn => {
    btn.addEventListener('click', () => {
      const producto = productosDisponibles.find(p => p.id === btn.dataset.id);
      if (!producto) return;
      carrito.push(producto);
      actualizarCarrito();
      contadorCarrito.style.transform = 'scale(1.3)';
      setTimeout(() => contadorCarrito.style.transform = 'scale(1)', 200);
    });
  });
}

comprarBtn.addEventListener('click', () => {
  if (carrito.length === 0) return alert('Tu carrito está vacío.');
  alert('Compra realizada con éxito.');
  carrito = [];
  actualizarCarrito();
  modalCarritoOverlay.classList.remove('visible');
});

// === CARRUSEL ===
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
setInterval(generarDatosIOT, 5000);
generarDatosIOT();

// === INICIO ===
validarSesion();
iniciarAutoSlide();