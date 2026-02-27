import ChatbotEngine from './ChatbotEngine';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseRetriever } from '@langchain/core/retrievers';
import { ChatOllama } from '@langchain/ollama';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { ChromaClient } from 'chromadb';
import { OllamaEmbeddings } from '@langchain/ollama';
import { env, CHATBOT_CONSTANTS } from '@common';

export default class LocalChatbotEngine extends ChatbotEngine {
  private CHAT_MODEL = env.OLLAMA_CHAT_MODEL;
  private EMBEDDING_MODEL = CHATBOT_CONSTANTS.MODELS.LOCAL.EMBEDDING;
  private COLLECTION_NAME = CHATBOT_CONSTANTS.MODELS.LOCAL.COLLECTION;

  protected createLlm(): BaseChatModel {
    return new ChatOllama({
      model: this.CHAT_MODEL,
      temperature: 0.1,
      baseUrl: env.OLLAMA_BASE_URL,
    });
  }

  protected createRetriever(): BaseRetriever {
    const embeddings = new OllamaEmbeddings({
      model: this.EMBEDDING_MODEL,
      baseUrl: env.OLLAMA_BASE_URL,
    });
    const chromaHost = env.CHROMA_HOST;
    const chromaClient = new ChromaClient({
      host: chromaHost,
      port: env.CHROMA_PORT,
      ssl: env.CHROMA_SSL,
    });

    return new Chroma(embeddings, {
      collectionName: this.COLLECTION_NAME,
      index: chromaClient,
    }).asRetriever();
  }
}
