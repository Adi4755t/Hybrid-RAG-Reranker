import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export default async function askQwen(question, chunks) {

    const context = chunks

        .map(chunk => chunk.text)

        .join("\n\n");

    const prompt = `
You are a helpful AI assistant.

Use ONLY the context below to answer the question.

If the answer is not present, say "I don't know."

Context:

${context}

Question:

${question}

Answer:
`;

    const response = await axios.post(

        process.env.QWEN_URL,

        {

            model: "qwen3:8b",

            prompt,

            stream: false

        }

    );

    return response.data.response;

}