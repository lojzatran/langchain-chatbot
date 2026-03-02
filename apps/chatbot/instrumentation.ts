import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({ serviceName: 'langchain-chatbot-app' });
}
