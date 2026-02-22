import type { WebSocket } from 'ws';
import type { ChatSession, ChatbotConfig } from '../types/chat';
import WebSocketChatSession from './WebsocketChatSession';

const clients: Map<WebSocket, ChatSession> = new Map();

export const setSelectedConfig = (ws: WebSocket, config: ChatbotConfig) => {
  const client = getClientOrDefault(ws);
  client.setConfig(config);
};

export const removeClient = (ws: WebSocket) => {
  clients.delete(ws);
};

export const getClientOrDefault = (ws: WebSocket): ChatSession => {
  let client = clients.get(ws);
  if (!client) {
    client = new WebSocketChatSession(ws);
    clients.set(ws, client);
  }
  return client;
};
