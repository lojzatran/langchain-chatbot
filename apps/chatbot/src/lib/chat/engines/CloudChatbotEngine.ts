import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseRetriever } from '@langchain/core/retrievers';
import ChatbotEngine from './ChatbotEngine';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { env } from '@common';
import { createClient } from '@supabase/supabase-js';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

export default class CloudChatbotEngine extends ChatbotEngine {
  private CHAT_MODEL = 'gemini-2.5-flash-lite';
  private EMBEDDING_MODEL = 'gemini-embedding-001';
  private TABLE_NAME = 'documents';

  protected createLlm(): BaseChatModel {
    return new ChatGoogleGenerativeAI({
      apiKey: env.GOOGLE_API_KEY,
      model: this.CHAT_MODEL,
      temperature: 0.5,
    });
  }

  protected createRetriever(): BaseRetriever {
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: env.GOOGLE_API_KEY,
      model: this.EMBEDDING_MODEL,
    });

    const supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_API_KEY);

    const vectorStore = new SupabaseVectorStore(embeddings, {
      client: supabaseClient,
      tableName: this.TABLE_NAME,
      queryName: 'match_documents',
    });

    return vectorStore.asRetriever();
  }
}
