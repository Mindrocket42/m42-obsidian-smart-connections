import Obsidian from "obsidian";
const {
  Notice,
  Plugin,
  requestUrl,
  Platform,
} = Obsidian;

import { SmartEnv } from 'obsidian-smart-env';
import { SmartSource } from 'smart-sources';
import { smart_env_config } from "../smart_env.config.js";
import { open_note } from "obsidian-smart-env/utils/open_note.js";

import { ScEarlySettingsTab } from "./views/settings_tab.js";

import { ReleaseNotesView }    from "./views/release_notes_view.js";

import { StoryModal } from 'obsidian-smart-env/src/modals/story.js';
import { get_random_connection } from "./utils/get_random_connection.js";
import { add_smart_dice_icon } from "./utils/add_icons.js";
import { should_relocate_leaf } from "./utils/view_leaf_location.js";

// v4
import { SmartPlugin } from "obsidian-smart-env/smart_plugin.js";
import { ConnectionsItemView } from "./views/connections_item_view.js";
import { LookupItemView } from "./views/lookup_item_view.js";
import { register_smart_connections_codeblock } from "./views/connections_codeblock.js";
import { build_connections_codeblock } from "./utils/build_connections_codeblock.js";

// Extended embedding model providers (Ollama, LM Studio, OpenRouter)
import embedding_models from "./collections/embedding_models.js";
import { patch_embedding_provider_options } from "./utils/patch_provider_options.js";
import smart_sources_lite from './collections/smart_sources_lite.js';

const DEFAULT_SYNC_SETTINGS = {
  mode: 'hybrid',
  stale_hours: 48,
  run_stale_check_at_launch: true,
  last_sync_at: 0,
};

const SYNC_MODE_LABELS = {
  realtime: 'Realtime',
  hybrid: 'Hybrid',
  manual: 'Manual',
};

const SYNC_STATUS_REFRESH_MS = 60 * 1000;

// Patch provider options to enable additional embedding providers
patch_embedding_provider_options();

export default class SmartConnectionsPlugin extends SmartPlugin {
  SmartEnv = SmartEnv;
  ReleaseNotesView = ReleaseNotesView;
  get smart_env_config() {
    if(!this._smart_env_config){
      this._smart_env_config = smart_env_config;
      // Add extended embedding model providers (Ollama, LM Studio, OpenRouter)
      if (!this._smart_env_config.collections) {
        this._smart_env_config.collections = {};
      }
      this._smart_env_config.collections.embedding_models = embedding_models;
      const smart_sources_lite_config = this._smart_env_config.collections.smart_sources_lite;
      const smart_sources_config = this._smart_env_config.collections.smart_sources || smart_sources_lite_config;
      const smart_sources_overrides = {
        class: smart_sources_lite.class,
        item_type: smart_sources_config?.item_type || smart_sources_lite_config?.item_type || SmartSource,
        prevent_import_on_load: this.should_defer_sync_on_startup,
        disable_source_watchers: this.should_disable_live_watchers,
        defer_initial_scan: this.should_defer_initial_scan,
      };
      delete this._smart_env_config.collections.smart_sources_lite;
      if (smart_sources_config && typeof smart_sources_config === 'object') {
        this._smart_env_config.collections.smart_sources = {
          ...smart_sources_config,
          ...smart_sources_overrides,
        };
      } else {
        this._smart_env_config.collections.smart_sources = {
          ...smart_sources_overrides,
        };
      }
    }
    return this._smart_env_config;
  }
  ConnectionsSettingsTab = ScEarlySettingsTab;

  get item_views() {
    return {
      ConnectionsItemView,
      LookupItemView,
      ReleaseNotesView: this.ReleaseNotesView,
    };
  }

