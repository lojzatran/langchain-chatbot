import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Duplex } from "stream";
import ChatSession from "@/lib/ChatSession";
import { streamAnswer } from "@/lib/chatbot-langchain";

export default class ChatbotWebsocketServer {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, ChatSession>;

  constructor() {
    this.wss = new WebSocketServer({ port: 8080 });
    this.clients = new Map();
  }

  start() {
    this.wss.on("connection", (ws: WebSocket) => {
      console.log("Client connected");
      this.clients.set(ws, {
        chatHistory: [],
        timeout: null,
      });

      ws.on("message", async (messageBuffer: Buffer) => {
          const message = messageBuffer.toString();
          console.log("Client message: ", message);
        // chat session is guaranteed to be non-null here because we set it when the client connected
        const chatSession = this.clients.get(ws)!;
        await streamAnswer(ws, message, chatSession.chatHistory);
        chatSession.timeout = this.setReminder(ws, chatSession.timeout);
      });

      ws.on("close", () => {
        console.log("Client disconnected");
        this.clients.delete(ws);
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
    }, 10000);
  }

  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
    this.wss.handleUpgrade(req, socket, head, (ws) => {
      this.wss.emit("connection", ws, req);
    });
  }
}
