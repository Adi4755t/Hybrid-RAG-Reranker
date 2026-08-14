import express from "express";
import multer from "multer";
import fs from "fs";
import { PDFParse } from "pdf-parse";

import prisma from "../db/prisma.js";
import embedder from "../utils/embedder.js";
import client from "../utils/qdrant.js";
import { chunkText } from "../utils/chunker.js";

const router = express.Router();

const storage = multer.diskStorage({

    destination: "uploads",

    filename: (req, file, cb) => {

        cb(null, `${Date.now()}-${file.originalname}`);

    }

});

const upload = multer({ storage });

router.post("/", upload.single("pdf"), async (req, res) => {

    try {

        const { subject, semester, unit } = req.body;

        // ----------------------------
        // Save Document
        // ----------------------------

        const document = await prisma.document.create({

            data: {

                title: req.file.originalname,

                filename: req.file.filename,

                subject,

                semester: Number(semester),

                unit: Number(unit)

            }

        });

        // ----------------------------
        // Read PDF
        // ----------------------------

        const buffer = fs.readFileSync(`uploads/${req.file.filename}`);

        const parser = new PDFParse({ data: buffer });

const pdfData = await parser.getText();

await parser.destroy();

        // ----------------------------
        // Chunk Text
        // ----------------------------

        const chunks = chunkText(pdfData.text);

        console.log(`Created ${chunks.length} chunks`);

        // ----------------------------
        // Store Chunks
        // ----------------------------

        const storedChunks = [];

        for (let index = 0; index < chunks.length; index++) {

            const chunk = await prisma.chunk.create({

                data: {

                    documentId: document.id,

                    chunkIndex: index,

                    text: chunks[index]

                }

            });

            storedChunks.push(chunk);

        }
                // ----------------------------
        // Generate Embeddings + Store in Qdrant
        // ----------------------------

        for (const chunk of storedChunks) {

            const embedding = await embedder(chunk.text, {
                pooling: "mean",
                normalize: true,
            });

            await client.upsert("documents", {
    wait: true,
    points: [
        {
            id: chunk.id,
            vector: Array.from(embedding.data),
            payload: {
                chunkId: chunk.id
            }
        }
    ]
});
        }

        res.json({

            success: true,

            message: "PDF indexed successfully",

            documentId: document.id,

            totalChunks: storedChunks.length

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            error: error.message

        });

    }

});

export default router;