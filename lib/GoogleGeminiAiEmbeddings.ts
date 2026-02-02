import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

const GoogleGenAIEmbeddingsInternal = class extends (GoogleGenerativeAIEmbeddings as any) {
  _convertToContent(text: string) {
    const cleanedText = this.stripNewLines ? text.replace(/\n/g, " ") : text;
    return {
      content: {
        role: "user",
        parts: [{ text: cleanedText }],
      },
      taskType: this.taskType,
      title: this.title,
      outputDimensionality: 1536,
    };
  }
};

export const GoogleGenAIEmbeddings =
  GoogleGenAIEmbeddingsInternal as unknown as typeof GoogleGenerativeAIEmbeddings;
