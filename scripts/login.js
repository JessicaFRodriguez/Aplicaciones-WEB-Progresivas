// ===============================
// LOGIN.JS - English fields + Firestore users
// ===============================

document.getElementById('login').addEventListener('click', async () => {
  const email = document.getElementById('emaillog').value;
  const password = document.getElementById('passwordlog').value;

  if (!email || !password) {
    return alert('Please enter your email and password.');
  }

  try {
    const res = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.success) {
      // Guardar UID en localStorage
      localStorage.setItem('userId', data.uid);

      // Redirección según rol
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

// Logout
document.getElementById('cerrar').addEventListener('click', async () => {
  try {
    const res = await fetch('http://localhost:3000/api/logout', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert('Session closed');
      localStorage.removeItem('userId');
    }
  } catch (err) {
    alert('Error closing session: ' + err.message);
  }
});
