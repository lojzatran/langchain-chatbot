# Multi-Chain LangChain Chatbot

A Next.js-powered chatbot that allows users to switch between different AI stacks (LLMs, Embeddings, and Vector Stores). It provides a flexible architecture to compare performance and capabilities across different cloud and local services. A test app is running on Railway, please contact me to get the URL + credentials.

## Available Configurations

Upon starting the chat, users can choose between two primary AI chains:

1.  **Supabase + Gemini + OpenAI**:
    - **LLM**: OpenAI `gpt-4o-mini`
    - **Embeddings**: Google Gemini `gemini-embedding-001`
    - **Vector Store**: Supabase (PostgreSQL with `pgvector`)
2.  **Upstash + Gemini + Ollama**:
    - **LLM**: Google Gemini `gemini-2.5-flash-lite`
    - **Embeddings**: Ollama `nomic-embed-text` (Local)
    - **Vector Store**: Upstash Vector (Serverless)

---

## Prerequisites

Ensure you have the following credentials and services ready:

- **Node.js**: v18 or higher.
- **OpenAI API Key**: Required for the first configuration.
- **Google AI Studio API Key**: Required for both configurations (Gemini LLM and Embeddings).
- **Supabase Project**: With the `documents` table and `match_documents` function (see [Supabase Setup](#supabase-setup)).
- **Upstash Vector Index**: For the second configuration.
- **Ollama nomic-embed-text model**: Installed and running locally (required for local embeddings).

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
# Shared
GOOGLE_API_KEY=your_google_api_key
OPENAI_API_KEY=your_openai_api_key

# Supabase (Configuration 1)
SUPABASE_URL=your_supabase_project_url
SUPABASE_API_KEY=your_supabase_anon_key

# Upstash (Configuration 2)
UPSTASH_VECTOR_REST_URL=your_upstash_rest_url
UPSTASH_VECTOR_REST_TOKEN=your_upstash_token

# Optional settings
SPLITTER_CHUNK_SIZE=1100
SPLITTER_CHUNK_OVERLAP=50
```

### 4. Supabase Vector Setup

If using the Supabase configuration, run the following SQL in your Supabase SQL Editor to enable vector search ((https://docs.langchain.com/oss/python/integrations/vectorstores/supabase)):

```sql
-- Enable the pgvector extension
create extension if not exists vector;

-- Create a table for documents
create table documents (
  id uuid primary key,
  content text,
  metadata jsonb,
  embedding vector (1536) -- 1536 is standard for many models, or 768 for Gemini
);

-- Create the search function
create function match_documents (
  query_embedding vector (1536),
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

### 1. Prepare FAQ Data

Place your FAQ data in `assets/faq.txt`.

### 2. Fill Vector Stores

You need to index your data based on which configuration you plan to use.

**For Supabase + Gemini:**

```bash
npm run fill-vector-store
```

**For Upstash + Ollama:**

```bash
npm run fill-vector-store-ollama
```

### 3. Run the Application

Open [http://localhost:8080](http://localhost:8080).

## Usage

Once the server is running, you can use the chat interface to ask questions about the company. The assistant will:

1. Convert your query into a standalone question.
2. Search the Supabase vector store for relevant context from the FAQ.
3. Generate a helpful response using OpenAI's GPT-4o-mini, incorporating the retrieved context.

If the answer isn't found in the provided context, the assistant will politely inform you and suggest contacting the support team.

## Docker Deployment

You can run the entire application using Docker.

### 1. Using Docker Compose (Recommended)

The easiest way to run the app is with Docker Compose, which handles the build process and environment variables automatically.

```bash
docker-compose up --build
```

The application will be available at `http://localhost:8080` (or the port specified in the Dockerfile).

### 2. Using Docker Directly

**Build the image:**

```bash
docker build -t langchain-chatbot .
```

**Run the container:**

```bash
docker run -p 8080:8080 --env-file .env langchain-chatbot
```

---

## Technologies Used

- **Framework**: Next.js 16 (App Router)
- **Orchestration**: LangChain.js
- **LLMs**: OpenAI GPT-4o-mini, Google Gemini 2.5 Flash Lite
- **Embeddings**: Google Gemini, Ollama (Local)
- **Vector Databases**: Supabase, Upstash Vector
- **Real-time**: WebSockets for streaming responses
- **Validation**: Zod
- **Styling**: Tailwind CSS with custom premium UI components
