import { StateGraph, START, END } from "@langchain/langgraph";

import GraphState from "./state.js";

import retrieveNode from "./nodes/retrieve.js";
import rerankNode from "../utils/rerank.js";
import answerNode from "./nodes/answer.js";

const workflow = new StateGraph(GraphState)

    .addNode("retrieve", retrieveNode)

    .addNode("rerank", rerankNode)

    .addNode("answer", answerNode)

    .addEdge(START, "retrieve")

    .addEdge("retrieve", "rerank")

    .addEdge("rerank", "answer")

    .addEdge("answer", END);

const graph = workflow.compile();

export default graph;