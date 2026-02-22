export type MessageRole = 'user' | 'ai' | 'system';

export interface Message {
  id: number;
  role: MessageRole;
  content: string;
}

export interface ChatSession {
  setConfig(config: ChatbotConfig): void;
  handleAnswer(content: string): void;
}

export enum ChatbotConfig {
  SUPABASE_GEMINI = 'supabase-gemini',
  CHROMA_GEMMA3_NOMIC = 'chroma-gemma3-nomic',
}

export interface ChatMessage {
  user: string;
  ai: string;
}
