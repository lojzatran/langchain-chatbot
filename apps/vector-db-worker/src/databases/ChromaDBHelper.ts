import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OllamaEmbeddings } from '@langchain/ollama';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { ChromaClient } from 'chromadb';

import { env, CHATBOT_CONSTANTS } from '@common';
import { VectorDatabaseImpl } from './VectorDatabase';
import { Document } from '@langchain/core/documents';
import { Embeddings } from '@langchain/core/embeddings';

export default class ChromaDB extends VectorDatabaseImpl<ChromaClient> {
  getEmbeddingsClient(): Embeddings {
    return new OllamaEmbeddings({
      model: CHATBOT_CONSTANTS.MODELS.LOCAL.EMBEDDING,
      baseUrl: env.OLLAMA_BASE_URL,
    });
  }

  getDbClient(): ChromaClient {
    const chromaHost = env.CHROMA_HOST;

    const chromaClient = new ChromaClient({
      host: chromaHost,
      port: env.CHROMA_PORT,
      ssl: env.CHROMA_SSL,
    });

    return chromaClient;
  }

  async clearDatabase(dbClient: ChromaClient): Promise<void> {
    await dbClient.deleteCollection({ name: 'faq-collection' });
  }

  async convertAndSaveEmbeddings(
    dbClient: ChromaClient,
    embeddingsClient: Embeddings,
    chunks: Document<Record<string, any>>[],
  ): Promise<void> {
    await Chroma.fromDocuments(chunks, embeddingsClient, {
      collectionName: CHATBOT_CONSTANTS.MODELS.LOCAL.COLLECTION,
      index: dbClient,
    });
  }
}
