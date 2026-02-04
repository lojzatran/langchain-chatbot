import fs from "fs/promises";
import path from "path";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OllamaEmbeddings } from "@langchain/ollama";
import { UpstashVectorStore } from "@langchain/community/vectorstores/upstash";
import { Index } from "@upstash/vector";

import { env } from "../utils/env.js";

const data = await fs.readFile(
  path.join(process.cwd(), "assets/faq.txt"),
  "utf8",
);

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: env.SPLITTER_CHUNK_SIZE,
  chunkOverlap: env.SPLITTER_CHUNK_OVERLAP,
});

const chunks = await splitter.createDocuments([data]);

const indexWithCredentials = new Index({
  url: env.UPSTASH_VECTOR_REST_URL,
  token: env.UPSTASH_VECTOR_REST_TOKEN,
});

const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text:latest",
});

await UpstashVectorStore.fromDocuments(chunks, embeddings, {
  index: indexWithCredentials,
});

console.log("Vector store filled successfully!");
