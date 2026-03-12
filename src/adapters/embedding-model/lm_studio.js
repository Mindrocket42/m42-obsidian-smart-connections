/**
 * LM Studio Embedding Model Adapter for Smart Connections
 * Wraps the smart-embed-model LM Studio adapter for use in obsidian-smart-env
 */
import { LmStudioEmbedModelAdapter } from "smart-embed-model/adapters/lm_studio.js";

export class LmStudioEmbeddingModelAdapter extends LmStudioEmbedModelAdapter {
  constructor(model_item) {
    super(model_item);
  }
}

export const settings_config = {
  host: {
    name: 'LM Studio Host',
    type: 'text',
    description: 'The host URL for your LM Studio server.',
    default: 'http://localhost:1234',
    placeholder: 'http://localhost:1234',
  },
};

export default {
  class: LmStudioEmbeddingModelAdapter,
  settings_config,
};
