export const CHATBOT_CONSTANTS = {
  MODELS: {
    LOCAL: {
      CHAT: 'gemma3:1b',
      EMBEDDING: 'nomic-embed-text:latest',
      COLLECTION: 'faq-collection',
    },
    CLOUD: {
      CHAT: 'gemini-2.5-flash-lite',
      EMBEDDING: 'gemini-embedding-001',
      TABLE: 'documents',
      QUERY_NAME: 'match_documents',
    },
  },
} as const;
