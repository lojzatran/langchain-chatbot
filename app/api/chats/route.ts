import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAIEmbeddings } from "../../../lib/GoogleGeminiAiEmbeddings";
import {
  RunnableSequence,
  RunnablePassthrough,
} from "@langchain/core/runnables";
import { env } from "@/utils/env";

const llm = new ChatOpenAI({
  apiKey: env.OPENAI_API_KEY,
  model: "gpt-4o-mini",
  temperature: 0.1,
});

const standaloneQuestionTemplate =
  "Given a question, convert it to a standalone question as short as possible. Return only the converted standalone question. Question: {question}";
const standaloneQuestionPrompt = PromptTemplate.fromTemplate(
  standaloneQuestionTemplate,
);

const answerTemplate = `
You are a helpful and friendly assistant. Answer the question based on the context provided. If the answer is not in the context, check chat history to see if the answer is there. If answer is not there, say that you don't know and do not make up an answer.
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

const answerPrompt = PromptTemplate.fromTemplate(answerTemplate);

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

const retrieverChain = RunnableSequence.from([
  standaloneQuestionPrompt,
  llm,
  new StringOutputParser(),
  retriever,
]);

const chatHistory: { user: string; ai: string }[] = [];

const chain = RunnableSequence.from([
  {
    context: (input) => retrieverChain.invoke({ question: input.question }),
    question: new RunnablePassthrough(),
    chatHistory: () =>
      chatHistory.map((msg) => `User: ${msg.user}\nAI: ${msg.ai}`).join("\n\n"),
  },
  answerPrompt,
  llm,
  new StringOutputParser(),
]);

export async function POST(req: Request) {
  const body = await req.json();
  const question = body.messages[0].content;
  const answer = await chain.invoke({ question });

  chatHistory.push({
    user: question,
    ai: answer,
  });

  return Response.json({ message: answer });
}
