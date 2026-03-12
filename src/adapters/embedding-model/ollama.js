/**
 * Ollama Embedding Model Adapter for Smart Connections
 * Wraps the smart-embed-model Ollama adapter for use in obsidian-smart-env
 */
import { SmartEmbedOllamaAdapter } from "smart-embed-model/adapters/ollama.js";

export class OllamaEmbeddingModelAdapter extends SmartEmbedOllamaAdapter {
  constructor(model_item) {
    super(model_item);
  }
}

export const settings_config = {
  api_key: {
    name: 'API Key',
    type: 'password',
    description: 'Not required for local Ollama instance.',
    placeholder: 'Leave empty for local Ollama',
  },
  host: {
    name: 'Ollama Host',
    type: 'text',
    description: 'The host URL for your Ollama instance.',
    default: 'http://localhost:11434',
    placeholder: 'http://localhost:11434',
  },
};

export default {
  class: OllamaEmbeddingModelAdapter,
  settings_config,
};
