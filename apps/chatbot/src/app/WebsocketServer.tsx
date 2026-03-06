import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Duplex } from 'stream';
import ChatbotClientsManager from '../lib/WebsocketClientsManager';
import { ChatSession } from '../types/chat';
import { getLogger } from '../lib/logger';

const logger = getLogger();

export default class ChatbotWebsocketServer {
  private wss: WebSocketServer;
  private clientManager: ChatbotClientsManager;

  constructor(clientManager: ChatbotClientsManager) {
    this.wss = new WebSocketServer({ noServer: true });
    this.clientManager = clientManager;
  }

  start() {
    this.wss.on('connection', (ws: WebSocket) => {
      logger.debug('Client connected');

      ws.on('message', async (messageBuffer: Buffer) => {
        await this.processMessageBuffer(ws, messageBuffer);
      });

      ws.on('close', () => {
        logger.debug('Client disconnected');
        this.clientManager.removeClient(ws);
      });
    });
  }

  async processMessageBuffer(ws: WebSocket, messageBuffer: Buffer) {
    try {
      const message = JSON.parse(messageBuffer.toString());
      logger.debug(message, 'Client message');
      const chatSession: ChatSession = this.clientManager.getClientOrDefault(ws);

      if (message.type === 'config') {
        this.clientManager.setSelectedConfig(ws, message.config);
        logger.debug(`Config updated for client to: ${message.config}`);
        return;
      }

      const content = message.content;
      if (content?.length > 0) {
        await chatSession.handleAnswer(content);
      }
    } catch (error) {
      logger.error(error, 'WebSocket message error');
    }
  }

  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
    this.wss.handleUpgrade(req, socket, head, (ws) => {
      this.wss.emit('connection', ws, req);
    });
  }
}
