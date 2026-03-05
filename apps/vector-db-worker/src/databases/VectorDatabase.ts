import { Embeddings } from '@langchain/core/embeddings';
import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { env } from '@common';

interface VectorDatabase {
  fill(data: string): Promise<void>;
}

export abstract class VectorDatabaseImpl<T> implements VectorDatabase {
  async createChunks(data: string): Promise<Document<Record<string, any>>[]> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: env.SPLITTER_CHUNK_SIZE,
      chunkOverlap: env.SPLITTER_CHUNK_OVERLAP,
    });

    const chunks = await splitter.createDocuments([data]);
    return chunks;
  }

  async fill(data: string): Promise<void> {
    console.log('Start filling vector database...');
    const chunks = await this.createChunks(data);

    const embeddingsClient = this.getEmbeddingsClient();

    const dbClient = this.getDbClient();

    // Delete existing collection/table if it exists to start fresh
    try {
      await this.clearDatabase(dbClient);
      console.log('Existing collection/table deleted.');
    } catch (e) {
      console.warn('Error while clearing database, continuing...', e);
    }

    await this.convertAndSaveEmbeddings(dbClient, embeddingsClient, chunks);

    console.log('Vector database filled successfully!');
  }

  abstract getEmbeddingsClient(): Embeddings;

  abstract getDbClient(): T;

  abstract clearDatabase(dbClient: T): Promise<void>;

  abstract convertAndSaveEmbeddings(
    dbClient: T,
    embeddingsClient: Embeddings,
    chunks: Document<Record<string, any>>[],
  ): Promise<void>;
}
