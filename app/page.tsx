"use client";

import { useWebSocket } from "../contextproviders/WebSocketProvider";
import { useEffect, useState, useRef } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    { id: 1, role: "ai", content: "Ask me anything!" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const webSocket = useWebSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    webSocket?.send(input);
  };

  useEffect(() => {
    if (!webSocket) return;
    webSocket.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);

        if (parsedData.type === "system") {
          setMessages((prev) => [
            ...prev,
            { id: Date.now(), role: "system", content: parsedData.content },
          ]);
          return;
        }

        if (parsedData.type === "chunk") {
          setIsLoading(false);
          setIsStreaming(true);
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            console.log(lastMessage);
            if (lastMessage.role === "ai") {
              // the streaming is still going on - we update the last message bubble
              return [
                ...prev.slice(0, prev.length - 1),
                {
                  ...lastMessage,
                  content: lastMessage.content + parsedData.content,
                },
              ];
            } else {
              // the streaming hasn't started yet - we create a new message bubble
              return [
                ...prev,
                {
                  id: Date.now(),
                  role: "ai",
                  content: parsedData.content,
                },
              ];
            }
          });
        } else if (parsedData.type === "end") {
          setIsStreaming(false);
        }
      } catch (err) {
        console.error("Error parsing message: ", err, event.data);
      }
    };

    webSocket.onerror = (event) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "system",
          content: "Error: " + JSON.stringify(event),
        },
      ]);
      setIsLoading(false);
    };
  }, [webSocket, isLoading]);

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white">
      {/* Header */}
      <header className="p-6 border-b border-slate-800/50">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Chatbot
        </h1>
      </header>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-2xl p-4 rounded-2xl ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-xl"
                  : "bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 shadow-lg"
              }`}
            >
              <p className="prose prose-invert max-w-none">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-4 rounded-2xl shadow-lg">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.3s]"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Prompt Input */}
      <form
        onSubmit={handleSubmit}
        className="p-6 border-t border-slate-800/50 bg-slate-900/50 backdrop-blur-sm"
      >
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-slate-800/50 border border-slate-700/50 focus:border-purple-400 focus:outline-none rounded-2xl px-6 py-4 text-lg placeholder-slate-400 transition-all duration-200 resize-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
