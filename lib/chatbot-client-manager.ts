import ChatSession from "@/lib/ChatSession";
import { ChatbotConfig } from "@/types/chat";
import { WebSocket } from "ws";

const clients: Map<WebSocket, ChatSession> = new Map();

export const setSelectedConfig = (ws: WebSocket, config: ChatbotConfig) => {
  const client = getClientOrDefault(ws);
  client.config = config;
};

export const removeClient = (ws: WebSocket) => {
  clients.delete(ws);
};

export const getClientOrDefault = (ws: WebSocket) => {
  let client = clients.get(ws);
  if (!client) {
    client = {
      chatHistory: [],
      timeout: null,
      config: "upstash-gemma3-nomic",
    };
    clients.set(ws, client);
  }
  return client;
};