  // GETTERS
  get obsidian() { return Obsidian; }
  get api() { return this._api; }
  async onload() {
    await this.load_sync_settings();
    this.init_sync_status_bar();
    this.log_sync('Plugin load', this.get_sync_status_snapshot());
    this.app.workspace.onLayoutReady(this.initialize.bind(this)); // initialize when layout is ready
    // this.SmartEnv.create(this); // IMPORTANT: works on mobile without this.smart_env_config as second arg (appears to be fixed 2025-12-03)
    this.SmartEnv.create(this, this.smart_env_config);
    // SmartChatView.register_view(this);
    this.addSettingTab(new this.ConnectionsSettingsTab(this.app, this)); // add settings tab
    add_smart_dice_icon();
    this.register_commands(); // from SmartPlugin
    this.register_item_views(); // from SmartPlugin
    this.register_ribbon_icons(); // from SmartPlugin
    // this.register_views(); // replace with register_item_views from SmartPlugin
  }
  // async onload() { this.app.workspace.onLayoutReady(this.initialize.bind(this)); } // initialize when layout is ready
  onunload() {
    console.log("Unloading Smart Connections plugin");
    if (this._sync_status_interval) clearInterval(this._sync_status_interval);
    this._sync_status_interval = null;
    this._sync_status_bar?.remove?.();
    this._sync_status_bar = null;
    this.notices?.unload();
    this.env?.unload_main?.(this);
  }

  async initialize() {
    this.smart_connections_view = null;
    this.is_new_user().then(async (is_new) => {
      if (!is_new) return;
      setTimeout(() => {
        StoryModal.open(this, {
          title: 'Getting Started With Smart Connections',
          url: 'https://smartconnections.app/story/smart-connections-getting-started/?utm_source=sc-op-new-user',
        });
      }, 1000);
      await this.SmartEnv.wait_for({ loaded: true });
      setTimeout(() => {
        this.apply_connections_view_location();
        this.open_connections_view();
      }, 1000);
      this.add_to_gitignore("\n\n# Ignore Smart Environment folder\n.smart-env");
    });
    await this.SmartEnv.wait_for({ loaded: true });
    this.wrap_connections_view_open();
    this.apply_connections_view_location();
    this.register_connections_view_location_listener();
    register_smart_connections_codeblock(this);
    await this.check_for_updates();
    this.show_sync_mode_notice();
    if (this.should_run_launch_sync()) {
      this.run_incremental_sync({ reason: 'launch' })
        .catch((error) => console.error('Smart Connections: launch sync failed', error));
    }
  }

  show_sync_mode_notice() {
    if (this.sync_mode === 'realtime') return;
    if (this._sync_mode_notice_shown) return;
    this._sync_mode_notice_shown = true;
    const mode_label = SYNC_MODE_LABELS[this.sync_mode] || this.sync_mode;
    const stale_hours = Number(this.sync_settings.stale_hours) || DEFAULT_SYNC_SETTINGS.stale_hours;
    new Notice(
      `Smart Connections ${mode_label} mode active. Live watchers disabled. Auto-sync runs after ${stale_hours}h staleness, or run \"Sync: Smart Connections now\".`,
      9000,
    );
  }

  log_sync(message, data = {}) {
    console.log('[Smart Connections Sync]', message, data);
  }

  get_sync_status_snapshot() {
    const stale_hours = Number(this.sync_settings.stale_hours) || DEFAULT_SYNC_SETTINGS.stale_hours;
    const last_sync_at = Number(this.sync_settings.last_sync_at) || 0;
    const stale = this.is_sync_stale();
    return {
      mode: this.sync_mode,
      mode_label: SYNC_MODE_LABELS[this.sync_mode] || this.sync_mode,
      stale_hours,
      last_sync_at,
      stale,
      watchers_enabled: !this.should_disable_live_watchers,
    };
  }

  format_sync_status_line() {
    const snapshot = this.get_sync_status_snapshot();
    const last_sync_text = snapshot.last_sync_at
      ? new Date(snapshot.last_sync_at).toLocaleString()
      : 'never'
    ;
    const stale_text = snapshot.stale ? 'stale' : 'fresh';
    return `${snapshot.mode_label} | ${stale_text} | ${last_sync_text}`;
  }

  init_sync_status_bar() {
    if (this._sync_status_bar) return;
    this._sync_status_bar = this.addStatusBarItem();
    this._sync_status_bar.addClass('sc-sync-status');
    this.update_sync_status_bar();
    if (this._sync_status_interval) clearInterval(this._sync_status_interval);
    this._sync_status_interval = setInterval(() => {
      this.update_sync_status_bar();
    }, SYNC_STATUS_REFRESH_MS);
  }

