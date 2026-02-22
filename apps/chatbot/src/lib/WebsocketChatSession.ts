import type { WebSocket } from 'ws';
import type { ChatSession, ChatbotConfig } from '../types/chat';
import { streamAnswer } from './chatbot-langchain';

export default class WebSocketChatSession implements ChatSession {
  chatHistory: { user: string; ai: string }[];
  timeout: NodeJS.Timeout | null;
  config: ChatbotConfig;
  ws: WebSocket;

  private readonly TEN_MINUTES_IN_MS = 10 * 60 * 1000;

  constructor(ws: WebSocket) {
    this.chatHistory = [];
    this.timeout = null;
    this.config = 'upstash-gemma3-nomic';
    this.ws = ws;
  }

  setConfig(config: ChatbotConfig) {
    this.config = config;
  }

  async handleAnswer(content: string) {
    await streamAnswer(this.ws, content, this.chatHistory);
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
