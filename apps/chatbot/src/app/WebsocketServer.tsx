import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Duplex } from 'stream';
import {
  getClientOrDefault,
  removeClient,
} from '../lib/chatbot-client-manager';
import { ChatSession } from '../types/chat';

export default class ChatbotWebsocketServer {
  private wss: WebSocketServer;

  constructor() {
    this.wss = new WebSocketServer({ noServer: true });
  }

  start() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('Client connected');

      ws.on('message', async (messageBuffer: Buffer) => {
        this.processMessageBuffer(ws, messageBuffer);
      });

      ws.on('close', () => {
        console.log('Client disconnected');
        removeClient(ws);
      });
    });
  }

  processMessageBuffer(ws: WebSocket, messageBuffer: Buffer) {
    try {
      const message = JSON.parse(messageBuffer.toString());
      console.log('Client message: ', message);
      const chatSession: ChatSession = getClientOrDefault(ws);

      if (message.type === 'config') {
        chatSession.setConfig(message.config);
        console.log(`Config updated for client to: ${message.config}`);
        return;
      }

      const content = message.content;
      if (content?.length > 0) {
        chatSession.handleAnswer(content);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  }

  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
    this.wss.handleUpgrade(req, socket, head, (ws) => {
      this.wss.emit('connection', ws, req);
    });
  }
}
