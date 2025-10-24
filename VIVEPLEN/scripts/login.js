// login.js
document.getElementById('login').addEventListener('click', async () => {
  const email = document.getElementById('emaillog').value;
  const password = document.getElementById('passwordlog').value;

  try {
    const res = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.success) {
      if (data.role === 'admin') window.location.href = 'admin.html';
      else window.location.href = 'home.html';
    } else {
      alert('Error: ' + data.error);
    }
  } catch (err) {
    alert('Error de conexión: ' + err.message);
  }
});

// Cerrar sesión
document.getElementById('cerrar').addEventListener('click', async () => {
  try {
    const res = await fetch('http://localhost:3000/api/logout', { method: 'POST' });
    const data = await res.json();
    if (data.success) alert('Sesión cerrada');
  } catch (err) {
    alert('Error al cerrar sesión: ' + err.message);
  }
});
