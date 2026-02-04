import express from "express";

const app = express();
const PORT = Number(process.env.PORT) || 10000;

app.get("/", (req, res) => res.status(200).send("OK"));
app.listen(PORT, () => {
  console.log(`Health server listening on port ${PORT}`);
});
