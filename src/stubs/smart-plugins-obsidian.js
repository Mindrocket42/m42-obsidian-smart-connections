/**
 * Stub for smart-plugins-obsidian/utils.js
 * This is a Pro-only module. We provide empty implementations
 * so the plugin loads without the Pro features.
 */

export function get_smart_server_url() {
  return 'https://smart-connections.app';
}

export async function fetch_plugin_zip(repo, token) {
  throw new Error('Pro feature: fetch_plugin_zip requires smart-plugins-obsidian');
}

export async function parse_zip_into_files(zipData) {
  throw new Error('Pro feature: parse_zip_into_files requires smart-plugins-obsidian');
}

export async function write_files_with_adapter(adapter, baseFolder, files) {
  throw new Error('Pro feature: write_files_with_adapter requires smart-plugins-obsidian');
}

export async function enable_plugin(app, pluginId) {
  throw new Error('Pro feature: enable_plugin requires smart-plugins-obsidian');
}

export default {
  get_smart_server_url,
  fetch_plugin_zip,
  parse_zip_into_files,
  write_files_with_adapter,
  enable_plugin,
};
