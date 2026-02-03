"use client";

import { MessageList } from "@/components/MessageList";
import { useWebSocket } from "../contextproviders/WebSocketProvider";
import { useEffect, useState, useRef, SubmitEvent } from "react";
import { ChatInput } from "@/components/ChatInput";
import { ChatHeader } from "@/components/ChatHeader";
import { Message } from "@/types/chat";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
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

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

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
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white">
      <ChatHeader />

      <MessageList messages={messages} isLoading={isLoading} />

      <ChatInput
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        onSend={handleSubmit}
      />
    </div>
  );
}
