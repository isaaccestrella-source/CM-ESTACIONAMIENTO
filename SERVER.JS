const express = require("express");
const app = express();

app.use(express.urlencoded({ extended: true }));

app.post("/webhook", (req, res) => {
  const fecha = new Date();

  const respuesta = `
🚗 CM Estacionamiento Público

📅 Fecha: ${fecha.toLocaleDateString()}
⏰ Hora: ${fecha.toLocaleTimeString()}
💰 Precio por hora: $15.00 MXN
  `;

  res.set("Content-Type", "text/xml");
  res.send(`
<Response>
<Message>${respuesta}</Message>
</Response>
  `);
});

// ⚠️ ESTA PARTE ES CLAVE
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});
