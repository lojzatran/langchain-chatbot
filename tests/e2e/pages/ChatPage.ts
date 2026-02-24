import { Page, Locator } from '@playwright/test';

export class ChatPage {
  readonly page: Page;
  readonly configSelectionContainer: Locator;
  readonly localConfigButton: Locator;
  readonly cloudConfigButton: Locator;
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly messages: Locator;

  constructor(page: Page) {
    this.page = page;
    this.configSelectionContainer = page.getByText('Select AI Backend');
    this.localConfigButton = page.getByRole('button', {
      name: /Upstash \+ Ollama/i,
    });
    this.cloudConfigButton = page.getByRole('button', {
      name: /Supabase \+ Gemini/i,
    });
    this.chatInput = page.getByPlaceholder('Type your message...');
    this.sendButton = page
      .locator('form')
      .getByRole('button')
      .filter({ has: page.locator('svg') });
    this.messages = page.locator('p.prose');
  }

  async goto() {
    await this.page.goto('/');
  }

  async selectLocalConfig() {
    await this.localConfigButton.click();
  }

  async selectCloudConfig() {
    await this.cloudConfigButton.click();
  }

  async sendMessage(message: string) {
    await this.chatInput.fill(message);
    await this.sendButton.click();
  }

  async getMessagesCount(): Promise<number> {
    return await this.messages.count();
  }

  async getLatestMessage(): Promise<Locator> {
    return this.messages.last();
  }
}
