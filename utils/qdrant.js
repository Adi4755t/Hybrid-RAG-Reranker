import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from "dotenv";

dotenv.config();

const client = new QdrantClient({
    url: process.env.QDRANT_URL,
});

export async function initializeQdrant() {

    const collections = await client.getCollections();

    const exists = collections.collections.some(
        (collection) => collection.name === "documents"
    );

    if (!exists) {

        await client.createCollection("documents", {

            vectors: {

                size: 384,

                distance: "Cosine"

            }

        });

        console.log("Qdrant Collection Created");

    }

}

export default client;