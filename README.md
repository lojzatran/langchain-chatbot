# LangChain Chatbot with Google Gemini Embeddings and Supabase

A Next.js chatbot that uses LangChain to provide answers based on a custom FAQ dataset. It leverages Google Gemini for generating embeddings, Supabase as a vector store, and OpenAI's GPT-4o-mini for generating response. A test app is running on Railway, please contact me to get the URL + credentials.

## Prerequisites

Before you begin, ensure you have the following:

- **Node.js** (v18 or higher)
- **Supabase Account**: A project with a `documents` table and a `match_documents` function (see [Supabase Setup](#supabase-setup)).
- **Google AI Studio API Key**: For Gemini embeddings.
- **OpenAI API Key**: For the chat model.

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

Create a `.env` file in the root directory and add the following variables:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_API_KEY=your_supabase_anon_key
GOOGLE_GEMINI_API_KEY=your_google_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# Optional settings for text splitting
SPLITTER_CHUNK_SIZE=1100 # It's recommended to have in one chunk - one question and answer
SPLITTER_CHUNK_OVERLAP=50
```

### 4. Supabase Setup

You need to set up your Supabase database to support vector search (https://docs.langchain.com/oss/python/integrations/vectorstores/supabase). Run the following SQL in your Supabase SQL Editor:

```sql
-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a table to store your documents
create table
  documents (
    id uuid primary key,
    content text, -- corresponds to Document.pageContent
    metadata jsonb, -- corresponds to Document.metadata
    embedding vector (1536) -- 1536 works for OpenAI embeddings, change if needed
  );

-- Create a function to search for documents
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

## Getting Started

### 1. Fill the Vector Store

Before chatting, you need to process the FAQ data and store it as embeddings in Supabase. This project uses `assets/faq.txt` as the source.

```bash
npm run fill-vector-store
```

This command will:

- Read the content of `assets/faq.txt`.
- Split the text into manageable chunks.
- Generate embeddings for each chunk using Google Gemini.
- Store the chunks and embeddings in your Supabase `documents` table.

### 2. Run the Development Server

Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

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

## Technologies Used

- **Next.js**: Framework for the web application.
- **LangChain**: Orchestration of AI workflows.
- **Supabase**: Vector database.
- **Google Gemini**: Embedding model (`gemini-embedding-001`).
- **OpenAI**: Chat model (`gpt-4o-mini`).
- **Zod**: Environment variable validation.
