import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Duplex } from "stream";
import { streamAnswer } from "@/lib/chatbot-langchain";
import { getClientOrDefault, removeClient } from "@/lib/chatbot-client-manager";

export default class ChatbotWebsocketServer {
  private wss: WebSocketServer;
  private readonly TEN_MINUTES_IN_MS = 10 * 60 * 1000;

  constructor() {
    this.wss = new WebSocketServer({ noServer: true });
  }

  start() {
    this.wss.on("connection", (ws: WebSocket) => {
      console.log("Client connected");

      ws.on("message", async (messageBuffer: Buffer) => {
        const message = JSON.parse(messageBuffer.toString());
        console.log("Client message: ", message);

        if (message.type === "config") {
          const chatSession = getClientOrDefault(ws);
          chatSession.config = message.config;
          console.log(`Config updated for client to: ${message.config}`);
          return;
        }

        const chatSession = getClientOrDefault(ws);
        const content = message.content;
        if (content?.length > 0) {
          await streamAnswer(ws, content, chatSession.chatHistory);
          chatSession.timeout = this.setReminder(ws, chatSession.timeout);
        }
      });

      ws.on("close", () => {
        console.log("Client disconnected");
        removeClient(ws);
      });
    });
  }

  private setReminder(
    client: WebSocket,
    oldTimeout: NodeJS.Timeout | null | undefined,
  ) {
    if (oldTimeout) {
      clearTimeout(oldTimeout);
    }
    return setTimeout(() => {
      client.send(
        JSON.stringify({
          type: "system",
          content: "Hey, are you still here?",
        }),
      );
    }, this.TEN_MINUTES_IN_MS);
  }

  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
    this.wss.handleUpgrade(req, socket, head, (ws) => {
      this.wss.emit("connection", ws, req);
    });
  }
}
