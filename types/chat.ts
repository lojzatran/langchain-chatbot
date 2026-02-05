export type MessageRole = "user" | "ai" | "system";

export interface Message {
  id: number;
  role: MessageRole;
  content: string;
}

export type ChatbotConfig = "supabase-gemini-openai" | "upstash-gemma3-nomic";
