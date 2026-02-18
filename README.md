# Multi-Chain LangChain Chatbot

A Next.js-powered chatbot that allows users to switch between different AI stacks (LLMs, Embeddings, and Vector Stores). It provides a flexible architecture to compare performance and capabilities across different cloud and local services.

## Available Configurations

Upon starting the chat, users can choose between two primary AI chains:

1.  **Supabase + Google Gemini (`supabase-gemini`)**:
    - **LLM**: Google Gemini `gemini-2.5-flash-lite`
    - **Embeddings**: Google Gemini `gemini-embedding-001`
    - **Vector Store**: Supabase (PostgreSQL with `pgvector`)
2.  **Chroma + Ollama (`upstash-gemma3-nomic`)**:
    - **LLM**: Ollama `gemma3:1b` (Local)
    - **Embeddings**: Ollama `nomic-embed-text` (Local)
    - **Vector Store**: ChromaDB (Local)

---

## Prerequisites

Ensure you have the following credentials and services ready:

- **Docker & Docker Compose**: Required for running independent services (ChromaDB, RabbitMQ, Ollama).
- **Node.js**: v22 or higher recommended.
- **Google AI Studio API Key**: Required for the Gemini configuration.
- **Supabase Project**: Required for the Supabase configuration (with `pgvector` enabled).
- **Ollama**: Installed and running locally for local models.

---

## Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd langchain-chatbot-test
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Required settings
GOOGLE_API_KEY=your_google_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_API_KEY=your_supabase_anon_key
CHROMA_HOST=localhost
CHROMA_PORT=8000
RABBITMQ_URL=amqp://localhost

# Optional settings
SPLITTER_CHUNK_SIZE=1100
SPLITTER_CHUNK_OVERLAP=50
```

### 4. Supabase Vector Setup

If using the Supabase configuration, run the following SQL in your Supabase SQL Editor to enable vector search:

```sql
-- Enable the pgvector extension
create extension if not exists vector;

-- Create a table for documents
create table documents (
  id uuid primary key,
  content text,
  metadata jsonb,
  embedding vector (768) -- 768 for Gemini embedding-001
);

-- Create the search function
create function match_documents (
  query_embedding vector (768),
  filter jsonb default '{}'
) returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
) language plpgsql as $$
#variable_conflict use_column
begin
  return query
  select
    id,
    content,
    metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where metadata @> filter
  order by documents.embedding <=> query_embedding;
end;
$$;
```

---

## Getting Started

### 1. Start Infrastructure

Use Docker Compose to launch only the supporting infrastructure (database and message broker):

```bash
docker-compose up -d rabbitmq chromadb ollama
```

### 2. Run the application locally

To run the chatbot and the background worker simultaneously:

```bash
npm run dev:all
```

Alternatively, run individually:

- Chatbot: `nx dev chatbot`
- Worker: `nx serve vector-db-worker`

The application will be available at [http://localhost:8080](http://localhost:8080).

---

## Knowledge Management

Instead of manual scripts, you can now manage knowledge base directly through the UI:

1.  Click **Upload Knowledge** in the chat interface header.
2.  Select and upload a `.txt` file.
3.  The **Chatbot** app saves the file to `uploads/` and notifies the **Vector DB Worker** via RabbitMQ.
4.  The worker processes the file, splits it into chunks, and indexes it into **ChromaDB**.

---

## Usage

Once the services are active, you can:

1. Select your preferred **AI Configuration**.
2. Chat with the assistant.
3. The system will retrieve context from the selected vector store (Supabase or Chroma) and generate responses using the selected LLM (Gemini or Ollama).

---

## Docker Deployment

Use Docker Compose to run the full production stack:

```bash
docker-compose up --build
```

---

## Technologies Used

- **Framework**: Next.js 16 (App Router)
- **Monorepo Management**: Nx
- **Orchestration**: LangChain.js
- **Background Processing**: RabbitMQ + Node.js Worker
- **Vector Databases**: ChromaDB (Local), Supabase (PostgreSQL with `pgvector`)
- **LLMs**: Google Gemini 2.5 Flash Lite, Ollama (Local)
- **Embeddings**: Google Gemini, Ollama (Nomic)
- **Real-time**: WebSockets for streaming responses
- **Validation**: Zod
- **Infrastructure**: Docker, Nginx (Load Balancing)
- **Styling**: Tailwind CSS 4

---

## FAQ

### Why are dependencies installed in Docker instead of being bundled by esbuild?

While `esbuild` can bundle dependencies into a single file, we keep them external (via `npm install --omit=dev` in the Dockerfile) for several reasons:

1.  **Native Modules**: Libraries with C++ bindings (like certain database drivers) cannot be bundled and must exist in `node_modules`.
2.  **Reliability**: Bundlers can sometimes skip files loaded via dynamic `require()` calls, leading to runtime errors. For example, in this project, **`amqplib`** is marked as an external dependency in the `project.json` and must be installed via `npm install` in the final Docker stage to be found by Node.js.
3.  **Docker Caching**: Installing dependencies in a separate Docker layer allows for much faster builds when only the source code changes.
4.  **Best Practices**: This is the industry standard for production Node.js applications, ensuring better compatibility and easier debugging.
