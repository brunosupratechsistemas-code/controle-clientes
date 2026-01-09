const express = require("express");
const { exec } = require("child_process");

const app = express();
app.use(express.json());

app.post("/enviar-relatorio", (req, res) => {
  exec("node scripts/relatorio.js", (err, stdout, stderr) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Erro ao gerar relatório");
    }
    res.send("Relatório enviado");
  });
});

app.listen(3001, () => {
  console.log("🚀 Webhook de relatório ativo na porta 3001");
});
