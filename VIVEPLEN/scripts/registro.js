// registro.js
document.getElementById('registro').addEventListener('click', async (e) => {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value;
  const edad = document.getElementById('edad').value;
  const estatura = document.getElementById('estatura').value;
  const peso = document.getElementById('peso').value;
  const email = document.getElementById('emailreg').value;
  const password = document.getElementById('passwordreg').value;

  try {
    const res = await fetch('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, edad, estatura, peso, email, password })
    });

    const data = await res.json();
    if (data.success) {
      alert('Usuario creado correctamente');
      window.location.href = "login.html";
    } else {
      alert('Error: ' + data.error);
    }
  } catch (err) {
    alert('Error de conexión: ' + err.message);
  }
});
