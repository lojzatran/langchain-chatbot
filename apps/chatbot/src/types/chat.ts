export type MessageRole = 'user' | 'ai' | 'system';

export interface Message {
  id: number;
  role: MessageRole;
  content: string;
}

export interface ChatSession {
  chatHistory: { user: string; ai: string }[];
  timeout: NodeJS.Timeout | null;
  config: ChatbotConfig;
  setConfig(config: ChatbotConfig): void;
  handleAnswer(content: string): void;
}

export type ChatbotConfig = 'supabase-gemini' | 'upstash-gemma3-nomic';
