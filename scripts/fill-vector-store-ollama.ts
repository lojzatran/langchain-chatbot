import fs from "fs/promises";
import path from "path";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OllamaEmbeddings } from "@langchain/ollama";
import { Chroma } from "@langchain/community/vectorstores/chroma";

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

const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text:latest",
});

const vectorStore = new Chroma(embeddings, {
  collectionName: "faq-collection",
  url: `http://${env.CHROMA_HOST}:8000`,
});

await vectorStore.addDocuments(chunks);

console.log("Vector store filled successfully!");
