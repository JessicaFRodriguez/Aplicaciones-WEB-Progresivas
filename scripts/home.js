// ===============================
// 1. SEGURIDAD: PORTERO
// ===============================
const storedUserId = localStorage.getItem("userId");
if (!storedUserId) {
  window.location.href = "login.html";
  throw new Error("No logueado");
}
document.body.style.display = "block";

// ===============================
// 2. ELEMENTOS DEL DOM
// ===============================
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

// Carrito
const listaCarrito = document.getElementById('listaCarrito');
const totalCarrito = document.getElementById('totalCarrito');
const comprarBtn = document.getElementById('comprarBtn');
const cerrarSesionBtn = document.getElementById('cerrarSesion');
const abrirCarritoBtn = document.getElementById('abrirCarritoBtn');
const cerrarCarritoBtn = document.getElementById('cerrarCarritoBtn');
const modalCarritoOverlay = document.getElementById('modalCarritoOverlay');
const contadorCarrito = document.getElementById('contadorCarrito');
const carritoVacioMsg = document.getElementById('carritoVacioMsg');

// Productos
const carrusel = document.querySelector('.carrusel');
const cargandoProductos = document.getElementById('cargandoProductos');

// IMC
const pesoRegistrado = document.getElementById('pesoRegistrado');
const estaturaRegistrada = document.getElementById('estaturaRegistrada');

let imcGlobal = null;
let categoriaIMC = "";
let userId = null;
let carrito = [];
let productosDisponibles = [];
const API_BASE = window.location.origin;

// ===============================
// 3. SESIÓN DE USUARIO
// ===============================
async function validarSesion() {
  try {
    const res = await fetch(`${API_BASE}/api/session`, {
      headers: { 'x-uid': localStorage.getItem('userId') }
    });
    const data = await res.json();

    if (!data.loggedIn) {
      localStorage.removeItem('userId');
      window.location.href = 'login.html';
      return;
    }

    userId = data.uid;

    // Cargar perfil
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
      }
    }
    if (data.carrito) {
      carrito = data.carrito;
      actualizarCarrito();
    }

    await cargarProductos();
    
    // INICIAR MONITOR DE ARDUINO REAL
    iniciarLecturaIoT();

  } catch (error) {
    console.error("Error sesión:", error);
    window.location.href = 'login.html';
  }
}

// ===============================
// 4. DATOS REALES IOT
// ===============================
async function obtenerDatosRealesIOT() {
  if (!userId) return;

  try {
    const res = await fetch(`${API_BASE}/api/iot-data`, {
        headers: { 'x-uid': userId }
    });

    if (!res.ok) return;

    const data = await res.json();

    if (data.empty || (data.heartRate === 0 && data.oxygen === 0)) {
       heartRateEl.textContent = "-- bpm";
       oxygenEl.textContent = "-- %";
       stressEl.textContent = "Esperando...";
       stressAdvice.textContent = "Conecta tu sensor para ver datos.";
       stressAdvice.style.color = "gray";
       return; 
    }

    heartRateEl.textContent = `${data.heartRate} bpm`;
    oxygenEl.textContent = `${data.oxygen}%`;
    const hrv = data.stress; 
    stressEl.textContent = hrv > 70 ? "Alto" : hrv > 40 ? "Medio" : "Bajo";

    if (data.oxygen < 90) {
        stressAdvice.textContent = "⚠️ Oxigenación baja.";
        stressAdvice.style.color = "red";
    } else if (hrv > 70) {
        stressAdvice.textContent = "Estrés alto. Relájate.";
        stressAdvice.style.color = "orange";
    } else {
        stressAdvice.textContent = "Signos vitales estables.";
        stressAdvice.style.color = "green";
    }
  } catch (error) {
    console.error("Error IoT:", error);
  }
}

function iniciarLecturaIoT() {
    obtenerDatosRealesIOT();
    setInterval(obtenerDatosRealesIOT, 3000); 
}

// ===============================
// 5. FUNCIONES DE PRODUCTOS Y CARRITO
// ===============================

