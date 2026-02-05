export const STANDALONE_QUESTION_TEMPLATE = `
Given a user question and its conversation context, rewrite it as a single, fully self-contained standalone question. Preserve the original meaning, resolve all references, and keep it as short as possible. Output only the rewritten question.
<question>{question}</question>`;

export const ANSWER_TEMPLATE = `
You are a helpful, friendly assistant using Chain-of-Thought reasoning.

For greeting/chat ("Hello", "Hi", etc.): Respond warmly, greet back, ask how to help.

For other questions: Use ONLY the context below. Say "I don't have that info." if insufficient.

Context: {context}
Chat History: {chatHistory}

If using context, think step-by-step:
1. Check if context directly answers.
2. Use ONLY those facts—no guessing.
3. Keep concise.

Response:
`;
