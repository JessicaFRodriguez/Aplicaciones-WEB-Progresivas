const usuariosTabla = document.getElementById('usuariosTabla');
const logoutBtn = document.getElementById('logoutBtn');

// === VALIDAR SESIÓN Y ROL ===
async function validarAdmin() {
  const res = await fetch('/api/session');
  const data = await res.json();
  if (!data.loggedIn) return window.location.href = 'login.html';
  if (data.role !== 'admin') {
    alert('No tienes permisos de administrador.');
    return window.location.href = 'home.html';
  }
  cargarUsuarios();
}

// === CARGAR USUARIOS ===
async function cargarUsuarios() {
  usuariosTabla.innerHTML = '';
  const res = await fetch('/api/usuarios');
  const usuarios = await res.json();

  usuarios.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input value="${u.nombre}" data-id="${u.uid}" data-field="nombre"></td>
      <td><input value="${u.edad || ''}" type="number" data-id="${u.uid}" data-field="edad"></td>
      <td><input value="${u.estatura || ''}" type="number" step="0.01" data-id="${u.uid}" data-field="estatura"></td>
      <td><input value="${u.peso || ''}" type="number" data-id="${u.uid}" data-field="peso"></td>
      <td>
        <select data-id="${u.uid}" data-field="role">
          <option value="user" ${u.role === 'user' ? 'selected' : ''}>Usuario</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </td>
      <td>
        <button data-id="${u.uid}" class="saveBtn">Editar</button>
        <button data-id="${u.uid}" class="deleteBtn">Eliminar</button>
      </td>
    `;
    usuariosTabla.appendChild(tr);
  });

  // === EDITAR ===
  document.querySelectorAll('.saveBtn').forEach(btn => {
    btn.addEventListener('click', async e => {
      const id = e.target.dataset.id;
      const tr = e.target.closest('tr');
      const updates = {};
      tr.querySelectorAll('input, select').forEach(el => updates[el.dataset.field] = el.value);
      await fetch(`/api/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      alert('Usuario actualizado');
    });
  });

  // === ELIMINAR ===
  document.querySelectorAll('.deleteBtn').forEach(btn => {
    btn.addEventListener('click', async e => {
      const id = e.target.dataset.id;
      if (!confirm('¿Seguro que quieres eliminar este usuario?')) return;
      await fetch(`/api/usuarios/${id}`, { method: 'DELETE' });
      alert('Usuario eliminado');
      cargarUsuarios();
    });
  });
}

// === LOGOUT ===
logoutBtn.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = 'login.html';
});

// === INICIO ===
validarAdmin();
