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
  });

  const chromaHost =
    env.CHROMA_HOST === 'localhost' ? '127.0.0.1' : env.CHROMA_HOST;
  const chromaClient = new ChromaClient({
    host: chromaHost,
    port: env.CHROMA_PORT,
    ssl: env.CHROMA_SSL,
  });

  const collections = await chromaClient.getCollections([
    {
      name: 'faq-collection',
    },
  ]);

  if (collections.length > 0) {
    await chromaClient.deleteCollection({
      name: 'faq-collection',
    });
  }

  const vectorStore = new Chroma(embeddings, {
    collectionName: 'faq-collection',
    index: chromaClient,
  });

  await vectorStore.addDocuments(chunks);

  console.log('ChromaDB filled successfully!');
};
