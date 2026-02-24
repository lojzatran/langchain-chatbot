import type { WebSocket } from 'ws';
import type { ChatSession, ChatbotConfig } from '../types/chat';
import WebSocketChatSession from './WebsocketChatSession';
import ClientsManager from './ClientsManager';

export default class WebsocketClientsManager implements ClientsManager<WebSocket> {
  clients: Map<WebSocket, ChatSession> = new Map();

  setSelectedConfig(ws: WebSocket, config: ChatbotConfig) {
    const client = this.getClientOrDefault(ws);
    client.setConfig(config);
  }

  removeClient(ws: WebSocket) {
    this.clients.delete(ws);
  }

  getClientOrDefault(ws: WebSocket): ChatSession {
    let client = this.clients.get(ws);
    if (!client) {
      client = new WebSocketChatSession(ws);
      this.clients.set(ws, client);
    }
    return client;
  }
}
