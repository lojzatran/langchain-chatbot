import { ChatbotConfig } from '../types/chat';
import { GoogleGenAIEmbeddings } from './GoogleGeminiAiEmbeddings';
import { env } from '@common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Embeddings } from '@langchain/core/embeddings';
import { OllamaEmbeddings } from '@langchain/ollama';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { createClient } from '@supabase/supabase-js';
import { BaseRetriever } from '@langchain/core/retrievers';
import { ChatOllama } from '@langchain/ollama';
import { getClientOrDefault } from './chatbot-client-manager';
import { WebSocket } from 'ws';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { ChromaClient } from 'chromadb';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

export const chatbotConfigMap: Record<
  ChatbotConfig,
  {
    getLlm: () => BaseChatModel;
    getEmbeddings: () => Embeddings;
    getRetriever: (embeddings: Embeddings) => BaseRetriever;
  }
> = {
  'supabase-gemini': {
    getLlm: () =>
      new ChatGoogleGenerativeAI({
        apiKey: env.GOOGLE_API_KEY,
        model: 'gemini-2.5-flash-lite',
        temperature: 0.5,
      }),
    getEmbeddings: () =>
      new GoogleGenAIEmbeddings({
        apiKey: env.GOOGLE_API_KEY,
        model: 'gemini-embedding-001',
      }),
    getRetriever: (embeddings: Embeddings) => {
      const supabaseClient = createClient(
        env.SUPABASE_URL,
        env.SUPABASE_API_KEY,
      );

      const vectorStore = new SupabaseVectorStore(embeddings, {
        client: supabaseClient,
        tableName: 'documents',
        queryName: 'match_documents',
      });

      return vectorStore.asRetriever();
    },
  },
  'upstash-gemma3-nomic': {
    getLlm: () =>
      new ChatOllama({
        model: 'gemma3:1b',
        temperature: 0.1,
        baseUrl: env.OLLAMA_BASE_URL,
      }),
    getEmbeddings: () =>
      new OllamaEmbeddings({
        model: 'nomic-embed-text:latest',
        baseUrl: env.OLLAMA_BASE_URL,
      }),
    getRetriever: (embeddings: Embeddings) => {
      const chromaHost = env.CHROMA_HOST;
      const chromaClient = new ChromaClient({
        host: chromaHost,
        port: env.CHROMA_PORT,
        ssl: env.CHROMA_SSL,
      });

      return new Chroma(embeddings, {
        collectionName: 'faq-collection',
        index: chromaClient,
      }).asRetriever();
    },
  },
};

const getEmbeddings = (ws: WebSocket) => {
  const client = getClientOrDefault(ws);
  return chatbotConfigMap[client.config].getEmbeddings();
};

export const getLlm = (ws: WebSocket) => {
  const client = getClientOrDefault(ws);
  return chatbotConfigMap[client.config].getLlm();
};

export const getRetriever = (ws: WebSocket) => {
  const client = getClientOrDefault(ws);
  return chatbotConfigMap[client.config].getRetriever(getEmbeddings(ws));
};