  update_sync_status_bar() {
    if (!this._sync_status_bar) return;
    this._sync_status_bar.setText(`SC Sync: ${this.format_sync_status_line()}`);
  }

  show_sync_status_notice() {
    const snapshot = this.get_sync_status_snapshot();
    const last_sync_text = snapshot.last_sync_at
      ? new Date(snapshot.last_sync_at).toLocaleString()
      : 'never'
    ;
    new Notice(
      `Smart Connections sync status -> mode: ${snapshot.mode_label}, watchers: ${snapshot.watchers_enabled ? 'on' : 'off'}, stale: ${snapshot.stale ? 'yes' : 'no'}, last sync: ${last_sync_text}, threshold: ${snapshot.stale_hours}h`,
      10000,
    );
    this.log_sync('Status requested', snapshot);
  }

  /**
   * Initialize ribbon icons with default visibility.
   */

  get ribbon_icons () {
    return {
      connections: {
        icon_name: "smart-connections",
        description: "Smart Connections: Open connections view",
        callback: () => { this.open_connections_view(); }
      },
      lookup: {
        icon_name: "smart-lookup",
        description: "Smart Lookup: Open lookup view",
        callback: () => { this.open_lookup_view(); }
      },
      random_note: {
        icon_name: "smart-dice",
        description: "Smart Connections: Open random connection",
        callback: () => { this.open_random_connection(); }
      }
    }
  }

  get settings() { return this.env?.settings || {}; }

  get sync_settings() {
    if (!this._sync_settings) {
      this._sync_settings = { ...DEFAULT_SYNC_SETTINGS };
    }
    return this._sync_settings;
  }

  get sync_mode() {
    return this.sync_settings.mode || DEFAULT_SYNC_SETTINGS.mode;
  }

  get should_disable_live_watchers() {
    return this.sync_mode !== 'realtime';
  }

  get should_defer_sync_on_startup() {
    return this.sync_mode !== 'realtime';
  }

  get should_defer_initial_scan() {
    return this.sync_mode !== 'realtime';
  }

  async load_sync_settings() {
    const data = await this.loadData() || {};
    const saved_sync_settings = data.sync_settings || {};
    const stale_hours_num = Number(saved_sync_settings.stale_hours);
    const last_sync_at_num = Number(saved_sync_settings.last_sync_at);
    const has_saved_last_sync = Number.isFinite(last_sync_at_num) && last_sync_at_num > 0;
    this._sync_settings = {
      ...DEFAULT_SYNC_SETTINGS,
      ...saved_sync_settings,
      stale_hours: Number.isFinite(stale_hours_num) && stale_hours_num > 0
        ? stale_hours_num
        : DEFAULT_SYNC_SETTINGS.stale_hours,
    };
    if (!['realtime', 'hybrid', 'manual'].includes(this._sync_settings.mode)) {
      this._sync_settings.mode = DEFAULT_SYNC_SETTINGS.mode;
    }
    if (!has_saved_last_sync) {
      this._sync_settings.last_sync_at = Date.now();
      data.sync_settings = this._sync_settings;
      await this.saveData(data);
    }
    return this._sync_settings;
  }

  async update_sync_settings(next_settings = {}) {
    this._sync_settings = {
      ...this.sync_settings,
      ...next_settings,
    };
    const stale_hours_num = Number(this._sync_settings.stale_hours);
    this._sync_settings.stale_hours = Number.isFinite(stale_hours_num) && stale_hours_num > 0
      ? stale_hours_num
      : DEFAULT_SYNC_SETTINGS.stale_hours;
    const data = await this.loadData() || {};
    data.sync_settings = this._sync_settings;
    await this.saveData(data);
    this.update_sync_status_bar();
    this.log_sync('Settings updated', this.get_sync_status_snapshot());
    this.env?.events?.emit?.('settings:changed', { path: 'sync_settings' });
    return this._sync_settings;
  }

  is_sync_stale() {
    const stale_hours = Number(this.sync_settings.stale_hours) || DEFAULT_SYNC_SETTINGS.stale_hours;
    const stale_ms = stale_hours * 60 * 60 * 1000;
    const last_sync_at = Number(this.sync_settings.last_sync_at) || 0;
    if (!last_sync_at) return true;
    return (Date.now() - last_sync_at) >= stale_ms;
  }

