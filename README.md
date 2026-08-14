# 🔎 Hybrid-RAG-Reranker

### 🛠️ Tech Stack

<p align="center">

<img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white"/>
<img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white"/>
<img src="https://img.shields.io/badge/LangGraph-1C3C3C?style=for-the-badge"/>
<img src="https://img.shields.io/badge/BM25-Retrieval-8A2BE2?style=for-the-badge"/>
<img src="https://img.shields.io/badge/Qdrant-Vector_DB-D10000?style=for-the-badge&logo=qdrant&logoColor=white"/>
<img src="https://img.shields.io/badge/Cross--Encoder-Reranking-FF6F00?style=for-the-badge"/>
<img src="https://img.shields.io/badge/Qwen3--8B-LLM-6E4AFF?style=for-the-badge"/>
<img src="https://img.shields.io/badge/ngrok-Model_Tunnel-1F1F1F?style=for-the-badge&logo=ngrok&logoColor=white"/>
<img src="https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge&logo=postgresql&logoColor=white"/>
<img src="https://img.shields.io/badge/Redis-Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white"/>
<img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white"/>

</p>

---

## 🎯 Purpose

**Hybrid-RAG-Reranker** is a Retrieval-Augmented Generation system designed to improve the quality of retrieved context before an LLM generates an answer.

Instead of depending on a single retrieval technique, the system combines:

**BM25 lexical retrieval + Qdrant semantic search**

The retrieved candidates are then passed through a **Cross-Encoder reranker**, which scores the relevance between the user's question and each candidate chunk.

Only the highest-ranked context is finally provided to **Qwen3:8B** for answer generation.

The result is a RAG pipeline designed around:

> **Better Retrieval → Better Ranking → Better Context → Better Generation**

---

## 🔄 Core RAG Flow

```text
                    👤 User Question
                           │
                           ▼
                  ┌─────────────────┐
                  │ Hybrid Retrieval│
                  └────────┬────────┘
                           │
                 ┌─────────┴─────────┐
                 ▼                   ▼
            🔤 BM25              🔵 Qdrant
         Lexical Search       Vector Search
                 │                   │
                 └─────────┬─────────┘
                           ▼
                    📚 Candidates
                           │
                           ▼
                 🎯 Cross-Encoder
                    Reranking
                           │
                           ▼
                    ⭐ Top Context
                           │
                           ▼
                    🧠 Qwen3:8B
                           │
                           ▼
                     💬 Answer
```

---

# 🏗️ Architecture

```text
                         👤 User
                           │
                           ▼
                  ┌─────────────────┐
                  │   Node.js API   │
                  │    Express      │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │    LangGraph    │
                  │   RAG Workflow  │
                  └────────┬────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │    Hybrid Retrieval     │
              └────────────┬────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
        ┌────────────┐            ┌────────────┐
        │    BM25    │            │   Qdrant   │
        │  Retrieval │            │   Vectors  │
        └──────┬─────┘            └──────┬─────┘
               │                         │
               └───────────┬─────────────┘
                           ▼
                 📚 Candidate Chunks
                           │
                           ▼
                  ┌─────────────────┐
                  │ Cross-Encoder   │
                  │    Reranking    │
                  └────────┬────────┘
                           │
                           ▼
                    ⭐ Top Chunks
                           │
                           ▼
                  ┌─────────────────┐
                  │    Qwen3:8B     │
                  │ Local Inference │
                  └────────┬────────┘
                           │
                        ngrok
                           │
                           ▼
                     💬 Response
```

---

# 📄 Document Ingestion

Documents enter the system through the upload API.

```text
📄 PDF
  │
  ▼
Text Extraction
  │
  ▼
Chunking
  │
  ├──────────────► PostgreSQL
  │                 Metadata
  │
  ▼
Embeddings
  │
  ▼
🔵 Qdrant
Vector Storage
```

Each document is divided into smaller chunks.

PostgreSQL maintains the document/chunk metadata and relationships, while Qdrant stores the vector representations used for semantic retrieval.

---

# 🔤 BM25 — Lexical Retrieval

BM25 handles **keyword-based retrieval**.

It is particularly useful when exact terms matter:

```text
"Explain transformer self-attention"
```

A lexical retriever can directly prioritize chunks containing:

```text
transformer
self-attention
attention
```

This makes BM25 useful for:

* Technical terminology
* Exact keywords
* Names
* Identifiers
* Specific phrases

---

# 🔵 Qdrant — Semantic Retrieval

Qdrant handles **vector similarity search**.

```text
Question
   │
   ▼
Embedding
   │
   ▼
Vector
   │
   ▼
🔵 Qdrant
   │
   ▼
Semantically Similar Chunks
```

This allows the system to retrieve relevant content even when the wording in the query differs from the wording in the document.

---

# 🔀 Hybrid Retrieval

The key retrieval strategy is combining both approaches.

```text
                  Question
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
       🔤 BM25                🔵 Qdrant
     Keyword Match        Semantic Match
          │                     │
          └──────────┬──────────┘
                     ▼
              Candidate Set
```

BM25 contributes **lexical precision**, while Qdrant contributes **semantic recall**.

The combined candidates are then passed to the reranking stage.

---

# 🎯 Cross-Encoder Reranking

Retrieval gives us candidates. The reranker determines which candidates are actually the most relevant to the question.

