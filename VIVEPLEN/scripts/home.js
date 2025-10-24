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

let imcGlobal = null;
let categoriaIMC = "";
let userId = null;
let carrito = [];

// === SESIÓN DE USUARIO ===
async function validarSesion() {
  const res = await fetch('/api/session');
  const data = await res.json();
  if (!data.loggedIn) {
    window.location.href = 'login.html';
  } else {
    userId = data.uid;
    if (data.peso) pesoInput.value = data.peso;
    if (data.estatura) estaturaInput.value = data.estatura;
    if (data.imc) {
      imcGlobal = data.imc;
      categoriaIMC = data.categoriaIMC;
      resultadoIMC.innerHTML = `Tu IMC es <strong>${imcGlobal}</strong> (${categoriaIMC.toUpperCase()})`;
      mostrarEjercicios();
    }
    if (data.carrito) {
      carrito = data.carrito;
      actualizarCarrito();
    }
  }
}

// === CERRAR SESIÓN ===
cerrarSesionBtn.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  alert('Sesión cerrada.');
  window.location.href = 'login.html';
});

// === GENERADOR DE DATOS IoT SIMULADOS ===
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

// === CÁLCULO DE IMC Y GUARDADO EN BACKEND ===
async function calcularIMCFirebase(peso, estatura) {
  if (!peso || !estatura || estatura <= 0) return;

  const imc = peso / (estatura * estatura);
  imcGlobal = imc.toFixed(2);

  if (imc < 18.5) categoriaIMC = "bajo_peso";
  else if (imc < 25) categoriaIMC = "normal";
  else if (imc < 30) categoriaIMC = "sobrepeso";
  else categoriaIMC = "obesidad";

  let recomendacion = {
    bajo_peso: "Aumenta calorías con alimentos saludables y haz ejercicios de fuerza moderados.",
    normal: "Mantén tu equilibrio con ejercicios variados y buena alimentación.",
    sobrepeso: "Haz ejercicios de bajo impacto y combina con dieta controlada.",
    obesidad: "Empieza con rutinas suaves y busca acompañamiento profesional."
  }[categoriaIMC];

  resultadoIMC.innerHTML = `
    Tu IMC es <strong>${imcGlobal}</strong> (${categoriaIMC.replace("_", " ").toUpperCase()})<br>${recomendacion}
  `;

  if (userId) {
    await fetch('/api/update-imc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: userId, imc: imcGlobal, categoriaIMC, peso, estatura })
    });
  }

  mostrarEjercicios();
}

// === GENERAR Y MOSTRAR EJERCICIOS ===
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

// === CARRITO ===
function actualizarCarrito() {
  listaCarrito.innerHTML = '';
  let suma = 0;
  carrito.forEach((item, index) => {
    const li = document.createElement('li');
    li.innerHTML = `${item.nombre} - $${item.precio} MXN <button data-index="${index}" class="eliminar">❌</button>`;
    listaCarrito.appendChild(li);
    suma += item.precio;
  });
  totalCarrito.textContent = `Total: $${suma} MXN`;

  // Evento eliminar
  document.querySelectorAll('.eliminar').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.index);
      carrito.splice(i, 1);
      actualizarCarrito();
    });
  });
}

// === COMPRAR ===
comprarBtn.addEventListener('click', () => {
  if (carrito.length === 0) return alert('Tu carrito está vacío.');
  alert('Compra finalizada con éxito.');
  carrito = [];
  actualizarCarrito();
});

// === EVENTOS ===
setInterval(generarDatosIOT, 5000);
generarDatosIOT();

calcBtn.addEventListener('click', () => {
  const peso = parseFloat(pesoInput.value);
  const estatura = parseFloat(estaturaInput.value);
  calcularIMCFirebase(peso, estatura);
});

edadCards.forEach(card => card.addEventListener('click', mostrarEjercicios));

// === INICIO ===
validarSesion();
