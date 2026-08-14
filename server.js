import express from "express";
import dotenv from "dotenv";

import uploadRoute from "./routes/upload.js";
import chatRoute from "./routes/chat.js";
import { initializeQdrant } from "./utils/qdrant.js";
dotenv.config();

const app = express();

app.use(express.json());

app.use("/upload", uploadRoute);
app.use("/chat", chatRoute);

app.get("/", (req, res) => {
    res.send("RAG Server Running 🚀");
});
await initializeQdrant();
app.listen(process.env.PORT, () => {
    console.log(`Server running on ${process.env.PORT}`);
});