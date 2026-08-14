# 🔎 Hybrid-RAG-Reranker

### 🛠️ Tech Stack

<p align="center">

<img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white"/>
<img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white"/>
<img src="https://img.shields.io/badge/LangGraph-1C3C3C?style=for-the-badge"/>
<img src="https://img.shields.io/badge/BM25-Lexical_Retrieval-8A2BE2?style=for-the-badge"/>
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

**Hybrid-RAG-Reranker** is a Retrieval-Augmented Generation system designed to improve the quality of context retrieved from documents before generating an answer.

Instead of relying on a single retrieval strategy, the system combines:

**🔤 BM25 lexical retrieval + 🔵 Qdrant semantic retrieval**

The retrieved candidates are then passed through a **🎯 Cross-Encoder reranker** to identify the most relevant chunks before the final context is sent to **🧠 Qwen3:8B**.

A key part of the architecture is the use of **PostgreSQL as a metadata filtering layer before Qdrant retrieval**.

All document embeddings are stored in Qdrant during ingestion. At query time, PostgreSQL first narrows the search scope using the relevant document metadata and returns matching chunk IDs. Those IDs are then used to constrain the Qdrant search instead of performing an unrestricted vector search across the entire collection.

### Core idea

```text
Better Search Scope
        ↓
Hybrid Retrieval
        ↓
Cross-Encoder Reranking
        ↓
Better Context
        ↓
Qwen3:8B
        ↓
Better Answer
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
                ┌──────────────────────┐
                │ Query + Metadata     │
                │      Filters         │
                └──────────┬───────────┘
                           │
                           ▼
                    🐘 PostgreSQL
                  Metadata Filtering
                           │
                    Matching Chunk IDs
                           │
                           ▼
                    🔵 Qdrant Search
                  Filtered Vector Search
                           │
                           ▼
                   Semantic Candidates
                           │
                           ▼
                     🔤 BM25
                  Lexical Retrieval
                           │
                           ▼
                   Candidate Results
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
                    Local Inference
                           │
                         ngrok
                           │
                           ▼
                       💬 Answer
```

---

# 📄 1. Document Ingestion

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
  ├──────────────────────┐
  ▼                      ▼
🐘 PostgreSQL          Embedding
Document + Chunk          │
Metadata                  ▼
                       🔵 Qdrant
                       Vector Store
```

During ingestion:

1. The PDF text is extracted.
2. The document is split into smaller chunks.
3. Document and chunk information is stored in PostgreSQL.
4. Each chunk is converted into an embedding.
5. The embeddings are stored in Qdrant.

**All chunks are indexed in Qdrant.**

The optimization happens later during retrieval.

---

# ⚡ 2. Metadata-Filtered Qdrant Search

This is one of the key architectural decisions in the project.

A naive RAG system could perform vector search against the **entire Qdrant collection** for every query.

This project first uses PostgreSQL to narrow the search scope.

```text
                    👤 User Query
                         │
                         ▼
                  Query Metadata
                    / Filters
                         │
                         ▼
                  🐘 PostgreSQL
                         │
                 Filter matching
                documents/chunks
                         │
                         ▼
                 Matching Chunk IDs
                         │
                         ▼
                  🔵 Qdrant Search
                         │
                 Search only within
                 relevant candidates
                         │
                         ▼
                  Vector Results
```

### Why this matters

Qdrant contains embeddings for **all indexed chunks**, but the query does not blindly search the entire collection.

PostgreSQL first determines which documents/chunks are relevant based on the available metadata.

Those matching chunk IDs are then used to constrain the vector search.

This reduces the searchable candidate space and avoids unnecessary vector comparisons across unrelated content.

> **PostgreSQL determines the search scope. Qdrant performs the semantic search within that scope.**

---

# 🔤 3. BM25 — Lexical Retrieval

**BM25** provides keyword-based retrieval.

It is particularly useful when exact terminology matters.

For example:

```text
"Explain transformer self-attention"
```

BM25 can strongly match chunks containing:

```text
transformer
self-attention
attention
```

This makes lexical retrieval useful for:

* Technical terminology
* Exact keywords
* Names
* Identifiers
* Specific phrases

BM25 complements semantic retrieval by preserving the importance of exact terms.

---

# 🔵 4. Qdrant — Semantic Retrieval

Qdrant stores the embeddings generated during document ingestion and performs vector similarity search.

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

Because the search is constrained by the relevant chunk/document IDs obtained from PostgreSQL, Qdrant operates on a **focused candidate set rather than the entire corpus**.

---

# 🔀 5. Hybrid Retrieval

The system combines lexical and semantic retrieval.

```text
                         Question
                            │
                 ┌──────────┴──────────┐
                 ▼                     ▼
              🔤 BM25               🔵 Qdrant
          Lexical Retrieval     Semantic Retrieval
                 │                     │
                 └──────────┬──────────┘
                            ▼
                     Candidate Chunks
```

### BM25 provides

**Exact lexical matching**

### Qdrant provides

**Semantic similarity**

Together they provide a more robust retrieval stage than relying exclusively on either keyword search or vector search.

---

# 🎯 6. Cross-Encoder Reranking

Retrieval gives us a set of candidate chunks.

The Cross-Encoder then determines which candidates are actually the most relevant to the user's question.

```text
Question + Candidate Chunk
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
        ⭐ Top 5
