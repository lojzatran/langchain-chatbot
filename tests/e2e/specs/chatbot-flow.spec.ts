import { test, expect } from '../fixtures/chat-fixtures';

test.describe('Chatbot E2E Flow', () => {
  test('should initially disable input and then allow chatting after config selection', async ({
    chatPage,
    page,
  }) => {
    // 1. Go to homepage
    await chatPage.goto();

    // 2. Check if the user cannot type and send message
    await expect(chatPage.chatInput).toBeDisabled();
    await expect(chatPage.sendButton).toBeDisabled();

    // 3. Choose Ollama option (Local Config)
    await chatPage.selectLocalConfig();

    // 4. Verify Welcome text from AI
    const welcomeMessage = await chatPage.getLatestMessage();
    await expect(welcomeMessage).toHaveText('Hello, how can I help you today?');

    // 5. User types in "Hello" and sends it
    await chatPage.sendMessage('Hello');

    // 6. Verify user message appears
    // The user message is now the second to last, and AI reply will be the last
    const userMessage = page.locator('p.prose').filter({ hasText: /^Hello$/ });
    await expect(userMessage).toBeVisible();

    // 7. AI replies something after a while (check if a new message appears)
    // We expect the message count to increase to 3 (Welcome, User, AI Reply)
    await expect(async () => {
      const count = await chatPage.getMessagesCount();
      expect(count).toBeGreaterThan(2);
    }).toPass({ timeout: 30000 });

    const aiReply = await chatPage.getLatestMessage();
    const aiReplyText = await aiReply.textContent();

    // Simple check that it's not empty and not just our "Hello"
    expect(aiReplyText?.length).toBeGreaterThan(0);
    expect(aiReplyText).not.toBe('Hello');
  });
});
