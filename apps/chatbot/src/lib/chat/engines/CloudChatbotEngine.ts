import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseRetriever } from '@langchain/core/retrievers';
import ChatbotEngine from './ChatbotEngine';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { env } from '@common';
import { createClient } from '@supabase/supabase-js';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

import { CHATBOT_CONSTANTS } from '../../constants';

export default class CloudChatbotEngine extends ChatbotEngine {
  private CHAT_MODEL = CHATBOT_CONSTANTS.MODELS.CLOUD.CHAT;
  private EMBEDDING_MODEL = CHATBOT_CONSTANTS.MODELS.CLOUD.EMBEDDING;
  private TABLE_NAME = CHATBOT_CONSTANTS.MODELS.CLOUD.TABLE;
  private QUERY_NAME = CHATBOT_CONSTANTS.MODELS.CLOUD.QUERY_NAME;

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
      queryName: this.QUERY_NAME,
    });

    return vectorStore.asRetriever();
  }
}
