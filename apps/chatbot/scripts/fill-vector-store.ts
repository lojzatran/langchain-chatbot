// import fs from 'fs/promises';
// import path from 'path';
// import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
// import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
// import { createClient } from '@supabase/supabase-js';
// import { GoogleGenAIEmbeddings } from '../lib/GoogleGeminiAiEmbeddings.js';
// import { OllamaEmbeddings } from '@langchain/ollama';

// import { env } from '../utils/env.js';

// const data = await fs.readFile(
//   path.join(process.cwd(), 'assets/faq.txt'),
//   'utf8',
// );

// const splitter = new RecursiveCharacterTextSplitter({
//   chunkSize: env.SPLITTER_CHUNK_SIZE,
//   chunkOverlap: env.SPLITTER_CHUNK_OVERLAP,
// });

// const chunks = await splitter.createDocuments([data]);

// const supbaseUrl = env.SUPABASE_URL;
// const supbaseKey = env.SUPABASE_API_KEY;
// const googleGeminiAiKey = env.GOOGLE_API_KEY;

// const supbaseClient = createClient(supbaseUrl, supbaseKey);

// await SupabaseVectorStore.fromDocuments(
//   chunks,
//   new GoogleGenAIEmbeddings({
//     apiKey: googleGeminiAiKey,
//     model: 'gemini-embedding-001',
//   }),
//   {
//     client: supbaseClient,
//     tableName: 'documents',
//   },
// );

// console.log('Vector store filled successfully!');