  should_run_launch_sync() {
    if (this.sync_mode !== 'hybrid') return false;
    if (!this.sync_settings.run_stale_check_at_launch) return false;
    return this.is_sync_stale();
  }

  /**
   * Sync connections view location with settings.
   * @returns {void}
   */
  apply_connections_view_location() {
    const connections_view_location = this.env?.connections_lists?.settings?.connections_view_location ?? 'right';
    ConnectionsItemView.default_open_location = connections_view_location === 'left' ? 'left' : 'right';
    this.ensure_connections_view_leaf_location();
  }

  wrap_connections_view_open() {
    if (this._open_connections_view_base || typeof this.open_connections_view !== 'function') {
      return;
    }
    this._open_connections_view_base = this.open_connections_view.bind(this); // added on register by SmartItemView
    this.open_connections_view = (...args) => {
      this.ensure_connections_view_leaf_location();
      return this._open_connections_view_base(...args);
    };
  }

  ensure_connections_view_leaf_location() {
    const workspace = this.app?.workspace;
    if (!workspace) {
      return;
    }
    const desired_location = ConnectionsItemView.default_open_location;
    const connections_leaf = ConnectionsItemView.get_leaf(workspace);
    if (!should_relocate_leaf({ workspace, leaf: connections_leaf, desired_location })) {
      return;
    }
    connections_leaf.detach();
  }

  register_connections_view_location_listener() {
    if (this.connections_view_location_listener || !this.env?.events) return;
    this.connections_view_location_listener = this.env.events.on('settings:changed', (event) => {
      if (!event?.path?.includes?.('connections_view_location')) return;
      this.apply_connections_view_location();
    });
  }

  async refresh_sources_index(opts = {}) {
    const { force = false } = opts;
    const sources = this.env?.smart_sources;
    if (!sources) return 0;
    this.log_sync('Starting source refresh', { force });

    await this.env.fs.refresh();
    await sources.init_fs();
    const source_paths = sources.fs?.file_paths || [];
    for (const file_path of source_paths) {
      sources.init_file_path(file_path);
    }

    if (typeof sources.refresh_import_queue_for_outdated_sources === 'function') {
      sources.refresh_import_queue_for_outdated_sources({ force });
    } else if (force) {
      Object.values(sources.items || {}).forEach((source) => source.queue_import?.());
    }

    const import_queue_size = Object.values(sources.items || {})
      .filter((source) => source?._queue_import)
      .length;
    await sources.process_source_import_queue({ process_embed_queue: true, force });
    await this.update_sync_settings({ last_sync_at: Date.now() });
    this.update_sync_status_bar();
    this.log_sync('Source refresh complete', { force, import_queue_size });
    return import_queue_size;
  }

  async run_incremental_sync(opts = {}) {
    const { reason = 'manual' } = opts;
    await this.SmartEnv.wait_for({ loaded: true });
    if (this._sync_in_progress) return this._sync_in_progress;
    this.log_sync('Incremental sync requested', { reason });

    this._sync_in_progress = (async () => {
      const queue_size = await this.refresh_sources_index({ force: false });
      if (reason === 'manual') {
        new Notice(`Smart Connections sync complete (${queue_size} queued source${queue_size === 1 ? '' : 's'}).`);
      }
      this.update_sync_status_bar();
      this.log_sync('Incremental sync complete', { reason, queue_size });
      return queue_size;
    })();

    try {
      return await this._sync_in_progress;
    } finally {
      this._sync_in_progress = null;
    }
  }

  async run_full_reindex() {
    await this.SmartEnv.wait_for({ loaded: true });
    if (this._sync_in_progress) return this._sync_in_progress;
    this.log_sync('Full reindex requested');

    this._sync_in_progress = (async () => {
      const sources = this.env?.smart_sources;
      if (!sources) return 0;
      await sources.run_clear_all();
      await this.update_sync_settings({ last_sync_at: Date.now() });
      new Notice('Smart Connections full reindex complete.');
      this.update_sync_status_bar();
      this.log_sync('Full reindex complete', { sources_count: Object.keys(sources.items || {}).length });
      return Object.keys(sources.items || {}).length;
    })();

    try {
      return await this._sync_in_progress;
    } finally {
      this._sync_in_progress = null;
    }
  }

