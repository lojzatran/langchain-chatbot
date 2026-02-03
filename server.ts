import { createServer, IncomingMessage } from "http";
import { parse } from "url";
import next from "next";
import { Duplex } from "stream";
import ChatbotWebsocketServer from "./app/chatbot-websocket-server";

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  }).listen(port);

  const websocketServer = new ChatbotWebsocketServer();
  websocketServer.start();

  server.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const { pathname } = parse(req.url || "/", true);

    if (pathname === "/_next/webpack-hmr") {
      app.getUpgradeHandler()(req, socket, head);
    }

    if (pathname === "/api/ws") {
      websocketServer.handleUpgrade(req, socket, head);
    }
  });

  console.log(
    `> Server listening at http://localhost:${port} as ${
      dev ? "development" : process.env.NODE_ENV
    }`,
  );
});