```text
Question + Chunk
       │
       ▼
🎯 Cross-Encoder
       │
       ▼
Relevance Score
       │
       ▼
Sort Candidates
       │
       ▼
⭐ Top 5 Chunks
```

The project uses:

**`Xenova/ms-marco-MiniLM-L-6-v2`**

through Transformers.js.

Unlike independent embedding similarity, the Cross-Encoder evaluates the **question and candidate passage together**, allowing it to make a more focused relevance judgment.

---

# 🧩 LangGraph

LangGraph orchestrates the RAG pipeline as a graph of processing nodes.

```text
START
  │
  ▼
┌──────────────┐
│   Retrieve   │
│ BM25+Qdrant  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    Rerank    │
│ CrossEncoder │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    Answer    │
│    Qwen      │
└──────┬───────┘
       │
       ▼
      END
```

This keeps each stage isolated and makes the workflow easier to extend.

---

# 🤖 Qwen3:8B — Generation Model

The final response is generated using **Qwen3:8B**.

The model is **run locally** rather than being directly consumed as a conventional hosted LLM API.

The backend communicates with the local model through an **ngrok tunnel**.

```text
             Node.js Backend
                    │
                    │ HTTP
                    ▼
              🌐 ngrok Tunnel
                    │
                    ▼
             🧠 Qwen3:8B
           Local Model Server
                    │
                    ▼
              Generated Answer
```

This separates the **retrieval system** from the **generation infrastructure** while allowing the backend to communicate with the local model through an HTTP endpoint.

### Model Responsibilities

Qwen3:8B receives:

```text
User Question
      +
Top Ranked Context
```

and produces:

```text
Grounded Final Answer
```

---

# 🐳 Infrastructure

Docker Compose manages the supporting services:

```text
                 🐳 Docker Compose
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
     🐘 PostgreSQL   🔴 Redis      🔵 Qdrant
       Metadata       Cache       Vector Store
```

### 🐘 PostgreSQL

Stores:

* Documents
* Chunks
* Metadata
* Document relationships

### 🔴 Redis

Used as the application's caching layer.

### 🔵 Qdrant

Stores embeddings and performs vector similarity retrieval.

---

# 🧠 Complete System Flow

```text
                         📄 Document
                              │
                              ▼
                        Text Extraction
                              │
                              ▼
                           Chunking
                              │
                     ┌────────┴────────┐
                     ▼                 ▼
               🐘 PostgreSQL       Embeddings
                  Metadata             │
                                      ▼
                                  🔵 Qdrant
                                      │
                                      │
                         👤 User Question
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
              🔤 BM25                  🔵 Qdrant
           Lexical Search            Vector Search
                 │                         │
                 └────────────┬────────────┘
                              ▼
                       Candidate Chunks
                              │
                              ▼
                     🎯 Cross-Encoder
                        Reranking
                              │
                              ▼
                        ⭐ Top Context
                              │
                              ▼
                       🧩 LangGraph
                              │
                              ▼
                         🧠 Qwen3:8B
                              │
                           ngrok
                              │
                              ▼
                         💬 Answer
```

---

# 🛠️ Key Engineering Highlights

### 🔀 Hybrid Retrieval

Combines **BM25 lexical search** with **Qdrant semantic retrieval**.

### 🎯 Reranking

Uses a **Cross-Encoder** after retrieval to improve the relevance of the final context.

### 🧩 Graph-Based RAG

Uses **LangGraph** to orchestrate retrieval, reranking, and answer generation.

### 🧠 Local LLM

Runs **Qwen3:8B locally** and exposes the model endpoint through **ngrok**.

### 🐳 Containerized Services

Uses Docker Compose for **PostgreSQL, Redis, and Qdrant**.

### 📚 Document-Aware Storage

Maintains document/chunk relationships in PostgreSQL while keeping vector representations in Qdrant.

---

# 🚀 Running the Project

## 1. Clone

```bash
git clone https://github.com/Adi4755t/Hybrid-RAG-Reranker.git
cd Hybrid-RAG-Reranker
```

## 2. Install dependencies

```bash
npm install
```

## 3. Start infrastructure

```bash
docker compose up -d
```

## 4. Configure environment variables

Create `.env` using `.env.example` and configure the required services.

```env
DATABASE_URL=
QDRANT_URL=
QDRANT_API_KEY=
QWEN_URL=
```

## 5. Generate Prisma Client

```bash
npx prisma generate
```

## 6. Start the backend

```bash
npm run dev
```

---

# 📁 Project Structure

```text
Hybrid-RAG-Reranker/
│
├── graph/
│   ├── nodes/
│   │   ├── answer.js
│   │   └── retrieve.js
│   ├── graph.js
│   └── state.js
│
├── prisma/
│   └── schema.prisma
│
├── routes/
│   ├── chat.js
│   └── upload.js
│
├── src/
│
├── utils/
│   ├── bm25.js
│   ├── chunker.js
│   ├── crossEncoder.js
│   ├── embedder.js
│   ├── qdrant.js
│   ├── qwen.js
│   └── rerank.js
│
├── docker-compose.yml
├── package.json
├── package-lock.json
└── server.js
```

---

## ⭐ Retrieval → Reranking → Generation

```text
🔤 BM25 + 🔵 Qdrant
          │
          ▼
   Candidate Retrieval
          │
          ▼
   🎯 Cross-Encoder
      Reranking
          │
          ▼
    ⭐ Best Context
          │
          ▼
      🧠 Qwen3:8B
          │
          ▼
       💬 Answer
```