  async check_for_updates() {
    if (await this.is_new_plugin_version(this.manifest.version)) {
      console.log("opening release notes modal");
      try {
        this.ReleaseNotesView.open(this.app.workspace, this.manifest.version);
      } catch (e) {
        console.error('Failed to open ReleaseNotesView', e);
      }
      await this.set_last_known_version(this.manifest.version);
    }
    setTimeout(this.check_for_update.bind(this), 3000);
    setInterval(this.check_for_update.bind(this), 10800000);
  }

  async check_for_update() {
    try {
      const {json: response} = await requestUrl({
        url: "https://api.github.com/repos/brianpetro/obsidian-smart-connections/releases/latest",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        contentType: "application/json",
      });
      const latest_release = response.tag_name;
      if(latest_release !== this.manifest.version) {
        this.env?.events?.emit('plugin:new_version_available', { version: latest_release });
        this.notices?.show('new_version_available', {version: latest_release});
        this.update_available = true;
      }
    } catch (error) {
      console.error(error);
    }
  }


  async restart_plugin() {
    this.env?.unload_main?.(this);
    await new Promise(r => setTimeout(r, 3000));
    window.restart_plugin = async (id) => {
      await window.app.plugins.disablePlugin(id);
      await window.app.plugins.enablePlugin(id);
    };
    await window.restart_plugin(this.manifest.id);
  }

  get commands() {
    return {
      ...super.commands,
      random_connection: {
        id: "smart-connections-random",
        name: "Open: Random note from connections",
        callback: async () => {
          await this.open_random_connection();
        }
      },
      getting_started: {
        id: "smart-connections-getting-started",
        name: "Show: Getting started slideshow",
        callback: () => {
          StoryModal.open(this, {
            title: 'Getting Started With Smart Connections',
            url: 'https://smartconnections.app/story/smart-connections-getting-started/?utm_source=sc-op-command',
          });
        }
      },
      insert_connections_codeblock: {
        id: 'insert-connections-codeblock',
        name: 'Insert: Connections codeblock',
        editorCallback: (editor) => {
          editor.replaceSelection(build_connections_codeblock());
        }
      },
      sync_now: {
        id: 'smart-connections-sync-now',
        name: 'Sync: Smart Connections now',
        callback: async () => {
          await this.run_incremental_sync({ reason: 'manual' });
        }
      },
      sync_full_reindex: {
        id: 'smart-connections-sync-full-reindex',
        name: 'Sync: Full reindex and re-embed',
        callback: async () => {
          await this.run_full_reindex();
        }
      },
      show_sync_status: {
        id: 'smart-connections-show-sync-status',
        name: 'Show: Smart Connections sync status',
        callback: async () => {
          this.show_sync_status_notice();
        }
      },
    };
  }

  show_release_notes() {
    return this.ReleaseNotesView.open(this.app.workspace, this.manifest.version);
  }

  async open_random_connection() {
    const curr_file = this.app.workspace.getActiveFile();
    if (!curr_file) {
      new Notice('No active file to find connections for');
      return;
    }
    const rand_entity = await get_random_connection(this.env, curr_file.path);
    if (!rand_entity) {
      new Notice('Cannot open random connection for non-embedded source: ' + curr_file.path);
      return;
    }
    this.open_note(rand_entity.item.path);
    this.env?.events?.emit?.('connections:open_random');
  }

  async open_note(target_path, event=null) { await open_note(this, target_path, event); }

  /**
   * @deprecated extract into utility
   */
  async add_to_gitignore(ignore, message=null) {
    if(!(await this.app.vault.adapter.exists(".gitignore"))) return;
    let gitignore_file = await this.app.vault.adapter.read(".gitignore");
    if (gitignore_file.indexOf(ignore) < 0) {
      await this.app.vault.adapter.append(".gitignore", `\n\n${message ? "# " + message + "\n" : ""}${ignore}`);
      console.log("Added to .gitignore: " + ignore);
    }
  }

}
