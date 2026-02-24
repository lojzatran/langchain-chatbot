import { once } from 'node:events';
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Duplex } from 'node:stream';
import { WebSocket } from 'ws';
import ChatbotWebsocketServer from '../../../apps/chatbot/src/app/WebsocketServer';
import WebsocketClientsManager from '../../../apps/chatbot/src/lib/WebsocketClientsManager';
import WebSocketChatSession from '../../../apps/chatbot/src/lib/WebsocketChatSession';
import CloudChatbotEngine from '../../../apps/chatbot/src/lib/chat/engines/CloudChatbotEngine';
import LocalChatbotEngine from '../../../apps/chatbot/src/lib/chat/engines/LocalChatbotEngine';
import { ChatbotConfig } from '../../../apps/chatbot/src/types/chat';

const WAIT_TIMEOUT_MS = 3_000;
const WAIT_INTERVAL_MS = 20;

async function waitFor<T>(check: () => T | undefined): Promise<T> {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const result = check();
    if (result !== undefined) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, WAIT_INTERVAL_MS));
  }

  throw new Error('Timed out waiting for expected websocket state.');
}

async function closeWebSocket(ws: WebSocket): Promise<void> {
  if (ws.readyState === WebSocket.CLOSED) {
    return;
  }
  ws.close();
  await once(ws, 'close');
}

async function waitForClientCount(
  clientsManager: WebsocketClientsManager,
  count: number,
): Promise<void> {
  await waitFor(() => {
    return clientsManager.clients.size === count ? true : undefined;
  });
}

async function waitForSession(
  clientsManager: WebsocketClientsManager,
  predicate: (session: WebSocketChatSession) => boolean,
): Promise<WebSocketChatSession> {
  return waitFor(() => {
    const [session] = Array.from(clientsManager.clients.values());

    if (!(session instanceof WebSocketChatSession)) {
      return undefined;
    }

    return predicate(session) ? session : undefined;
  });
}

function sendConfigMessage(ws: WebSocket, config: ChatbotConfig): void {
  ws.send(JSON.stringify({ type: 'config', config }));
}

function sendChatMessage(ws: WebSocket, content: string): void {
  ws.send(JSON.stringify({ content }));
}

function collectJsonMessages(ws: WebSocket) {
  const messages: Array<Record<string, unknown>> = [];

  const onMessage = (rawData: Buffer | ArrayBuffer | Buffer[]) => {
    const text = Array.isArray(rawData)
      ? Buffer.concat(rawData).toString()
      : Buffer.isBuffer(rawData)
        ? rawData.toString()
        : Buffer.from(rawData).toString();

    try {
      messages.push(JSON.parse(text));
    } catch {
      // Ignore non-JSON messages.
    }
  };

  ws.on('message', onMessage);

  return {
    waitForMessage: (
      predicate: (message: Record<string, unknown>) => boolean,
    ) => waitFor(() => messages.find(predicate)),
    stop: () => ws.off('message', onMessage),
  };
}

describe('ws config integration', () => {
  let httpServer: HttpServer;
  let port: number;
  let clientsManager: WebsocketClientsManager;

  beforeAll(async () => {
    clientsManager = new WebsocketClientsManager();
    const websocketServer = new ChatbotWebsocketServer(clientsManager);
    websocketServer.start();

    httpServer = createServer((_req, res) => {
      res.statusCode = 404;
      res.end();
    });

    httpServer.on('upgrade', (req, socket, head) => {
      if (req.url === '/api/ws') {
        websocketServer.handleUpgrade(req, socket as Duplex, head);
        return;
      }
      socket.destroy();
    });

    await new Promise<void>((resolve) => {
      httpServer.listen(0, '127.0.0.1', resolve);
    });

    port = (httpServer.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      httpServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  test('config messages switch the existing chat session to the correct engine', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/ws`);
    await once(ws, 'open');

    try {
      sendConfigMessage(ws, ChatbotConfig.SUPABASE_GEMINI);

      const cloudSession = await waitForSession(
        clientsManager,
        (session) => session.engine instanceof CloudChatbotEngine,
      );

      expect(cloudSession.engine).toBeInstanceOf(CloudChatbotEngine);
      expect(clientsManager.clients.size).toBe(1);

      sendConfigMessage(ws, ChatbotConfig.CHROMA_GEMMA3_NOMIC);

      const localSession = await waitForSession(
        clientsManager,
        (session) => session.engine instanceof LocalChatbotEngine,
      );

      expect(localSession).toBe(cloudSession);
      expect(localSession.engine).toBeInstanceOf(LocalChatbotEngine);
    } finally {
      await closeWebSocket(ws);
      await waitForClientCount(clientsManager, 0);
    }
  });

  test('when llm is down, it sends an error message to the frontend', async () => {
    const createLlmSpy = jest
      .spyOn(LocalChatbotEngine.prototype as any, 'createLlm')
      .mockImplementation(() => {
        throw new Error('llm service unavailable');
      });

    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/ws`);
    await once(ws, 'open');

    const messageCollector = collectJsonMessages(ws);

    try {
      sendConfigMessage(ws, ChatbotConfig.CHROMA_GEMMA3_NOMIC);
      sendChatMessage(ws, 'Can you answer this?');

      const errorMessage = await messageCollector.waitForMessage(
        (message) => message.type === 'error',
      );

      expect(errorMessage).toEqual(
        expect.objectContaining({
          type: 'error',
          role: 'system',
          content: expect.stringContaining(
            'Sorry, I encountered an error while processing your request.',
          ),
        }),
      );
    } finally {
      messageCollector.stop();
      createLlmSpy.mockRestore();
      await closeWebSocket(ws);
      await waitForClientCount(clientsManager, 0);
    }
  });
});
