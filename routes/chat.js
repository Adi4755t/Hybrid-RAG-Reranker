import express from "express";

import redis from "../db/redis.js";
import graph from "../graph/graph.js";

const router = express.Router();

router.post("/", async (req, res) => {

    try {

        const {

            question,

            subject,

            semester,

            unit

        } = req.body;

        // ----------------------------------
        // Cache Key
        // ----------------------------------

        const cacheKey = `${subject}:${semester}:${unit}:${question}`;

        // ----------------------------------
        // Check Redis
        // ----------------------------------

        const cachedAnswer = await redis.get(cacheKey);

        if (cachedAnswer) {

            return res.json({

                success: true,

                source: "redis",

                answer: cachedAnswer

            });

        }

        // ----------------------------------
        // LangGraph
        // ----------------------------------

        const result = await graph.invoke({

            question,

            subject,

            semester,

            unit

        });

        // ----------------------------------
        // Store in Redis
        // ----------------------------------

        await redis.set(

            cacheKey,

            result.answer,

            "EX",

            3600

        );

        // ----------------------------------
        // Return
        // ----------------------------------

        res.json({

            success: true,

            source: "qwen",

            answer: result.answer

        });

    }

    catch (error) {

        console.log(error);

        res.status(500).json({

            success: false,

            error: error.message

        });

    }

});

export default router;