async function cargarProductos() {
  try {
    const res = await fetch(`${API_BASE}/api/products`);
    if (!res.ok) throw new Error("Error productos");
    productosDisponibles = await res.json();
    carrusel.innerHTML = '';
    
    if (productosDisponibles.length === 0) {
      carrusel.innerHTML = '<p>No hay productos. <a href="/api/seed-products" target="_blank">Click para restaurar</a></p>';
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
          <button class="agregar-carrito" 
             data-id="${prod.id}" 
             data-nombre="${prod.nombre}"
             data-precio="${prod.precio}"
             data-stock="${prod.stock}"
             ${agotado ? 'disabled' : ''}>
             ${agotado ? 'Agotado' : '🛒'}
          </button>
        </div>`;
      carrusel.appendChild(tarjeta);
    });
    
    calcularCarrusel();
    asignarEventosCarrito();
    actualizarCarrito(); // Verifica bloqueos iniciales

  } catch (error) { console.error(error); }
}

function asignarEventosCarrito() {
  document.querySelectorAll('.agregar-carrito').forEach(btn => {
    const nuevoBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(nuevoBtn, btn);

    nuevoBtn.addEventListener('click', () => {
       const id = nuevoBtn.dataset.id;
       const nombre = nuevoBtn.dataset.nombre;
       const precio = parseFloat(nuevoBtn.dataset.precio);
       const stock = parseInt(nuevoBtn.dataset.stock);

       // Validar Stock Localmente
       const cantidadEnCarrito = carrito.filter(i => i.id === id).length;
       
       if (cantidadEnCarrito >= stock) {
          alert("¡Stock máximo alcanzado!");
          return;
       }

       carrito.push({ id, nombre, precio });
       actualizarCarrito();

       contadorCarrito.style.transform = 'scale(1.3)';
       setTimeout(() => contadorCarrito.style.transform = 'scale(1)', 200);
    });
  });
}

function actualizarCarrito() {
  listaCarrito.innerHTML = '';
  let total = 0;
  if(carrito.length===0) carritoVacioMsg.classList.add('visible'); else carritoVacioMsg.classList.remove('visible');
  
  carrito.forEach((item, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${item.nombre}</span><span>$${item.precio}</span><button class="eliminar" data-i="${i}">🗑️</button>`;
    listaCarrito.appendChild(li);
    total += item.precio;
  });
  
  totalCarrito.textContent = `Total: $${total} MXN`;
  contadorCarrito.textContent = carrito.length;
  
  document.querySelectorAll('.eliminar').forEach(b => b.addEventListener('click', ()=> {
      carrito.splice(b.dataset.i, 1); 
      actualizarCarrito();
  }));
  
  if(userId) fetch(`${API_BASE}/api/update-cart`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({uid:userId, carrito})});

  // BLOQUEO VISUAL DE BOTONES (STOCK)
  const botones = document.querySelectorAll('.agregar-carrito');
  botones.forEach(btn => {
      const id = btn.dataset.id;
      const stock = parseInt(btn.dataset.stock);
      const enCarrito = carrito.filter(i => i.id === id).length;

      if (enCarrito >= stock) {
          btn.disabled = true;
          btn.textContent = "Max Stock";
          btn.style.backgroundColor = "#ccc";
          btn.style.cursor = "not-allowed";
      } else {
          btn.disabled = false;
          btn.textContent = "🛒";
          btn.style.backgroundColor = ""; 
          btn.style.cursor = "pointer";
      }
  });
}

