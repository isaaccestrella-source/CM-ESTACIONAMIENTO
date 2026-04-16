const express = require("express");
const app = express();

app.use(express.urlencoded({ extended: true }));

const registros = {};
const TARIFA_POR_HORA = 15;

function formatearFecha(fecha) {
  return fecha.toLocaleDateString("es-MX", {
    timeZone: "America/Mexico_City"
  });
}

function formatearHora(fecha) {
  return fecha.toLocaleTimeString("es-MX", {
    timeZone: "America/Mexico_City",
    hour: "2-digit",
    minute: "2-digit"
  });
}

app.get("/", (req, res) => {
  res.send("Servidor activo");
});

app.post("/webhook", (req, res) => {
  const mensaje = (req.body.Body || "").trim().toLowerCase();
  const numero = req.body.From;

  let respuesta = "";

  if (mensaje === "registrar entrada") {
    const ahora = new Date();
    registros[numero] = ahora;

    respuesta = `🎟️ TICKET DE ENTRADA

🚗 CM Estacionamiento Público
📅 Fecha: ${formatearFecha(ahora)}
⏰ Hora de registro: ${formatearHora(ahora)}
💰 Precio por hora: $${TARIFA_POR_HORA.toFixed(2)} MXN

Tu entrada ha sido registrada correctamente.`;
  } else if (mensaje === "salida") {
    const entrada = registros[numero];

    if (!entrada) {
      respuesta = `No encontré una entrada activa para este número.

Escribe:
- Registrar entrada
- Salida`;
    } else {
      const ahora = new Date();
      const diferenciaMs = ahora - entrada;
      const horas = Math.max(1, Math.ceil(diferenciaMs / (1000 * 60 * 60)));
      const total = horas * TARIFA_POR_HORA;

      respuesta = `🧾 TICKET DE SALIDA

🚗 CM Estacionamiento Público
📅 Fecha: ${formatearFecha(ahora)}
⏰ Hora de entrada: ${formatearHora(entrada)}
⏰ Hora de salida: ${formatearHora(ahora)}
⏱️ Tiempo cobrado: ${horas} hora(s)
💰 Total a pagar: $${total.toFixed(2)} MXN

Gracias por su preferencia.`;

      delete registros[numero];
    }
  } else {
    respuesta = `Bienvenido a CM Estacionamiento Público.

Escribe una de estas opciones:
- Registrar entrada
- Salida

Tarifa vigente: $15.00 MXN por hora.`;
  }

  res.set("Content-Type", "text/xml");
  res.send(`
<Response>
  <Message>${respuesta}</Message>
</Response>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor corriendo en puerto " + PORT);
});
