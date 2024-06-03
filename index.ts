import cors from "cors";
import express from "express";
import pinoHttp from "pino-http";
import { identify } from "./controller/Contact";
import rateLimiter from "./utils/rateLimiter";
import bodyParser from "body-parser";
import logger from "./utils/logger";
const app = express();

app.use(express.json());
app.use(cors());
app.use(rateLimiter);
app.use(bodyParser.json());
app.use(pinoHttp({ logger }));

app.use("/", require("./routes/Contact"));
app.post("/identify", identify);

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
