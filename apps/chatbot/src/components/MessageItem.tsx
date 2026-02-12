import React from 'react';
import { Message } from '../types/chat';

interface MessageItemProps {
  message: Message;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-2xl p-4 rounded-2xl ${
          isUser
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-xl'
            : isSystem
              ? 'bg-green-900/20 border border-green-500/50 text-green-200'
              : 'bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 shadow-lg'
        }`}
      >
        <p className="prose prose-invert max-w-none">{message.content}</p>
      </div>
    </div>
  );
};
