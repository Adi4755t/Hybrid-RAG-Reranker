import { pipeline } from "@xenova/transformers";

const reranker = await pipeline(
    "text-classification",
    "Xenova/ms-marco-MiniLM-L-6-v2"
);

export default async function crossEncoder(question, chunks) {

    const inputs = chunks.map(chunk => ({

        text: question,

        text_pair: chunk.text

    }));

    const results = await reranker(inputs);

    const scoredChunks = chunks.map((chunk, index) => ({

        ...chunk,

        score: results[index].score

    }));

    scoredChunks.sort((a, b) => b.score - a.score);

    return scoredChunks.slice(0, 5);

}