import crossEncoder from "./crossEncoder.js";

export default async function rerankNode(state) {

    const topChunks = await crossEncoder(

        state.question,

        state.retrievedChunks

    );

    return {

        ...state,

        retrievedChunks: topChunks

    };

}