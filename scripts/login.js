// ===============================
// LOGIN.JS - Versión segura
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById('login');
  const logoutBtn = document.getElementById('cerrar');
  const emailInput = document.getElementById('emaillog');
  const passwordInput = document.getElementById('passwordlog');

  // --- Verificar si existen los elementos ---
  if (!loginBtn || !emailInput || !passwordInput) {
    console.warn("⚠️ No se encontró el formulario o el botón de inicio de sesión");
    return;
  }

  // --- LOGIN ---
  loginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      return alert('Please enter your email and password.');
    }

    try {
      const res = await fetch('https://aplicaciones-web-progresivas-5cbe.onrender.com/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('userId', data.uid);
        if (data.role === 'admin') {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'home.html';
        }
      } else {
        alert('Login error: ' + data.error);
      }
    } catch (err) {
      alert('Connection error: ' + err.message);
    }
  });

  // --- LOGOUT ---
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('https://aplicaciones-web-progresivas-5cbe.onrender.com/api/logout', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          alert('Session closed');
          localStorage.removeItem('userId');
          window.location.href = 'login.html';
        }
      } catch (err) {
        alert('Error closing session: ' + err.message);
      }
    });
  }
});
