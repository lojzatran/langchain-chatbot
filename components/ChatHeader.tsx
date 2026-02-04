import React from "react";

interface ChatHeaderProps {
  config: string | null;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ config }) => {
  return (
    <header className="p-6 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/40 backdrop-blur-md">
      <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
        AI Chat Assistant
      </h1>
      {config && (
        <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-slate-800 border border-slate-700 text-purple-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
          {config === "supabase-gemini-openai"
            ? "SUPABASE + GEMINI + OPENAI"
            : "UPSTASH + GEMINI + OLLAMA"}
        </span>
      )}
    </header>
  );
};
