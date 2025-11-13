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

// --- CARRITO ---
const listaCarrito = document.getElementById('listaCarrito');
const totalCarrito = document.getElementById('totalCarrito');
const comprarBtn = document.getElementById('comprarBtn');
const cerrarSesionBtn = document.getElementById('cerrarSesion');

// --- MODAL ---
const abrirCarritoBtn = document.getElementById('abrirCarritoBtn');
const cerrarCarritoBtn = document.getElementById('cerrarCarritoBtn');
const modalCarritoOverlay = document.getElementById('modalCarritoOverlay');
const contadorCarrito = document.getElementById('contadorCarrito');
const carritoVacioMsg = document.getElementById('carritoVacioMsg');

// --- PRODUCTOS ---
const carrusel = document.querySelector('.carrusel');
const cargandoProductos = document.getElementById('cargandoProductos');

// --- NUEVOS ELEMENTOS DE IMC ---
const pesoRegistrado = document.getElementById('pesoRegistrado');
const estaturaRegistrada = document.getElementById('estaturaRegistrada');

let imcGlobal = null;
let categoriaIMC = "";
let userId = null;
let carrito = [];
let productosDisponibles = [];

// === SESIÓN DE USUARIO ===
async function validarSesion() {
  const res = await fetch('/api/session', {
    headers: { 'x-uid': localStorage.getItem('userId') }
  });
  const data = await res.json();

  if (!data.loggedIn) {
    localStorage.removeItem('userId');
    window.location.href = 'login.html';
  } else {
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
      if (data.categoriaIMC) {
        categoriaIMC = data.categoriaIMC;
        resultadoIMC.innerHTML = `Tu IMC es <strong>${imcGlobal}</strong> (${categoriaIMC.toUpperCase()})`;
        mostrarEjercicios();
      } else {
        resultadoIMC.innerHTML = `Tu IMC registrado es <strong>${imcGlobal}</strong>.`;
      }
    }

    if (data.carrito) {
      carrito = data.carrito;
      actualizarCarrito();
    }

    await cargarProductos();
  }
}

// === CERRAR SESIÓN ===
cerrarSesionBtn.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  localStorage.removeItem('userId');
  alert('Sesión cerrada.');
  window.location.href = 'login.html';
});

// === DATOS IoT ===
function generarDatosIOT() {
  const bpm = Math.floor(Math.random() * (100 - 60 + 1)) + 60;
  const ox = Math.floor(Math.random() * (100 - 92 + 1)) + 92;
  const hrv = Math.floor(Math.random() * 100);
  heartRate.textContent = `${bpm} bpm`;
  oxygen.textContent = `${ox}%`;
  stress.textContent = hrv < 40 ? "Alto" : hrv < 70 ? "Medio" : "Bajo";
  if (hrv < 40) stressAdvice.textContent = "Tu nivel de estrés es alto. Respira profundo y toma un descanso.";
  else if (hrv < 70) stressAdvice.textContent = "Tu nivel de estrés es moderado. Mantén tu equilibrio.";
  else stressAdvice.textContent = "Excelente, estás relajado.";
}

// === IMC ===
async function calcularIMCFirebase(peso, estatura) {
  if (!peso || !estatura || estatura <= 0) return;
  const imc = peso / (estatura * estatura);
  imcGlobal = imc.toFixed(2);

  if (imc < 18.5) categoriaIMC = "bajo_peso";
  else if (imc < 25) categoriaIMC = "normal";
  else if (imc < 30) categoriaIMC = "sobrepeso";
  else categoriaIMC = "obesidad";

  const recomendacion = {
    bajo_peso: "Aumenta calorías con alimentos saludables y haz ejercicios de fuerza moderados.",
    normal: "Mantén tu equilibrio con ejercicios variados y buena alimentación.",
    sobrepeso: "Haz ejercicios de bajo impacto y combina con dieta controlada.",
    obesidad: "Empieza con rutinas suaves y busca acompañamiento profesional."
  }[categoriaIMC];

  resultadoIMC.innerHTML = `
    Tu IMC es <strong>${imcGlobal}</strong> (${categoriaIMC.replace("_", " ").toUpperCase()})<br>${recomendacion}
  `;

  pesoRegistrado.textContent = peso;
  estaturaRegistrada.textContent = estatura;

  if (userId) {
    await fetch('/api/update-bmi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: userId, bmi: imcGlobal, bmiCategory: categoriaIMC, weight: peso, height: estatura })
    });
  }

  mostrarEjercicios();
}

