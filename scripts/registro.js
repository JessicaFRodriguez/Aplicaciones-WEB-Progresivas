// ===============================
// REGISTRO.JS - Versión Render Ready
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  const registerBtn = document.getElementById("registro");
  const form = document.getElementById("registerForm");

  if (!registerBtn || !form) {
    console.error("No se encontró el formulario o el botón de registro");
    return;
  }

  registerBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const age = document.getElementById("age").value.trim();
    const height = document.getElementById("height").value.trim();
    const weight = document.getElementById("weight").value.trim();
    const email = document.getElementById("emailreg").value.trim();
    const password = document.getElementById("passwordreg").value.trim();

    if (!name || !age || !height || !weight || !email || !password) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      const res = await fetch(`${window.location.origin}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, age, height, weight, email, password }),
      });

      const data = await res.json();
      if (data.success) {
        alert("User registered successfully.");
        window.location.href = "login.html";
      } else {
        alert("Error: " + (data.error || "Unexpected error"));
      }
    } catch (err) {
      alert("Connection error: " + err.message);
    }
  });
});
