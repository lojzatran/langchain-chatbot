import type { ChatSession, ChatbotConfig } from '../types/chat';

export default interface ClientsManager<T> {
  clients: Map<T, ChatSession>;

  setSelectedConfig(key: T, config: ChatbotConfig): void;

  removeClient(key: T): void;

  getClientOrDefault(key: T): ChatSession;
}
