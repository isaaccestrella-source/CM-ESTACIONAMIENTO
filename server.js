const express = require("express");
const app = express();
const { db, admin } = require("./firebase");

app.use(express.urlencoded({ extended: true }));

const TARIFA_POR_HORA = 15;
const ESTACIONAMIENTO = "CM Estacionamiento Público";

function formatearFecha(fecha) {
  return fecha.toLocaleDateString("es-MX", {
    timeZone: "America/Mexico_City",
  });
}

function formatearHora(fecha) {
  return fecha.toLocaleTimeString("es-MX", {
    timeZone: "America/Mexico_City",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function generarFolio() {
  const ahora = new Date();
  const yyyy = ahora.getFullYear();
  const mm = String(ahora.getMonth() + 1).padStart(2, "0");
  const dd = String(ahora.getDate()).padStart(2, "0");
  const aleatorio = Math.floor(1000 + Math.random() * 9000);
  return `CM-${yyyy}${mm}${dd}-${aleatorio}`;
}

app.get("/", (req, res) => {
  res.send("Servidor activo");
});

app.post("/webhook", async (req, res) => {
  const mensaje = (req.body.Body || "").trim();
  const mensajeMin = mensaje.toLowerCase();
  const numero = req.body.From;

  let respuesta = "";

  try {
    const activosSnap = await db
      .collection("tickets")
      .where("telefono", "==", numero)
      .where("estatus", "==", "activo")
      .limit(1)
      .get();

    if (mensajeMin === "registrar entrada") {
      if (!activosSnap.empty) {
        const ticket = activosSnap.docs[0].data();
        respuesta = `Ya tienes una entrada activa.

🎟️ Folio: ${ticket.folio}
🚘 Placa: ${ticket.placa || "No registrada"}

Si deseas cerrar tu ticket, escribe:
Salida`;
      } else {
        await db.collection("sesiones").doc(numero).set({
          paso: "esperando_placa",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        respuesta = `Bienvenido a ${ESTACIONAMIENTO}.

Por favor escribe la placa de tu vehículo para registrar tu entrada.`;
      }
    } else if (mensajeMin === "salida") {
      if (activosSnap.empty) {
        respuesta = `No encontré una entrada activa para este número.

Escribe:
Registrar entrada`;
      } else {
        const doc = activosSnap.docs[0];
        const ticket = doc.data();

        const ahora = new Date();
        const entrada = ticket.fechaEntrada.toDate();
        const diffMs = ahora - entrada;
        const horas = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
        const total = horas * TARIFA_POR_HORA;

        await doc.ref.update({
          fechaSalida: admin.firestore.Timestamp.fromDate(ahora),
          horasCobradas: horas,
          total,
          estatus: "cerrado",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        respuesta = `🧾 TICKET DE SALIDA

🚗 ${ESTACIONAMIENTO}
🎟️ Folio: ${ticket.folio}
🚘 Placa: ${ticket.placa}

📅 Fecha: ${formatearFecha(ahora)}
⏰ Hora de entrada: ${formatearHora(entrada)}
⏰ Hora de salida: ${formatearHora(ahora)}
⏱️ Tiempo cobrado: ${horas} hora(s)
💰 Tarifa: $${TARIFA_POR_HORA.toFixed(2)} MXN por hora
💵 Total a pagar: $${total.toFixed(2)} MXN

Gracias por su preferencia.`;
      }
    } else {
      const sesionRef = db.collection("sesiones").doc(numero);
      const sesionSnap = await sesionRef.get();

      if (sesionSnap.exists && sesionSnap.data().paso === "esperando_placa") {
        const placa = mensaje.toUpperCase();
        const ahora = new Date();
        const folio = generarFolio();

        await db.collection("tickets").add({
          folio,
          telefono: numero,
          placa,
          estacionamiento: ESTACIONAMIENTO,
          fechaEntrada: admin.firestore.Timestamp.fromDate(ahora),
          fechaSalida: null,
          tarifaHora: TARIFA_POR_HORA,
          horasCobradas: 0,
          total: 0,
          estatus: "activo",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await sesionRef.delete();

        respuesta = `🎟️ TICKET DE ENTRADA

🚗 ${ESTACIONAMIENTO}
🎟️ Folio: ${folio}
🚘 Placa: ${placa}
📅 Fecha: ${formatearFecha(ahora)}
⏰ Hora de registro: ${formatearHora(ahora)}
💰 Precio por hora: $${TARIFA_POR_HORA.toFixed(2)} MXN

Tu entrada ha sido registrada correctamente.

Cuando vayas a salir, escribe:
Salida`;
      } else {
        respuesta = `Bienvenido a ${ESTACIONAMIENTO}.

Escribe una de estas opciones:
- Registrar entrada
- Salida

Tarifa vigente: $${TARIFA_POR_HORA.toFixed(2)} MXN por hora.`;
      }
    }

    res.set("Content-Type", "text/xml");
    res.send(`
<Response>
  <Message>${respuesta}</Message>
</Response>`);
  } catch (error) {
    console.error("Error en webhook:", error);

    res.set("Content-Type", "text/xml");
    res.send(`
<Response>
  <Message>Ocurrió un error procesando tu solicitud. Intenta nuevamente.</Message>
</Response>`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor corriendo en puerto " + PORT);
});
