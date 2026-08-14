import BM25 from "wink-bm25-text-search";
import winkNLP from "wink-nlp";
import model from "wink-eng-lite-web-model";

const nlp = winkNLP(model);

export default function bm25Search(question, candidateChunks) {

    const engine = BM25();

    engine.defineConfig({

        fldWeights: {

            text: 1

        },

        bm25Params: {

            k1: 1.2,

            b: 0.75

        }

    });

    engine.definePrepTasks([

        nlp.readDoc,

        doc => doc.tokens().out()

    ]);

    engine.defineField("text");

    engine.defineRef("id");

    const chunkMap = new Map();

    for (const chunk of candidateChunks) {

        chunkMap.set(chunk.id, chunk);

        engine.addDoc({

            id: chunk.id,

            text: chunk.text

        });

    }

    engine.consolidate();

    const results = engine.search(question);

    return results

        .map(result => chunkMap.get(result[0]))

        .filter(Boolean);

}