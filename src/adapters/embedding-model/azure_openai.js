/**
 * Azure OpenAI Embedding Model Adapter for Smart Connections
 * 
 * Provides embedding capabilities through Azure OpenAI Service.
 * Requires an Azure OpenAI resource with a deployed embedding model.
 * 
 * Configuration:
 * - resource_name: Your Azure OpenAI resource name
 * - deployment_name: The deployment name for your embedding model
 * - api_key: Azure OpenAI API key
 * - api_version: API version (default: 2024-02-01)
 */

import {
  SmartEmbedModelApiAdapter,
  SmartEmbedModelRequestAdapter,
  SmartEmbedModelResponseAdapter,
} from "smart-embed-model/adapters/_api.js";

/**
 * Azure OpenAI Embedding Adapter
 * @extends SmartEmbedModelApiAdapter
 */
export class AzureOpenAIEmbeddingModelAdapter extends SmartEmbedModelApiAdapter {
  static defaults = {
    description: "Azure OpenAI",
    type: "API",
    api_version: "2024-02-01",
    default_model: "text-embedding-ada-002",
    streaming: false,
    batch_size: 16,
    max_tokens: 8191,
  };

  /**
   * Get the Azure OpenAI endpoint URL
   * @returns {string} Endpoint URL
   */
  get endpoint() {
    const resource = this.model.data.resource_name;
    const deployment = this.model.data.deployment_name;
    const api_version = this.model.data.api_version || this.constructor.defaults.api_version;
    
    if (!resource || !deployment) {
      console.warn('[Azure OpenAI] Missing resource_name or deployment_name');
      return '';
    }
    
    return `https://${resource}.openai.azure.com/openai/deployments/${deployment}/embeddings?api-version=${api_version}`;
  }

  /**
   * Get API key for Azure OpenAI
   * @returns {string} API key
   */
  get api_key() {
    return this.model.data.api_key;
  }

  /**
   * Get the request adapter class
   * @returns {typeof AzureOpenAIEmbeddingRequestAdapter}
   */
  get req_adapter() {
    return AzureOpenAIEmbeddingRequestAdapter;
  }

  /**
   * Get the response adapter class
   * @returns {typeof AzureOpenAIEmbeddingResponseAdapter}
   */
  get res_adapter() {
    return AzureOpenAIEmbeddingResponseAdapter;
  }

  /**
   * Count tokens using character-based estimation
   * @param {string} input - Text to count tokens for
   * @returns {Promise<{tokens: number}>}
   */
  async count_tokens(input) {
    // Load tiktoken for accurate counting if available
    if (!this.tiktoken) {
      try {
        await this.load_tiktoken();
      } catch (e) {
        // Fall back to estimation
        return { tokens: this.estimate_tokens(input) };
      }
    }
    if (this.tiktoken) {
      const tokens = this.tiktoken.encode(input);
      return { tokens: tokens.length };
    }
    return { tokens: this.estimate_tokens(input) };
  }

  /**
   * Prepare input text for embedding
   * @param {string} embed_input - Raw input text
   * @returns {Promise<string|null>} Processed input text
   */
  async prepare_embed_input(embed_input) {
    if (typeof embed_input !== 'string') {
      throw new TypeError('embed_input must be a string');
    }
    if (embed_input.length === 0) return null;

    const { tokens } = await this.count_tokens(embed_input);
    if (tokens <= this.max_tokens) return embed_input;

    return await this.trim_input_to_max_tokens(embed_input, tokens);
  }

  /**
   * Get available models
   * Azure deployments are custom, so we return common embedding models as suggestions
   * @returns {Promise<Object>} Map of model objects
   */
  async get_models() {
    return {
      'text-embedding-ada-002': {
        id: 'text-embedding-ada-002',
        name: 'Ada 002 (1536 dims)',
        dims: 1536,
        max_tokens: 8191,
      },
      'text-embedding-3-small': {
        id: 'text-embedding-3-small',
        name: 'Embedding 3 Small (1536 dims)',
        dims: 1536,
        max_tokens: 8191,
      },
      'text-embedding-3-large': {
        id: 'text-embedding-3-large',
        name: 'Embedding 3 Large (3072 dims)',
        dims: 3072,
        max_tokens: 8191,
      },
    };
  }

  /**
   * Get models as dropdown options
   * @returns {Array<{value: string, name: string}>}
   */
  get_models_as_options() {
    const models = {
      'text-embedding-ada-002': { name: 'Ada 002 (1536 dims)' },
      'text-embedding-3-small': { name: 'Embedding 3 Small (1536 dims)' },
      'text-embedding-3-large': { name: 'Embedding 3 Large (3072 dims)' },
    };
    return Object.entries(models).map(([key, model]) => ({
      value: key,
      name: model.name,
    }));
  }
}

/**
 * Request adapter for Azure OpenAI embedding API
 * @extends SmartEmbedModelRequestAdapter
 */
class AzureOpenAIEmbeddingRequestAdapter extends SmartEmbedModelRequestAdapter {
  /**
   * Prepare headers for Azure OpenAI API
   * Uses api-key header instead of Bearer token
   * @returns {Object} Headers object
   */
  get_headers() {
    return {
      'Content-Type': 'application/json',
      'api-key': this.adapter.api_key,
    };
  }

  /**
   * Prepare request body for Azure OpenAI
   * @returns {Object} Request body
   */
  prepare_request_body() {
    return {
      input: this.embed_inputs,
    };
  }
}

/**
 * Response adapter for Azure OpenAI embedding API
 * @extends SmartEmbedModelResponseAdapter
 */
class AzureOpenAIEmbeddingResponseAdapter extends SmartEmbedModelResponseAdapter {
  /**
   * Parse Azure OpenAI embedding response
   * Response format is OpenAI-compatible:
   * {
   *   data: [{ embedding: number[], index: number }],
   *   usage: { prompt_tokens: number, total_tokens: number }
   * }
   * @returns {Array<{vec: number[], tokens: number|null}>}
   */
  parse_response() {
    const resp = this.response;
    
    if (!resp || !Array.isArray(resp.data)) {
      console.error('[Azure OpenAI] Invalid embedding response:', resp);
      return [];
    }

    let avg_tokens = null;
    if (resp.usage?.total_tokens && resp.data.length > 0) {
      avg_tokens = Math.ceil(resp.usage.total_tokens / resp.data.length);
    }

    return resp.data.map(item => ({
      vec: item.embedding || [],
      tokens: avg_tokens,
    }));
  }
}

export const settings_config = {
  resource_name: {
    name: 'Azure Resource Name',
    type: 'text',
    description: 'Your Azure OpenAI resource name (e.g., "my-openai-resource").',
    placeholder: 'my-openai-resource',
  },
  deployment_name: {
    name: 'Deployment Name',
    type: 'text',
    description: 'The deployment name for your embedding model.',
    placeholder: 'text-embedding-ada-002',
  },
  api_key: {
    name: 'Azure API Key',
    type: 'password',
    description: 'Your Azure OpenAI API key.',
    placeholder: 'Enter your Azure OpenAI API key',
  },
  api_version: {
    name: 'API Version',
    type: 'text',
    description: 'Azure OpenAI API version.',
    default: '2024-02-01',
    placeholder: '2024-02-01',
  },
};

export default {
  class: AzureOpenAIEmbeddingModelAdapter,
  settings_config,
};
