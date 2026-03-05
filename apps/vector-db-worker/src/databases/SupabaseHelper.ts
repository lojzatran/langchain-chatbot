import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAIEmbeddings } from './GoogleGeminiAiEmbeddings';

import { env, CHATBOT_CONSTANTS } from '@common';
import { VectorDatabase } from '../types/VectorDatabase';

export default class Supabase implements VectorDatabase {
  async fill(data: string): Promise<void> {
    console.log('Start filling Supabase...');

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: env.SPLITTER_CHUNK_SIZE,
      chunkOverlap: env.SPLITTER_CHUNK_OVERLAP,
    });

    const chunks = await splitter.createDocuments([data]);

    const supbaseUrl = env.SUPABASE_URL;
    const supbaseKey = env.SUPABASE_API_KEY;
    const googleGeminiAiKey = env.GOOGLE_API_KEY;

    const supbaseClient = createClient(supbaseUrl, supbaseKey);

    // Clear the table before inserting new embeddings
    const tableName = CHATBOT_CONSTANTS.MODELS.CLOUD.TABLE;
    const { error } = await supbaseClient
      .from(tableName)
      .delete()
      .not('id', 'is', null); // matches all rows; unfiltered deletes are not allowed by the Supabase client

    if (error) {
      throw new Error(`Failed to clear table "${tableName}": ${error.message}`);
    }

    console.log(`Table "${tableName}" cleared successfully.`);

    await SupabaseVectorStore.fromDocuments(
      chunks,
      new GoogleGenAIEmbeddings({
        apiKey: googleGeminiAiKey,
        model: CHATBOT_CONSTANTS.MODELS.CLOUD.EMBEDDING,
      }),
      {
        client: supbaseClient,
        tableName: CHATBOT_CONSTANTS.MODELS.CLOUD.TABLE,
      },
    );

    console.log('Vector store filled successfully!');
  }
}
