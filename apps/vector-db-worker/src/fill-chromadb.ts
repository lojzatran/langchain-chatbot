import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OllamaEmbeddings } from '@langchain/ollama';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { ChromaClient } from 'chromadb';

import { env } from '@common';

export const fillChromaStore = async (data: string): Promise<void> => {
  console.log('Start filling ChromaDB...');
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: env.SPLITTER_CHUNK_SIZE,
    chunkOverlap: env.SPLITTER_CHUNK_OVERLAP,
  });

  const chunks = await splitter.createDocuments([data]);

  const embeddings = new OllamaEmbeddings({
    model: 'nomic-embed-text:latest',
    baseUrl: env.OLLAMA_BASE_URL,
  });

  const chromaHost = env.CHROMA_HOST;

  const chromaClient = new ChromaClient({
    host: chromaHost,
    port: env.CHROMA_PORT,
    ssl: env.CHROMA_SSL,
  });

  // Delete existing collection if it exists to start fresh
  try {
    await chromaClient.deleteCollection({ name: 'faq-collection' });
    console.log('Existing collection deleted.');
  } catch (e) {
    // Collection might not exist, ignore
  }

  const vectorStore = await Chroma.fromDocuments(chunks, embeddings, {
    collectionName: 'faq-collection',
    index: chromaClient,
  });

  console.log('ChromaDB filled successfully!');
};
