// ===============================
// LOGIN.JS - Manejo del formulario de entrada
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById('login');
  const emailInput = document.getElementById('emaillog');
  const passwordInput = document.getElementById('passwordlog');
  const logoutBtn = document.getElementById('cerrar'); // Por si tienes botón de salir en login

  // --- LOGIN ---
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();

      if (!email || !password) {
        return alert('Por favor ingresa correo y contraseña.');
      }

      try {
        // Conexión al servidor
        const res = await fetch(`${window.location.origin}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (data.success) {
          // 1. Guardamos el ID
          localStorage.setItem('userId', data.uid);
          
          // 2. ¡IMPORTANTE! Guardamos el ROL para que admin.js lo pueda revisar después
          localStorage.setItem('userRole', data.role); 

          // 3. Redirigimos según el rol
          if (data.role === 'admin') {
            window.location.href = 'admin.html';
          } else {
            window.location.href = 'home.html';
          }
        } else {
          alert('Error de login: ' + (data.error || 'Datos incorrectos'));
        }
      } catch (err) {
        alert('Error de conexión: ' + err.message);
      }
    });
  }

  // --- LOGOUT (Opcional en esta pantalla) ---
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        // Limpieza total
        localStorage.clear();
        window.location.reload();
    });
  }
});