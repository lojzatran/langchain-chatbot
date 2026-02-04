import { setSelectedConfig } from "@/lib/chatbot-config";
import { ChatbotConfig } from "@/types/chat";

export async function POST(req: Request) {
  const { config }: { config: ChatbotConfig } = await req.json();
  console.log(config);
  setSelectedConfig(config);
  return Response.json({ message: "Config updated successfully" });
}
