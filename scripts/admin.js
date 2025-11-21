// ===============================
// 1. SEGURIDAD ESTRICTA (EL PORTERO)
// ===============================
const userId = localStorage.getItem("userId");
const userRole = localStorage.getItem("userRole");

// A. Si no tiene ID -> Al Login
if (!userId) {
  window.location.href = "login.html";
  throw new Error("Acceso denegado: No logueado");
}

// B. Si tiene ID pero NO es admin -> Al Home (expulsado)
if (userRole !== "admin") {
  alert("Acceso restringido: Solo para administradores.");
  window.location.href = "home.html"; 
  throw new Error("Acceso denegado: No autorizado");
}

// C. Si pasó las dos pruebas, mostramos la página
document.body.style.display = "block";


// ===============================
// 2. LÓGICA DE LA TABLA DE USUARIOS
// ===============================
const BACKEND_URL = window.location.origin;
const usersTable = document.getElementById("usuariosTabla");
const logoutBtn = document.getElementById("logoutBtn");
const editModal = document.getElementById("editModal");
const closeModal = document.getElementById("closeModal");
const editForm = document.getElementById("editForm");

async function loadUsers() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/users`);

    // Si el servidor dice que la sesión caducó
    if (res.status === 401 || res.status === 403) {
      localStorage.clear(); // Borrar todo
      window.location.href = "login.html";
      return;
    }

    const users = await res.json();

    if (!Array.isArray(users) || users.length === 0) {
      usersTable.innerHTML = `<tr><td colspan="7">No hay usuarios</td></tr>`;
      return;
    }

    usersTable.innerHTML = users.map(u => `
  <tr>
    <td data-label="Nombre">${u.name || "-"}</td>
    <td data-label="Edad">${u.age || "-"}</td>
    <td data-label="Estatura">${u.height || "-"}</td>
    <td data-label="Peso">${u.weight || "-"}</td>
    <td data-label="Email">${u.email || "-"}</td>
    <td data-label="Rol">${u.role || "-"}</td>
    <td data-label="Acciones">
      <button class="delete-btn" data-uid="${u.uid}">🗑</button>
      <button class="edit-btn" data-uid="${u.uid}">✏️</button>
    </td>
  </tr>
`).join("");

    document.querySelectorAll(".delete-btn").forEach(btn => 
      btn.addEventListener("click", () => deleteUser(btn.dataset.uid))
    );
    document.querySelectorAll(".edit-btn").forEach(btn => 
      btn.addEventListener("click", () => editUser(btn.dataset.uid))
    );
  } catch (err) {
    console.error(err);
    usersTable.innerHTML = `<tr><td colspan="7">Error cargando datos</td></tr>`;
  }
}

async function deleteUser(uid) {
  if (!confirm("¿Eliminar usuario?")) return;
  try {
    const res = await fetch(`${BACKEND_URL}/api/users/${uid}`, { method: "DELETE" });
    if (res.ok) {
      alert("Eliminado");
      loadUsers();
    } else {
      alert("Error al eliminar");
    }
  } catch (err) { console.error(err); }
}

function editUser(uid) {
  const row = Array.from(usersTable.rows).find(r => r.querySelector(".edit-btn")?.dataset.uid === uid);
  if (!row) return;

  document.getElementById("editUid").value = uid;
  document.getElementById("editName").value = row.cells[0].textContent;
  document.getElementById("editAge").value = row.cells[1].textContent;
  document.getElementById("editHeight").value = row.cells[2].textContent;
  document.getElementById("editWeight").value = row.cells[3].textContent;
  document.getElementById("editRole").value = row.cells[5].textContent;
  document.getElementById("editPassword").value = "";
  editModal.style.display = "flex";
}

closeModal.addEventListener("click", () => editModal.style.display = "none");
window.addEventListener("click", (e) => { if (e.target === editModal) editModal.style.display = "none"; });

editForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const uid = document.getElementById("editUid").value;
  const payload = {
    name: document.getElementById("editName").value,
    age: parseInt(document.getElementById("editAge").value) || 0,
    height: parseFloat(document.getElementById("editHeight").value) || 0,
    weight: parseFloat(document.getElementById("editWeight").value) || 0,
    role: document.getElementById("editRole").value
  };
  const pass = document.getElementById("editPassword").value.trim();
  if (pass) payload.password = pass;

  try {
    const res = await fetch(`${BACKEND_URL}/api/users/${uid}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      alert("Actualizado");
      editModal.style.display = "none";
      loadUsers();
    } else { alert("Error al actualizar"); }
  } catch (err) { console.error(err); }
});

logoutBtn.addEventListener("click", async () => {
  try { await fetch(`${BACKEND_URL}/api/logout`, { method: "POST" }); } catch (e) {}
  localStorage.clear(); // Borra ID y ROL
  window.location.href = "login.html";
});

// Iniciar carga
loadUsers();