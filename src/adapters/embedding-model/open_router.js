/**
 * OpenRouter Embedding Model Adapter for Smart Connections
 * Wraps the smart-embed-model OpenRouter adapter for use in obsidian-smart-env
 */
import { SmartEmbedOpenRouterAdapter } from "smart-embed-model/adapters/open_router.js";

export class OpenRouterEmbeddingModelAdapter extends SmartEmbedOpenRouterAdapter {
  constructor(model_item) {
    super(model_item);
  }
}

export const settings_config = {
  api_key: {
    name: 'OpenRouter API Key',
    type: 'password',
    description: 'Your OpenRouter API key for embedding models.',
    placeholder: 'Enter your OpenRouter API key',
  },
};

export default {
  class: OpenRouterEmbeddingModelAdapter,
  settings_config,
};
