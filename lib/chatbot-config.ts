import { ChatbotConfig } from "@/types/chat";
import { ChatOpenAI } from "@langchain/openai";
import { GoogleGenAIEmbeddings } from "./GoogleGeminiAiEmbeddings";
import { env } from "@/utils/env";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { Embeddings } from "@langchain/core/embeddings";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { OllamaEmbeddings } from "@langchain/ollama";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { createClient } from "@supabase/supabase-js";
import { BaseRetriever } from "@langchain/core/retrievers";
import { UpstashVectorStore } from "@langchain/community/vectorstores/upstash";
import { Index } from "@upstash/vector";

export const chatbotConfigMap: Record<
  ChatbotConfig,
  {
    getLlm: () => BaseChatModel;
    getEmbeddings: () => Embeddings;
    getRetriever: (embeddings: Embeddings) => BaseRetriever;
  }
> = {
  "supabase-gemini-openai": {
    getLlm: () =>
      new ChatOpenAI({
        apiKey: env.OPENAI_API_KEY,
        model: "gpt-4o-mini",
        temperature: 0.5,
      }),
    getEmbeddings: () =>
      new GoogleGenAIEmbeddings({
        apiKey: env.GOOGLE_API_KEY,
        model: "gemini-embedding-001",
      }),
    getRetriever: (embeddings: Embeddings) => {
      const supabaseClient = createClient(
        env.SUPABASE_URL,
        env.SUPABASE_API_KEY,
      );

      const vectorStore = new SupabaseVectorStore(embeddings, {
        client: supabaseClient,
        tableName: "documents",
        queryName: "match_documents",
      });

      return vectorStore.asRetriever();
    },
  },
  "upstash-gemini-ollama": {
    getLlm: () =>
      new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash-lite",
        temperature: 0.5,
        maxRetries: 2,
      }),
    getEmbeddings: () =>
      new OllamaEmbeddings({
        model: "nomic-embed-text:latest",
      }),
    getRetriever: (embeddings: Embeddings) => {
      const indexWithCredentials = new Index({
        url: env.UPSTASH_VECTOR_REST_URL,
        token: env.UPSTASH_VECTOR_REST_TOKEN,
      });

      const vectorStore = new UpstashVectorStore(embeddings, {
        index: indexWithCredentials,
      });

      return vectorStore.asRetriever();
    },
  },
};

let selectedConfig: ChatbotConfig = "supabase-gemini-openai";

export const setSelectedConfig = (config: ChatbotConfig) => {
  selectedConfig = config;
};

const getEmbeddings = () => {
  return chatbotConfigMap[selectedConfig].getEmbeddings();
};

export const getLlm = () => {
  return chatbotConfigMap[selectedConfig].getLlm();
};

export const getRetriever = () => {
  return chatbotConfigMap[selectedConfig].getRetriever(getEmbeddings());
};
