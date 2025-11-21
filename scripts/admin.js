// ===============================
// 1. SEGURIDAD (EL PORTERO)
// ===============================
const userId = localStorage.getItem("userId");

// Si NO hay usuario guardado, expulsar inmediatamente
if (!userId) {
  window.location.href = "login.html";
  // Detenemos la ejecución para que no cargue nada más
  throw new Error("Acceso denegado: No hay sesión activa.");
}

// Si SÍ hay usuario, hacemos visible la página
document.body.style.display = "block";


// ===============================
// 2. LÓGICA DE ADMIN
// ===============================

// Detecta automáticamente si estás en localhost o en Render
const BACKEND_URL = window.location.origin;

const usersTable = document.getElementById("usuariosTabla");
const logoutBtn = document.getElementById("logoutBtn");

const editModal = document.getElementById("editModal");
const closeModal = document.getElementById("closeModal");
const editForm = document.getElementById("editForm");

// -------------------------------
// Cargar usuarios
// -------------------------------
async function loadUsers() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/users`);

    // Capa de seguridad extra: Si el servidor responde "No autorizado" (401/403)
    if (res.status === 401 || res.status === 403) {
      alert("Tu sesión ha expirado.");
      localStorage.removeItem("userId");
      window.location.href = "login.html";
      return;
    }

    const users = await res.json();

    if (!Array.isArray(users) || users.length === 0) {
      usersTable.innerHTML = `<tr><td colspan="7">No hay usuarios registrados</td></tr>`;
      return;
    }

    usersTable.innerHTML = users
      .map(
        (u) => `
      <tr>
        <td>${u.name || "-"}</td>
        <td>${u.age || "-"}</td>
        <td>${u.height || "-"}</td>
        <td>${u.weight || "-"}</td>
        <td>${u.email || "-"}</td>
        <td>${u.role || "-"}</td>
        <td>
          <button class="delete-btn" data-uid="${u.uid}">🗑</button>
          <button class="edit-btn" data-uid="${u.uid}">✏️</button>
        </td>
      </tr>
    `
      )
      .join("");

    // Asignar eventos a los botones recién creados
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => deleteUser(btn.dataset.uid));
    });
    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", () => editUser(btn.dataset.uid));
    });
  } catch (err) {
    console.error(err);
    usersTable.innerHTML = `<tr><td colspan="7">Error al cargar usuarios</td></tr>`;
  }
}

// -------------------------------
// Borrar usuario
// -------------------------------
async function deleteUser(uid) {
  if (!confirm("¿Seguro que deseas eliminar este usuario?")) return;

  try {
    const res = await fetch(`${BACKEND_URL}/api/users/${uid}`, {
      method: "DELETE",
    });
    
    if (res.ok) {
      alert("Usuario eliminado correctamente");
      loadUsers(); // Recargar tabla
    } else {
      alert("Error al eliminar usuario");
    }
  } catch (err) {
    console.error(err);
    alert("Error de conexión");
  }
}

// -------------------------------
// Editar usuario (Abrir Modal)
// -------------------------------
function editUser(uid) {
  const row = Array.from(usersTable.rows).find(
    (r) => r.querySelector(".edit-btn")?.dataset.uid === uid
  );
  if (!row) return;

  document.getElementById("editUid").value = uid;
  document.getElementById("editName").value = row.cells[0].textContent;
  document.getElementById("editAge").value = row.cells[1].textContent;
  document.getElementById("editHeight").value = row.cells[2].textContent;
  document.getElementById("editWeight").value = row.cells[3].textContent;
  document.getElementById("editRole").value = row.cells[5].textContent;
  document.getElementById("editPassword").value = ""; // Limpiar password

  editModal.style.display = "flex";
}

// -------------------------------
// Cerrar modal
// -------------------------------
closeModal.addEventListener("click", () => (editModal.style.display = "none"));
window.addEventListener("click", (e) => {
  if (e.target === editModal) editModal.style.display = "none";
});

// -------------------------------
// Guardar cambios (PUT)
// -------------------------------
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

  const newPassword = document.getElementById("editPassword").value.trim();
  if (newPassword) {
    payload.password = newPassword;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/users/${uid}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      alert("Usuario actualizado correctamente");
      editModal.style.display = "none";
      loadUsers();
    } else {
      alert("Error al actualizar usuario");
    }
  } catch (err) {
    console.error(err);
    alert("Error de conexión");
  }
});

// -------------------------------
// Cerrar sesión
// -------------------------------
logoutBtn.addEventListener("click", async () => {
  try {
    // Intentamos avisar al backend (opcional, pero recomendado)
    await fetch(`${BACKEND_URL}/api/logout`, { method: "POST" });
  } catch (error) {
    console.warn("No se pudo contactar al servidor para logout, cerrando localmente.");
  }

  // Siempre limpiamos el navegador
  alert("Sesión cerrada");
  localStorage.removeItem("userId");
  window.location.href = "login.html";
});

// -------------------------------
// Inicialización
// -------------------------------
loadUsers();