// === EJERCICIOS ===
function aleatorio(array, cantidad = 3) {
  const copia = [...array];
  const seleccion = [];
  for (let i = 0; i < cantidad && copia.length; i++) {
    const index = Math.floor(Math.random() * copia.length);
    seleccion.push(copia.splice(index, 1)[0]);
  }
  return seleccion;
}

const ejerciciosPorIMC = {
  bajo_peso: [
    { nombre: "Peso corporal - sentadillas", duracion: "3x15", beneficio: "Aumenta masa muscular" },
    { nombre: "Flexiones suaves", duracion: "3x10", beneficio: "Tonifica y fortalece" },
    { nombre: "Zancadas", duracion: "3x12", beneficio: "Fuerza en piernas y glúteos" }
  ],
  normal: [
    { nombre: "Trote ligero", duracion: "20 min", beneficio: "Salud cardiovascular" },
    { nombre: "Yoga", duracion: "25 min", beneficio: "Flexibilidad y control" },
    { nombre: "Ciclismo", duracion: "20 min", beneficio: "Cardio y piernas fuertes" }
  ],
  sobrepeso: [
    { nombre: "Caminata rápida", duracion: "30 min", beneficio: "Cardio bajo impacto" },
    { nombre: "Natación", duracion: "20 min", beneficio: "Sin estrés articular" },
    { nombre: "Tai Chi", duracion: "20 min", beneficio: "Relaja y mejora equilibrio" }
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
  const ejercicios = ejerciciosPorIMC[categoriaIMC];
  const seleccionados = aleatorio(ejercicios, 3);
  tablaEjercicios.innerHTML = '';
  seleccionados.forEach(ej => {
    const fila = document.createElement('tr');
    fila.innerHTML = `<td>${ej.nombre}</td><td>${ej.duracion}</td><td>${ej.beneficio}</td>`;
    tablaEjercicios.appendChild(fila);
  });
}

// === PRODUCTOS ===
async function cargarProductos() {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error(`Error ${res.status}: No se pudo conectar a /api/products`);
    productosDisponibles = await res.json();

    carrusel.innerHTML = '';
    if (productosDisponibles.length === 0) {
      carrusel.innerHTML = '<p>No hay productos disponibles en este momento.</p>';
      return;
    }

    productosDisponibles.forEach(prod => {
      const agotado = prod.stock <= 0;
      const tarjeta = document.createElement('div');
      tarjeta.className = `producto-card ${agotado ? 'agotado' : ''}`;
      const botonTitle = agotado ? 'Producto Agotado' : 'Agregar al carrito';

      tarjeta.innerHTML = `
        <img src="${prod.img}" alt="${prod.nombre}">
        <h3>${prod.nombre}</h3>
        <p>${prod.descripcion}</p>
        <div class="producto-footer">
          <span class="precio">$${prod.precio} MXN</span>
          <button 
            class="agregar-carrito" 
            data-id="${prod.id}" 
            data-nombre="${prod.nombre}" 
            data-precio="${prod.precio}" 
            data-stock="${prod.stock}" 
            ${agotado ? 'disabled' : ''}
            title="${botonTitle}"
          >🛒</button>
        </div>
      `;
      carrusel.appendChild(tarjeta);
    });

    calcularMedidasCarrusel();
    asignarEventosCarrito();
  } catch (error) {
    console.error('Error al cargar productos:', error);
    cargandoProductos.textContent = 'Error al cargar productos.';
  }
}

// === CARRITO ===
async function guardarCarritoEnDB() {
  if (!userId) return;
  try {
    await fetch('/api/update-cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: userId, carrito })
    });
  } catch (error) {
    console.error('Error al guardar el carrito:', error);
  }
}

