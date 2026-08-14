import prisma from "../../db/prisma.js";
import embedder from "../../utils/embedder.js";
import client from "../../utils/qdrant.js";
import bm25Search from "../../utils/bm25.js";

export default async function retrieveNode(state) {

    const {
        question,
        subject,
        semester,
        unit
    } = state;

    // ------------------------------------------
    // STEP 1 : Get Candidate Chunks
    // ------------------------------------------

    const candidateChunks = await prisma.chunk.findMany({

        where: {

            document: {

                subject,

                semester,

                unit

            }

        },

        select: {

            id: true,

            text: true,

            chunkIndex: true

        }

    });

    console.log(`Candidate Chunks : ${candidateChunks.length}`);

    // ------------------------------------------
    // STEP 2 : Build Fast Lookup Map
    // ------------------------------------------

    const chunkMap = new Map();

    for (const chunk of candidateChunks) {

        chunkMap.set(chunk.id, chunk);

    }

    // ------------------------------------------
    // STEP 3 : Generate Question Embedding
    // ------------------------------------------

    const embedding = await embedder(question, {

        pooling: "mean",

        normalize: true

    });

    // ------------------------------------------
    // STEP 4 : Vector Search
    // (Only Candidate Chunk IDs)
    // ------------------------------------------

    const vectorResults = await client.queryPoints({

        collection_name: "documents",

        query: Array.from(embedding.data),

        limit: 10,

        filter: {

            has_id: candidateChunks.map(chunk => chunk.id)

        }

    });

    // ------------------------------------------
    // STEP 5 : Convert Vector IDs
    // into Chunk Objects
    // ------------------------------------------

    const vectorChunks = vectorResults.points

        .map(point => chunkMap.get(point.id))

        .filter(Boolean);

    // ------------------------------------------
    // STEP 6 : BM25
    // ------------------------------------------

    const bm25Chunks = bm25Search(

        question,

        candidateChunks

    );

    // ------------------------------------------
    // STEP 7 : Merge
    // ------------------------------------------

    const mergedMap = new Map();

    for (const chunk of vectorChunks) {

        mergedMap.set(chunk.id, chunk);

    }

    for (const chunk of bm25Chunks) {

        mergedMap.set(chunk.id, chunk);

    }

    const mergedChunks = Array.from(mergedMap.values());

    return {

        ...state,

        retrievedChunks: mergedChunks

    };

}