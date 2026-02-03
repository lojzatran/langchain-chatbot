export type MessageRole = "user" | "ai" | "system";

export interface Message {
  id: number;
  role: MessageRole;
  content: string;
}
