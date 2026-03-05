import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenAIEmbeddings } from './GoogleGeminiAiEmbeddings';

import { env, CHATBOT_CONSTANTS } from '@common';
import { VectorDatabaseImpl } from './VectorDatabase';
import { Embeddings } from '@langchain/core/embeddings';
import { Document } from '@langchain/core/documents';

export default class Supabase extends VectorDatabaseImpl<SupabaseClient> {
  getEmbeddingsClient(): Embeddings {
    return new GoogleGenAIEmbeddings({
      apiKey: env.GOOGLE_API_KEY,
      model: CHATBOT_CONSTANTS.MODELS.CLOUD.EMBEDDING,
    });
  }

  getDbClient(): SupabaseClient {
    return createClient(env.SUPABASE_URL, env.SUPABASE_API_KEY);
  }

  async clearDatabase(dbClient: SupabaseClient): Promise<void> {
    const tableName = CHATBOT_CONSTANTS.MODELS.CLOUD.TABLE;
    const { error } = await dbClient
      .from(tableName)
      .delete()
      .not('id', 'is', null); // matches all rows; unfiltered deletes are not allowed by the Supabase client

    if (error) {
      throw new Error(`Failed to clear table "${tableName}": ${error.message}`);
    }
  }

  async convertAndSaveEmbeddings(
    dbClient: SupabaseClient,
    embeddingsClient: Embeddings,
    chunks: Document<Record<string, any>>[],
  ): Promise<void> {
    await SupabaseVectorStore.fromDocuments(chunks, embeddingsClient, {
      client: dbClient,
      tableName: CHATBOT_CONSTANTS.MODELS.CLOUD.TABLE,
    });
  }
}
