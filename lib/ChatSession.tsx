import { ChatbotConfig } from "@/types/chat";

interface ChatSession {
  chatHistory: { user: string; ai: string }[];
  timeout: NodeJS.Timeout | null;
  config: ChatbotConfig;
}

export default ChatSession;
