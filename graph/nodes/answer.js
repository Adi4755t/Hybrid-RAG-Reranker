import askQwen from "../../utils/qwen.js";

export default async function answerNode(state) {

    const answer = await askQwen(

        state.question,

        state.retrievedChunks

    );

    return {

        ...state,

        answer

    };

}