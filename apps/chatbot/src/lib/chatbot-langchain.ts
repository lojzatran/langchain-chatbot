import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import {
  RunnablePassthrough,
  RunnableSequence,
} from '@langchain/core/runnables';
import { WebSocket } from 'ws';
import { Document } from '@langchain/core/documents';
import { STANDALONE_QUESTION_TEMPLATE, ANSWER_TEMPLATE } from './prompts';
import { getLlm, getRetriever } from './chatbot-config';
import { ChatbotConfig } from '../types/chat';
import { getClientOrDefault } from './chatbot-client-manager';

/**
 * Types and Interfaces
 */
export interface ChatMessage {
  user: string;
  ai: string;
}

interface ChainInput {
  question: string;
  chatHistory: ChatMessage[];
}

/**
 * Helper Functions
 */
const formatChatHistory = (chatHistory: ChatMessage[]) => {
  return chatHistory
    .map((msg) => `User: ${msg.user}\nAI: ${msg.ai}`)
    .join('\n\n');
};

const formatDocuments = (docs: Document[]) => {
  return docs.map((doc) => doc.pageContent).join('\n\n');
};

/**
 * Chain Definitions
 */
const standaloneQuestionPrompt = PromptTemplate.fromTemplate(
  STANDALONE_QUESTION_TEMPLATE,
);
const answerPrompt = PromptTemplate.fromTemplate(ANSWER_TEMPLATE);

/**
 * Main Exported Function
 */
async function streamAnswer(
  ws: WebSocket,
  question: string,
  chatHistory: ChatMessage[],
) {
  try {
    const client = getClientOrDefault(ws);
    const chain = createRunnableSequenceChain(client.config);

    let answer = await streamAnswerToWs(chain, question, chatHistory, ws);

    // Persist the interaction to history
    chatHistory.push({
      user: question,
      ai: answer,
    });
  } catch (error) {
    handleError(error, ws);
  }
}

function handleError(error: unknown, ws: WebSocket) {
  console.error('Error in streamAnswer:', error);

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: 'error',
        role: 'system',
        content:
          'Sorry, I encountered an error while processing your request. Please try again later.',
      }),
    );
  }
}

async function streamAnswerToWs(
  chain: RunnableSequence<ChainInput, any>,
  question: string,
  chatHistory: ChatMessage[],
  ws: WebSocket,
) {
  const answerStreamEvent = chain.streamEvents(
    { question, chatHistory },
    { version: 'v2' },
  );

  let answer = '';

  for await (const streamEvent of answerStreamEvent) {
    console.log(streamEvent);
    // Safety check: is the client still connected?
    if (ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket closed during stream processing');
      break;
    }

    if (streamEvent.event === 'on_chat_model_stream') {
      const content = streamEvent.data.chunk?.content;
      if (content) {
        answer += content;
        ws.send(
          JSON.stringify({ type: 'chunk', role: 'ai', content: content }),
        );
      }
    } else if (streamEvent.event === 'on_chat_model_end') {
      ws.send(JSON.stringify({ type: 'end', role: 'ai', content: answer }));
    }
  }
  return answer;
}

function createRunnableSequenceChain(config: ChatbotConfig) {
  const llm = getLlm(config);
  const retriever = getRetriever(config);
  const retrieverChain = RunnableSequence.from([
    standaloneQuestionPrompt,
    llm,
    new StringOutputParser(),
    retriever,
    formatDocuments,
  ]);

  const chain = RunnableSequence.from([
    {
      context: (input: ChainInput) =>
        retrieverChain.invoke({ question: input.question }),
      question: new RunnablePassthrough(),
      chatHistory: (input: ChainInput) => formatChatHistory(input.chatHistory),
    },
    answerPrompt,
    llm,
  ]);
  return chain;
}

export { streamAnswer };
