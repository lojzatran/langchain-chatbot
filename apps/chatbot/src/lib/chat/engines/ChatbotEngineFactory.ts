import { WebSocket } from 'ws';
import { ChatbotConfig } from '../../../types/chat';
import ChatbotEngine from './ChatbotEngine';
import LocalChatbotEngine from './LocalChatbotEngine';
import CloudChatbotEngine from './CloudChatbotEngine';

export default class ChatbotEngineFactory {
  static create(config: ChatbotConfig, ws: WebSocket): ChatbotEngine {
    switch (config) {
      case ChatbotConfig.CHROMA_GEMMA3_NOMIC:
        return new LocalChatbotEngine(config, ws);
      case ChatbotConfig.SUPABASE_GEMINI:
        return new CloudChatbotEngine(config, ws);
      default:
        return new LocalChatbotEngine(ChatbotConfig.CHROMA_GEMMA3_NOMIC, ws);
    }
  }
}
