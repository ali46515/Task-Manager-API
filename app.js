import express from "express";
import { config } from "dotenv";

config();

const app = express();

app.listen(process.env.PORT || 8080, process.env.IP || "0.0.0.0", () => {
  console.log(`Port: http://localhost:${process.env.PORT}`);
});
