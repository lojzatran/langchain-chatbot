import { Document } from '@langchain/core/documents';
import { PromptTemplate } from '@langchain/core/prompts';
import {
  RunnablePassthrough,
  RunnableSequence,
} from '@langchain/core/runnables';
import { ChatbotConfig, ChatMessage } from '../../../types/chat';
import { STANDALONE_QUESTION_TEMPLATE, ANSWER_TEMPLATE } from '../../prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { WebSocket } from 'ws';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseRetriever } from '@langchain/core/retrievers';

interface ChainInput {
  question: string;
  chatHistory: ChatMessage[];
}

export default abstract class ChatbotEngine {
  protected config: ChatbotConfig;
  protected ws: WebSocket;
  protected llm: BaseChatModel | null = null;
  protected retriever: BaseRetriever | null = null;

  constructor(config: ChatbotConfig, ws: WebSocket) {
    this.config = config;
    this.ws = ws;
  }

  /**
   * Helper Functions
   */
  private formatChatHistory(chatHistory: ChatMessage[]): string {
    return chatHistory
      .map((msg) => `User: ${msg.user}\nAI: ${msg.ai}`)
      .join('\n\n');
  }

  private formatDocuments(docs: Document[]): string {
    return docs.map((doc) => doc.pageContent).join('\n\n');
  }

  /**
   * Chain Definitions
   */
  private standaloneQuestionPrompt = PromptTemplate.fromTemplate(
    STANDALONE_QUESTION_TEMPLATE,
  );
  private answerPrompt = PromptTemplate.fromTemplate(ANSWER_TEMPLATE);

  /**
   * Main Exported Function
   */
  async streamAnswer(question: string, chatHistory: ChatMessage[]) {
    try {
      const chain = this.createRunnableSequenceChain();

      let answer = await this.streamAnswerToWs(chain, question, chatHistory);

      // Persist the interaction to history
      chatHistory.push({
        user: question,
        ai: answer,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown) {
    console.error('Error in streamAnswer:', error);

    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'error',
          role: 'system',
          content:
            'Sorry, I encountered an error while processing your request. Please try again later.',
        }),
      );

      throw error;
    }
  }

  private async streamAnswerToWs(
    chain: RunnableSequence<ChainInput, any>,
    question: string,
    chatHistory: ChatMessage[],
  ) {
    const answerStreamEvent = chain.streamEvents(
      { question, chatHistory },
      { version: 'v2' },
    );

    let answer = '';

    for await (const streamEvent of answerStreamEvent) {
      console.log(streamEvent);
      // Safety check: is the client still connected?
      if (this.ws.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket closed during stream processing');
        break;
      }

      if (streamEvent.event === 'on_chat_model_stream') {
        const content = streamEvent.data.chunk?.content;
        if (content) {
          answer += content;
          this.ws.send(
            JSON.stringify({ type: 'chunk', role: 'ai', content: content }),
          );
        }
      } else if (streamEvent.event === 'on_chat_model_end') {
        this.ws.send(
          JSON.stringify({ type: 'end', role: 'ai', content: answer }),
        );
      }
    }
    return answer;
  }

  private createRunnableSequenceChain() {
    const llm = this.getLlm();
    const retriever = this.getRetriever();
    const retrieverChain = RunnableSequence.from([
      this.standaloneQuestionPrompt,
      llm,
      new StringOutputParser(),
      retriever,
      this.formatDocuments,
    ]);

    const chain = RunnableSequence.from([
      {
        context: (input: ChainInput) =>
          retrieverChain.invoke({ question: input.question }),
        question: new RunnablePassthrough(),
        chatHistory: (input: ChainInput) =>
          this.formatChatHistory(input.chatHistory),
      },
      this.answerPrompt,
      llm,
    ]);
    return chain;
  }

  getLlm(): BaseChatModel {
    if (!this.llm) {
      this.llm = this.createLlm();
    }
    return this.llm;
  }

  getRetriever(): BaseRetriever {
    if (!this.retriever) {
      this.retriever = this.createRetriever();
    }
    return this.retriever;
  }

  protected abstract createLlm(): BaseChatModel;

  protected abstract createRetriever(): BaseRetriever;
}
