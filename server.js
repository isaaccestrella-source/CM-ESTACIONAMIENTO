const express = require("express");
const app = express();

app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Servidor activo");
});

app.post("/webhook", (req, res) => {
  res.set("Content-Type", "text/xml");
  res.send(`
<Response>
  <Message>Prueba exitosa desde CM Estacionamiento</Message>
</Response>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor corriendo en puerto " + PORT);
});
