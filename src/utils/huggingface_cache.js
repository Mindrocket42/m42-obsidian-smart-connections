/**
 * HuggingFace Cache Detection Utility
 * 
 * Checks if HuggingFace models are available in the local cache (~/.cache/huggingface).
 * This allows users to see which models they've already downloaded and may not need
 * to re-download when switching embedding models.
 * 
 * Note: The transformers.js library used by Smart Connections uses its own browser-based
 * cache (IndexedDB/Cache API), not the ~/.cache/huggingface directory used by Python.
 * This utility is primarily informational - showing users what they have available locally.
 */

import { Platform } from 'obsidian';
import * as path from 'path';
import * as os from 'os';

/**
 * Get the HuggingFace cache directory path
 * @returns {string} Path to HuggingFace cache directory
 */
export function get_huggingface_cache_path() {
  // HuggingFace uses XDG_CACHE_HOME or defaults to ~/.cache
  const cache_home = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
  return path.join(cache_home, 'huggingface', 'hub');
}

/**
 * Convert a HuggingFace model ID to its cache directory name
 * @param {string} model_id - Model ID like "TaylorAI/bge-micro-v2"
 * @returns {string} Cache directory name like "models--TaylorAI--bge-micro-v2"
 */
export function model_id_to_cache_name(model_id) {
  return `models--${model_id.replace('/', '--')}`;
}

/**
 * Check if a specific model exists in the HuggingFace cache
 * Uses Obsidian's adapter for cross-platform compatibility
 * 
 * @param {import('obsidian').App} app - Obsidian app instance
 * @param {string} model_id - Model ID like "TaylorAI/bge-micro-v2"
 * @returns {Promise<boolean>} True if model is cached locally
 */
export async function is_model_cached(app, model_id) {
  // Only works on desktop (not mobile)
  if (Platform.isMobile) {
    return false;
  }
  
  try {
    const cache_path = get_huggingface_cache_path();
    const model_cache_name = model_id_to_cache_name(model_id);
    const model_path = path.join(cache_path, model_cache_name);
    
    // Use Node.js fs module (available in Electron/desktop only)
    const fs = require('fs');
    return fs.existsSync(model_path);
  } catch (e) {
    console.warn('[HuggingFace Cache] Error checking cache:', e);
    return false;
  }
}

/**
 * Get list of all cached HuggingFace models
 * @param {import('obsidian').App} app - Obsidian app instance
 * @returns {Promise<string[]>} Array of model IDs that are cached
 */
export async function get_cached_models(app) {
  if (Platform.isMobile) {
    return [];
  }
  
  try {
    const cache_path = get_huggingface_cache_path();
    const fs = require('fs');
    
    if (!fs.existsSync(cache_path)) {
      return [];
    }
    
    const entries = fs.readdirSync(cache_path, { withFileTypes: true });
    const model_dirs = entries
      .filter(entry => entry.isDirectory() && entry.name.startsWith('models--'))
      .map(entry => {
        // Convert "models--TaylorAI--bge-micro-v2" back to "TaylorAI/bge-micro-v2"
        return entry.name.replace('models--', '').replace('--', '/');
      });
    
    return model_dirs;
  } catch (e) {
    console.warn('[HuggingFace Cache] Error listing cached models:', e);
    return [];
  }
}

/**
 * Enhance model options with cache status indicators
 * @param {Array<{value: string, name: string}>} model_options - Original model options
 * @param {import('obsidian').App} app - Obsidian app instance
 * @returns {Promise<Array<{value: string, name: string}>>} Options with cache indicators
 */
export async function enhance_model_options_with_cache_status(model_options, app) {
  if (Platform.isMobile) {
    return model_options;
  }
  
  const cached_models = await get_cached_models(app);
  const cached_set = new Set(cached_models);
  
  return model_options.map(option => {
    if (cached_set.has(option.value)) {
      return {
        ...option,
        name: `${option.name} (cached locally)`,
      };
    }
    return option;
  });
}

export default {
  get_huggingface_cache_path,
  model_id_to_cache_name,
  is_model_cached,
  get_cached_models,
  enhance_model_options_with_cache_status,
};