// ===============================
// 6. EVENTO COMPRAR (CORREGIDO PARA STOCK GLOBAL)
// ===============================
comprarBtn.addEventListener('click', async () => {
  if (carrito.length === 0) return alert('Tu carrito está vacío.');

  comprarBtn.disabled = true;
  comprarBtn.textContent = "Procesando...";

  try {
    // 1. Enviamos la petición al servidor para descontar stock real
    const res = await fetch(`${API_BASE}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: userId, carrito })
    });

    const data = await res.json();

    if (data.success) {
      alert('¡Compra exitosa! El stock se ha actualizado.');
      carrito = [];
      modalCarritoOverlay.classList.remove('visible');
      actualizarCarrito();
      
      // 2. ¡IMPORTANTE! Recargamos productos para ver el nuevo stock
      await cargarProductos();
    } else {
      alert('Error: ' + data.error);
    }
  } catch (err) {
    console.error(err);
    alert('Error al conectar con el servidor.');
  } finally {
    comprarBtn.disabled = false;
    comprarBtn.textContent = "Finalizar compra";
  }
});

// ===============================
// 7. RESTO DE FUNCIONES
// ===============================

cerrarSesionBtn.addEventListener('click', async () => {
  try { await fetch(`${API_BASE}/api/logout`, { method: 'POST' }); } catch(e){}
  localStorage.clear();
  window.location.href = 'login.html';
});

async function calcularIMCFirebase(peso, estatura) {
  if (!peso || !estatura || estatura <= 0) return;
  const imc = peso / (estatura * estatura);
  imcGlobal = imc.toFixed(2);
  if (imc < 18.5) categoriaIMC = "bajo_peso";
  else if (imc < 25) categoriaIMC = "normal";
  else if (imc < 30) categoriaIMC = "sobrepeso";
  else categoriaIMC = "obesidad";
  
  resultadoIMC.innerHTML = `Tu IMC es <strong>${imcGlobal}</strong> (${categoriaIMC.toUpperCase()})`;
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

const ejerciciosPorIMC = {
  bajo_peso: [ { nombre: "Sentadillas", duracion: "3x15", beneficio: "Masa muscular" }, { nombre: "Flexiones", duracion: "3x10", beneficio: "Fuerza" }, { nombre: "Zancadas", duracion: "3x12", beneficio: "Piernas" } ],
  normal: [ { nombre: "Trote", duracion: "20 min", beneficio: "Cardio" }, { nombre: "Yoga", duracion: "25 min", beneficio: "Flexibilidad" }, { nombre: "Bici", duracion: "20 min", beneficio: "Piernas" } ],
  sobrepeso: [ { nombre: "Caminata rápida", duracion: "30 min", beneficio: "Quema grasa" }, { nombre: "Natación", duracion: "20 min", beneficio: "Bajo impacto" }, { nombre: "Tai Chi", duracion: "20 min", beneficio: "Equilibrio" } ],
  obesidad: [ { nombre: "Caminata suave", duracion: "25 min", beneficio: "Circulación" }, { nombre: "Ejercicios silla", duracion: "3x10", beneficio: "Fuerza segura" }, { nombre: "Respiración", duracion: "10 min", beneficio: "Relax" } ]
};

function mostrarEjercicios() {
  if (!categoriaIMC) { tablaEjercicios.innerHTML = `<tr><td colspan="3">Calcula IMC primero</td></tr>`; return; }
  const lista = ejerciciosPorIMC[categoriaIMC] || [];
  tablaEjercicios.innerHTML = lista.map(e => `<tr><td>${e.nombre}</td><td>${e.duracion}</td><td>${e.beneficio}</td></tr>`).join('');
}

// Carrusel Lógica
let cardWidth = 0;
const prevBtn = document.querySelector('.carrusel-btn.prev');
const nextBtn = document.querySelector('.carrusel-btn.next');
const carruselContainer = document.querySelector('.carrusel-container');
function calcularCarrusel() { const c = carrusel.querySelector('.producto-card'); if(c) cardWidth = c.offsetWidth + 20; }
function mover(dir) { 
    const max = carrusel.scrollWidth - carrusel.clientWidth;
    carrusel.scrollLeft = (dir==='next') ? (carrusel.scrollLeft >= max-10 ? 0 : carrusel.scrollLeft + cardWidth) : (carrusel.scrollLeft <= 10 ? max : carrusel.scrollLeft - cardWidth);
}
let autoSlide = setInterval(()=>mover('next'), 5000);
if(carruselContainer){
    carruselContainer.addEventListener('mouseenter', ()=>clearInterval(autoSlide));
    carruselContainer.addEventListener('mouseleave', ()=> autoSlide = setInterval(()=>mover('next'), 5000));
}
if(nextBtn) nextBtn.addEventListener('click', ()=>mover('next'));
if(prevBtn) prevBtn.addEventListener('click', ()=>mover('prev'));

// Eventos
calcBtn.addEventListener('click', () => calcularIMCFirebase(parseFloat(pesoInput.value), parseFloat(estaturaInput.value)));
edadCards.forEach(c => c.addEventListener('click', mostrarEjercicios));
abrirCarritoBtn.addEventListener('click', ()=>modalCarritoOverlay.classList.add('visible'));
cerrarCarritoBtn.addEventListener('click', ()=>modalCarritoOverlay.classList.remove('visible'));

// === ARRANQUE ===
validarSesion();