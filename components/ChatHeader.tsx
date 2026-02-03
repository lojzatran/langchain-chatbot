import React from "react";

export const ChatHeader: React.FC = () => {
  return (
    <header className="p-6 border-b border-slate-800/50">
      <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
        Chatbot
      </h1>
    </header>
  );
};
