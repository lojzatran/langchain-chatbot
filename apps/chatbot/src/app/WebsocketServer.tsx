import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Duplex } from 'stream';
import ChatbotClientsManager from '../lib/WebsocketClientsManager';
import { ChatSession } from '../types/chat';

export default class ChatbotWebsocketServer {
  private wss: WebSocketServer;
  private clientManager: ChatbotClientsManager;

  constructor(clientManager: ChatbotClientsManager) {
    this.wss = new WebSocketServer({ noServer: true });
    this.clientManager = clientManager;
  }

  start() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('Client connected');

      ws.on('message', async (messageBuffer: Buffer) => {
        await this.processMessageBuffer(ws, messageBuffer);
      });

      ws.on('close', () => {
        console.log('Client disconnected');
        this.clientManager.removeClient(ws);
      });
    });
  }

  async processMessageBuffer(ws: WebSocket, messageBuffer: Buffer) {
    try {
      const message = JSON.parse(messageBuffer.toString());
      console.log('Client message: ', message);
      const chatSession: ChatSession =
        this.clientManager.getClientOrDefault(ws);

      if (message.type === 'config') {
        this.clientManager.setSelectedConfig(ws, message.config);
        console.log(`Config updated for client to: ${message.config}`);
        return;
      }

      const content = message.content;
      if (content?.length > 0) {
        await chatSession.handleAnswer(content);
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
