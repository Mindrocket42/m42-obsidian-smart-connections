/**
 * Patches the provider_options from obsidian-smart-env to enable
 * additional embedding model providers without Pro restriction.
 * 
 * This is called during plugin initialization to modify the options
 * that appear in the "New Model" dropdown menu.
 */

// Import the original provider_options
import { provider_options } from 'obsidian-smart-env/src/utils/smart-models/provider_options.js';

/**
 * Enables additional embedding model providers in the settings UI.
 * Removes the 'disabled' flag and 'PRO:' prefix from specified providers.
 * Also adds new providers that aren't in the original list.
 */
export function patch_embedding_provider_options() {
  const providers_to_enable = ['ollama', 'lm_studio', 'open_router'];
  
  if (provider_options.embedding_models) {
    // Enable existing PRO providers
    provider_options.embedding_models = provider_options.embedding_models.map(option => {
      if (providers_to_enable.includes(option.value)) {
        return {
          ...option,
          label: option.label.replace(/^PRO:\s*/i, ''),
          disabled: false,
        };
      }
      return option;
    });
    
    // Add Azure OpenAI if not present
    const has_azure = provider_options.embedding_models.some(opt => opt.value === 'azure_openai');
    if (!has_azure) {
      provider_options.embedding_models.push({
        label: 'Azure OpenAI (cloud)',
        value: 'azure_openai',
        disabled: false,
      });
    }
  }
  
  return provider_options;
}

export { provider_options };
