import type { WebSocket } from 'ws';
import type { ChatSession } from '../types/chat';
import ChatbotEngine from './chat/engines/ChatbotEngine';
import { ChatbotConfig } from '../types/chat';
import ChatbotEngineFactory from './chat/engines/ChatbotEngineFactory';

export default class WebSocketChatSession implements ChatSession {
  chatHistory: { user: string; ai: string }[];
  timeout: NodeJS.Timeout | null;
  ws: WebSocket;
  engine: ChatbotEngine;

  private readonly TEN_MINUTES_IN_MS = 10 * 60 * 1000;

  constructor(ws: WebSocket) {
    this.chatHistory = [];
    this.timeout = null;
    this.ws = ws;
    this.engine = ChatbotEngineFactory.create(
      ChatbotConfig.CHROMA_GEMMA3_NOMIC,
      this.ws,
    );
  }

  setConfig(config: ChatbotConfig) {
    this.engine = ChatbotEngineFactory.create(config, this.ws);
  }

  async handleAnswer(content: string) {
    await this.engine.streamAnswer(content, this.chatHistory);
    this.setReminder();
  }

  private setReminder() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    this.timeout = setTimeout(() => {
      this.ws.send(
        JSON.stringify({
          type: 'system',
          content: 'Hey, are you still here?',
        }),
      );
    }, this.TEN_MINUTES_IN_MS);
  }
}
