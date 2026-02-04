"use client";

import { MessageList } from "@/components/MessageList";
import { useWebSocket } from "../contextproviders/WebSocketProvider";
import { useEffect, useState, useRef, SubmitEvent } from "react";
import { ChatInput } from "@/components/ChatInput";
import { ChatHeader } from "@/components/ChatHeader";
import { Message, ChatbotConfig } from "@/types/chat";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: "ai", content: "Select your AI configuration to start!" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [config, setConfig] = useState<string | null>(null);
  const webSocket = useWebSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleConfigSelect = async (selectedConfig: ChatbotConfig) => {
    setConfig(selectedConfig);
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", content: `Config: ${selectedConfig}` },
    ]);
    await fetch("/api/chatbots", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ config: selectedConfig }),
    });

    setMessages([
      {
        id: Date.now(),
        role: "ai",
        content: "Hello, how can I help you today?",
      },
    ]);
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!input.trim() || !config) return;

    const userMsg: Message = { id: Date.now(), role: "user", content: input };
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
            {
              id: Date.now(),
              role: "system",
              content: parsedData.content,
            } as Message,
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
                } as Message,
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
        } as Message,
      ]);
      setIsLoading(false);
      setIsStreaming(false);
    };
  }, [webSocket, isLoading]);

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white shadow-2xl">
      <ChatHeader config={config} />

      <MessageList messages={messages} isLoading={isLoading} />

      {!config && (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-800/60 backdrop-blur-2xl border-t border-slate-700/50 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-white">
              Select AI Backend
            </h3>
            <p className="text-slate-400 text-sm">
              Choose the stack you want to use for this session.
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => handleConfigSelect("supabase-gemini-openai")}
              className="group relative flex flex-col items-center px-8 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all duration-300 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] active:scale-95"
            >
              <span className="text-blue-400 font-bold mb-1">
                Supabase + Gemini + OpenAI
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-tighter">
                Vector Database + LLM + Embedding
              </span>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-300"></div>
            </button>
            <button
              onClick={() => handleConfigSelect("upstash-gemini-ollama")}
              className="group relative flex flex-col items-center px-8 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all duration-300 hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] active:scale-95"
            >
              <span className="text-emerald-400 font-bold mb-1">
                Upstash + Gemini + Ollama
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-tighter">
                Vector Database + LLM + Local Embedding nomic-embed-text
              </span>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-300"></div>
            </button>
          </div>
        </div>
      )}

      <ChatInput
        input={input}
        setInput={setInput}
        isLoading={isLoading || !config}
        onSend={handleSubmit}
      />
    </div>
  );
}