function actualizarCarrito() {
  listaCarrito.innerHTML = '';
  let suma = 0;

  if (carrito.length === 0) carritoVacioMsg.classList.add('visible');
  else carritoVacioMsg.classList.remove('visible');

  carrito.forEach((item, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="item-info">
        <span class="item-nombre">${item.nombre}</span>
        <span class="item-precio">$${item.precio} MXN</span>
      </div>
      <button data-index="${index}" class="eliminar">🗑️</button>
    `;
    listaCarrito.appendChild(li);
    suma += item.precio;
  });

  totalCarrito.textContent = `Total: $${suma} MXN`;
  contadorCarrito.textContent = carrito.length;

  document.querySelectorAll('.eliminar').forEach(btn => {
    btn.addEventListener('click', () => {
      carrito.splice(parseInt(btn.dataset.index), 1);
      actualizarCarrito();
    });
  });

  guardarCarritoEnDB();
}

function asignarEventosCarrito() {
  document.querySelectorAll('.agregar-carrito').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const nombre = btn.dataset.nombre;
      const precio = parseFloat(btn.dataset.precio);
      const stock = parseInt(btn.dataset.stock);
      const enCarrito = carrito.filter(i => i.nombre === nombre).length;
      if (enCarrito >= stock) {
        alert('¡Lo sentimos! Ya no hay más stock disponible para este producto.');
        return;
      }
      carrito.push({ nombre, precio });
      actualizarCarrito();
      contadorCarrito.style.transform = 'scale(1.3)';
      setTimeout(() => contadorCarrito.style.transform = 'scale(1)', 200);
    });
  });
}

comprarBtn.addEventListener('click', async () => {
  if (carrito.length === 0) return alert('Tu carrito está vacío.');
  alert('Compra finalizada con éxito.');
  carrito = [];
  actualizarCarrito();
  modalCarritoOverlay.classList.remove('visible');
  await cargarProductos();
});

// === CARRUSEL ===
const prevBtn = document.querySelector('.carrusel-btn.prev');
const nextBtn = document.querySelector('.carrusel-btn.next');
const carruselContainer = document.querySelector('.carrusel-container');

let cardWidth = 0;
let autoSlideInterval;

function calcularMedidasCarrusel() {
  const firstCard = carrusel.querySelector('.producto-card');
  if (firstCard) cardWidth = firstCard.offsetWidth + 20;
}

function moverCarrusel(dir) {
  const maxScrollLeft = carrusel.scrollWidth - carrusel.clientWidth;
  if (dir === "next") {
    carrusel.scrollLeft = carrusel.scrollLeft >= maxScrollLeft - 10 ? 0 : carrusel.scrollLeft + cardWidth;
  } else {
    carrusel.scrollLeft = carrusel.scrollLeft <= 10 ? maxScrollLeft : carrusel.scrollLeft - cardWidth;
  }
}

nextBtn.addEventListener('click', () => moverCarrusel("next"));
prevBtn.addEventListener('click', () => moverCarrusel("prev"));

function iniciarAutoSlide() {
  detenerAutoSlide();
  autoSlideInterval = setInterval(() => moverCarrusel("next"), 5000);
}

function detenerAutoSlide() {
  if (autoSlideInterval) clearInterval(autoSlideInterval);
}

carruselContainer.addEventListener('mouseenter', detenerAutoSlide);
carruselContainer.addEventListener('mouseleave', iniciarAutoSlide);
window.addEventListener('resize', calcularMedidasCarrusel);
iniciarAutoSlide();

// === EVENTOS ===
setInterval(generarDatosIOT, 5000);
generarDatosIOT();

calcBtn.addEventListener('click', () => {
  const peso = parseFloat(pesoInput.value);
  const estatura = parseFloat(estaturaInput.value);
  calcularIMCFirebase(peso, estatura);
});

edadCards.forEach(card => card.addEventListener('click', mostrarEjercicios));

// --- MODAL ---
abrirCarritoBtn.addEventListener('click', () => modalCarritoOverlay.classList.add('visible'));
cerrarCarritoBtn.addEventListener('click', () => modalCarritoOverlay.classList.remove('visible'));
modalCarritoOverlay.addEventListener('click', e => {
  if (e.target === modalCarritoOverlay) modalCarritoOverlay.classList.remove('visible');
});

// === INICIO ===
validarSesion();
