import { Annotation } from "@langchain/langgraph";

const GraphState = Annotation.Root({

    question: Annotation(),

    subject: Annotation(),

    semester: Annotation(),

    unit: Annotation(),

    candidateChunks: Annotation(),

    retrievedChunks: Annotation(),

    answer: Annotation()

});

export default GraphState;