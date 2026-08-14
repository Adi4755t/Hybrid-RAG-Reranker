import { pipeline } from "@xenova/transformers";

const embedder = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
);

export default embedder;