```

The project uses:

**`Xenova/ms-marco-MiniLM-L-6-v2`**

through Transformers.js.

Unlike comparing embeddings independently, the Cross-Encoder evaluates the **question and candidate passage together**, allowing it to make a more focused relevance judgment.

---

# 🧩 7. LangGraph Workflow

LangGraph orchestrates the RAG pipeline as a sequence of processing nodes.

```text
START
  │
  ▼
┌────────────────┐
│    Retrieve    │
│ BM25 + Qdrant  │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│     Rerank     │
│ Cross-Encoder  │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│     Answer     │
│     Qwen3      │
└───────┬────────┘
        │
        ▼
       END
```

This keeps the retrieval, reranking, and generation stages separated into dedicated nodes.

---

# 🤖 8. Qwen3:8B — Generation Model

The final answer is generated using **Qwen3:8B**.

The model runs **locally** and is exposed to the backend through an **ngrok tunnel**.

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

The model receives:

```text
👤 User Question
       +
⭐ Top-Ranked Context
```

and generates:

```text
💬 Final Answer
```

### Why this architecture?

* 🏠 Local model inference
* 🌐 HTTP-based model access
* 🔌 Backend remains independent from the model runtime
* 🔐 The local inference server can be exposed through a controlled ngrok tunnel
* 🧩 Generation remains a separate stage from retrieval

---

# 🐳 9. Infrastructure

The supporting services are containerized using Docker Compose.

```text
                  🐳 Docker Compose
                         │
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
      🐘 PostgreSQL   🔴 Redis      🔵 Qdrant
       Metadata        Cache       Vector Store
```

### 🐘 PostgreSQL

Responsible for:

* Document metadata
* Chunk records
* Document/chunk relationships
* Metadata-based retrieval filtering

### 🔴 Redis

Used as the application's caching layer.

### 🔵 Qdrant

Responsible for:

* Embedding storage
* Vector similarity search
* Retrieval from the filtered candidate space

---

# 🔄 Complete RAG Flow

```text
                         📄 PDF
                           │
                           ▼
                     Text Extraction
                           │
                           ▼
                        Chunking
                           │
                ┌──────────┴──────────┐
                ▼                     ▼
          🐘 PostgreSQL           Embeddings
         Documents/Chunks            │
         + Metadata                  ▼
                                  🔵 Qdrant
                                  All Vectors
                                      │
                                      │
                           👤 User Query
                                │
                                ▼
                         Metadata Filters
                                │
                                ▼
                         🐘 PostgreSQL
                                │
                         Matching Chunk IDs
                                │
                                ▼
                         🔵 Qdrant Search
                                │
                                ▼
                       Semantic Candidates
                                │
                                ├──────────────┐
                                │              │
                                ▼              ▼
                             🔤 BM25       Qdrant
                          Lexical Signal  Vector Signal
                                │              │
                                └──────┬───────┘
                                       ▼
                                Candidate Results
                                       │
                                       ▼
                              🎯 Cross-Encoder
                                 Reranking
                                       │
                                       ▼
                                  ⭐ Top 5
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

### ⚡ Metadata-Filtered Vector Search

All embeddings are stored in Qdrant, but PostgreSQL first narrows the searchable scope using document metadata and matching chunk IDs.

### 🔀 Hybrid Retrieval

Combines **BM25 lexical retrieval** with **Qdrant semantic retrieval** to capture both exact terms and semantic meaning.

### 🎯 Cross-Encoder Reranking

Uses a dedicated reranking stage after retrieval to select the most relevant context before generation.

### 🧩 Graph-Based RAG

Uses **LangGraph** to explicitly orchestrate retrieval → reranking → generation.

### 🧠 Local LLM Inference

Uses **Qwen3:8B** as the generation model, running locally and exposed through **ngrok**.

### 🐳 Containerized Infrastructure

Uses Docker Compose to run PostgreSQL, Redis, and Qdrant as reproducible infrastructure services.

---

# 🛠️ Tech Stack Overview

| Technology            | Role                                  |
| --------------------- | ------------------------------------- |
| 🟢 **Node.js**        | Backend runtime                       |
| 🚂 **Express.js**     | REST API                              |
| 🧩 **LangGraph**      | RAG workflow orchestration            |
| 🔤 **BM25**           | Lexical retrieval                     |
| 🔵 **Qdrant**         | Vector database & semantic retrieval  |
| 🎯 **Cross-Encoder**  | Reranking                             |
| 🧠 **Qwen3:8B**       | Answer generation                     |
| 🌐 **ngrok**          | Local model tunnel                    |
| 🐘 **PostgreSQL**     | Document storage & metadata filtering |
| 🔴 **Redis**          | Caching                               |
| 🐳 **Docker Compose** | Infrastructure                        |
| 📄 **PDF Parser**     | Document ingestion                    |

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

This starts:

```text
PostgreSQL
Redis
Qdrant
```

## 4. Configure environment variables

Create a `.env` file using `.env.example`.

Configure the required services, including:

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

# ⭐ Core Pipeline

```text
🐘 PostgreSQL
 Metadata Filtering
        │
        ▼
🔵 Qdrant
 Filtered Vector Search
        │
        ▼
🔤 BM25
 Lexical Retrieval
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
 Orchestration
        │
        ▼
🧠 Qwen3:8B
 Local Generation
        │
      ngrok
        │
        ▼
💬 Final Answer
```

> **Hybrid-RAG-Reranker is built around one principle: improve the quality of the context before asking the model to generate the answer.**
