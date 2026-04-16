const express = require('express');
const app = express();

app.use(express.urlencoded({ extended: true }));

const registros = {};

function formatoFecha(fecha) {
  return fecha.toLocaleDateString('es-MX');
}

function formatoHora(fecha) {
  return fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

app.post('/webhook', (req, res) => {
  const msg = req.body.Body.toLowerCase().trim();
  const numero = req.body.From;

  let response = "";

  if (msg.includes("registrar entrada")) {
    const now = new Date();
    registros[numero] = now;

    response = `🎟️ *TICKET DE ENTRADA*

🚗 CM Estacionamiento público
📅 Fecha: ${formatoFecha(now)}
⏰ Hora: ${formatoHora(now)}
💰 Tarifa: $15.00 por hora

🟢 Estatus: ACTIVO`;
  }

  else if (msg.includes("salida")) {
    if (!registros[numero]) {
      response = "❌ No encontramos tu registro activo";
    } else {
      const entrada = registros[numero];
      const salida = new Date();

      const diffMs = salida - entrada;
      const horas = Math.ceil(diffMs / (1000 * 60 * 60));
      const total = horas * 15;

      response = `🧾 *TICKET DE SALIDA*

🚗 CM Estacionamiento público
📅 Entrada: ${formatoFecha(entrada)}
⏰ Entrada: ${formatoHora(entrada)}
⏰ Salida: ${formatoHora(salida)}

⏱️ Tiempo: ${horas} hora(s)
💰 Total: $${total}`;

      delete registros[numero];
    }
  }

  else {
    response = "Envía 'Registrar entrada' o 'Salida' 🚗";
  }

  res.set('Content-Type', 'text/xml');
  res.send(`<Response><Message>${response}</Message></Response>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor corriendo 🚀"));