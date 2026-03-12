/**
 * Extended Embedding Models Collection for Smart Connections
 * Adds additional providers (Ollama, LM Studio, OpenRouter, Azure OpenAI) beyond the default transformers
 */
import base from 'smart-models/collections/embedding_models.js';
import transformers from 'obsidian-smart-env/src/adapters/embedding-model/transformers_iframe.js';
import ollama from '../adapters/embedding-model/ollama.js';
import lm_studio from '../adapters/embedding-model/lm_studio.js';
import open_router from '../adapters/embedding-model/open_router.js';
import azure_openai from '../adapters/embedding-model/azure_openai.js';

// Extend the base embedding_models collection with additional providers
base.providers = {
  transformers,
  ollama,
  lm_studio,
  open_router,
  azure_openai,
};

export default base;
