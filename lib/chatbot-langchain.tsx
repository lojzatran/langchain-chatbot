import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAIEmbeddings } from "./GoogleGeminiAiEmbeddings";
import {
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";
import { env } from "@/utils/env";
import { WebSocket } from "ws";
import { Document } from "@langchain/core/documents";

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
 * Prompt Templates
 */
const STANDALONE_QUESTION_TEMPLATE = `
Given a question, convert it to a standalone question as short as possible. 
<question>{question}</question> 
Answer: `;

const ANSWER_TEMPLATE = `
You are a helpful and friendly assistant. If you haven't greet the user in the chat history, greet the user first.
Try to use user's name if available in the chat history or question.
Try to capture his emotions from the question and answer him with the same emotion.
Answer the question based on the context provided. 
If the answer is not in the context, check chat history to see if the answer is there. 
If answer is not there, say that you don't know and do not make up an answer.
Recommend the user to contact the support team if you don't know the answer.
Use chat history to make the user feels more familiar with the assistant.

<context>
{context}
</context>

<question>
{question}
</question>

<chat_history>
{chatHistory}
</chat_history>

Answer: `;

/**
 * Clients & Initialization
 */
const llm = new ChatOpenAI({
  apiKey: env.OPENAI_API_KEY,
  model: "gpt-4o-mini",
  temperature: 0.1,
});

const embeddings = new GoogleGenAIEmbeddings({
  apiKey: env.GOOGLE_GEMINI_API_KEY,
  model: "gemini-embedding-001",
});

const supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_API_KEY);

const vectorStore = new SupabaseVectorStore(embeddings, {
  client: supabaseClient,
  tableName: "documents",
  queryName: "match_documents",
});

const retriever = vectorStore.asRetriever();

/**
 * Helper Functions
 */
const formatChatHistory = (chatHistory: ChatMessage[]) => {
  return chatHistory
    .map((msg) => `User: ${msg.user}\nAI: ${msg.ai}`)
    .join("\n\n");
};

const formatDocuments = (docs: Document[]) => {
  return docs.map((doc) => doc.pageContent).join("\n\n");
};

/**
 * Chain Definitions
 */
const standaloneQuestionPrompt = PromptTemplate.fromTemplate(
  STANDALONE_QUESTION_TEMPLATE,
);
const answerPrompt = PromptTemplate.fromTemplate(ANSWER_TEMPLATE);

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

/**
 * Main Exported Function
 */
async function streamAnswer(
  ws: WebSocket,
  question: string,
  chatHistory: ChatMessage[],
) {
  try {
    const answerStreamEvent = chain.streamEvents(
      { question, chatHistory },
      { version: "v2" },
    );

    let answer = "";

    for await (const streamEvent of answerStreamEvent) {
      // Safety check: is the client still connected?
      if (ws.readyState !== WebSocket.OPEN) {
        console.warn("WebSocket closed during stream processing");
        break;
      }

      if (streamEvent.event === "on_chat_model_stream") {
        const content = streamEvent.data.chunk?.content;
        if (content) {
          answer += content;
          ws.send(
            JSON.stringify({ type: "chunk", role: "ai", content: content }),
          );
        }
      } else if (streamEvent.event === "on_chat_model_end") {
        ws.send(JSON.stringify({ type: "end", role: "ai", content: answer }));
      }
    }

    // Persist the interaction to history
    chatHistory.push({
      user: question,
      ai: answer,
    });
  } catch (error) {
    console.error("Error in streamAnswer:", error);

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "error",
          role: "system",
          content:
            "Sorry, I encountered an error while processing your request. Please try again later.",
        }),
      );
    }
  }
}

export { streamAnswer };
