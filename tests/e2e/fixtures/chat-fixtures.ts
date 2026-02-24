import { test as base } from '@playwright/test';
import { ChatPage } from '../pages/ChatPage';

type ChatFixtures = {
  chatPage: ChatPage;
};

export const test = base.extend<ChatFixtures>({
  chatPage: async ({ page }, use) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();
    await use(chatPage);
  },
});

export { expect } from '@playwright/test';
