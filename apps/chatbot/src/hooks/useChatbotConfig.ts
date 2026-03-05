import { useState, useEffect } from 'react';

export interface ChatbotConfigResponse {
  supabaseGeminiEnabled: boolean;
}

export function useChatbotConfig() {
  const [config, setConfig] = useState<ChatbotConfigResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/chatbots/config');
        if (!response.ok) {
          throw new Error('Failed to fetch chatbot configuration');
        }
        const data = await response.json();
        setConfig(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, isLoading, error };
}
