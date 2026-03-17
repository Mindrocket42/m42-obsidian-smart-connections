import { SmartPluginSettingsTab } from "obsidian-smart-env";
import {render_settings_config} from "obsidian-smart-env/src/utils/render_settings_config.js";
import Obsidian from 'obsidian';

const { Notice, Setting } = Obsidian;

export class ScEarlySettingsTab extends SmartPluginSettingsTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  hide(){
    super.hide?.();
    this.plugin_container?.empty?.();
    this.turn_off_listener?.();
  }

  async render_header(container) {
    const header = await this.env.smart_components.render_component('connections_settings_header', this.plugin);
    container.appendChild(header);
  }

  async render_plugin_settings(container) {
    if (!container) return;
    container.empty?.();
    container.innerHTML = '<div class="sc-loading">Loading main settings...</div>';

    container.empty?.();

    const cl_container = container.createDiv({
      cls: 'sc-settings-tab__section',
      attr: { 'data-section-key': 'connections_lists' },
    });
    cl_container.createEl('h1', { text: 'Connections' });
    
    const connections_lists_settings_config = this.env.config.collections.connections_lists.settings_config;
    // const connections_lists_settings = await smart_view.render_settings(connections_lists_settings_config, { scope: this.env.connections_lists });
    // if (connections_lists_settings) cl_container.appendChild(connections_lists_settings);
    render_settings_config(
      connections_lists_settings_config,
      this.env.connections_lists,
      cl_container,
      {
        default_group_name: 'Connections lists',
        group_params: {
          'Connections lists': {
            heading_btn: [
              {
                label: 'Learn about Connections Lists',
                btn_text: 'Learn more',
                callback: () => window.open('https://smartconnections.app/smart-connections/list-feature/?utm_source=connections-settings-tab', '_external'),
              },
              {
                label: 'Settings documentation for Connections Lists',
                btn_icon: 'help-circle',
                callback: () => window.open('https://smartconnections.app/smart-connections/settings/?utm_source=connections-settings-tab#connections-lists', '_external'),
              },
            ],
            order: 1,
          },
          'Display': {
            heading_btn: {
              label: 'Settings documentation for Display',
              btn_icon: 'help-circle',
              callback: () => window.open('https://smartconnections.app/smart-connections/settings/?utm_source=connections-settings-tab#display', '_external'),
            },
            order: 2,
          },
          'Connections list item': {
            heading_btn: {
              label: 'Settings documentation for Connections List Items',
              btn_icon: 'help-circle',
              callback: () => window.open('https://smartconnections.app/smart-connections/settings/?utm_source=connections-settings-tab#connections-list-item', '_external'),
            },
            order: 3,
          },
          'Score algorithm': {
            heading_btn: {
              label: 'Settings documentation for Score Algorithms',
              btn_icon: 'help-circle',
              callback: () => window.open('https://smartconnections.app/smart-connections/settings/?utm_source=connections-settings-tab#score-algorithm', '_external'),
            },
            order: 4,
          },
          'Ranking algorithm': {
            heading_btn: {
              label: 'Settings documentation for Ranking Algorithms',
              btn_icon: 'help-circle',
              callback: () => window.open('https://smartconnections.app/smart-connections/settings/?utm_source=connections-settings-tab#ranking-algorithm', '_external'),
            },
            order: 5,
          },
          'Connections filters': {
            heading_btn: {
              label: 'Settings documentation for Filters',
              btn_icon: 'help-circle',
              callback: () => window.open('https://smartconnections.app/smart-connections/settings/?utm_source=connections-settings-tab#filters', '_external'),
            },
            order: 6,
          },
          'Inline connections': {
            heading_btn: [
              {
                label: 'Learn about the inline connections feature',
                btn_text: 'Learn more',
                callback: () => window.open('https://smartconnections.app/smart-connections/inline/?utm_source=connections-settings-tab', '_external'),
              },
              {
                label: 'Settings documentation for inline connections',
                btn_icon: 'help-circle',
                callback: () => window.open('https://smartconnections.app/smart-connections/settings/?utm_source=connections-settings-tab#inline-connections', '_external'),
              },
            ],
            order: 7,
          },
          'Footer connections': {
            heading_btn: {
              label: 'Settings documentation for Footer Connections',
              btn_icon: 'help-circle',
              callback: () => window.open('https://smartconnections.app/smart-connections/settings/?utm_source=connections-settings-tab#footer-connections', '_external'),
            },
            order: 8,
          },
        }
      }
    );

    const ll_container = container.createDiv({
      cls: 'sc-settings-tab__section',
      attr: { 'data-section-key': 'lookup_lists' },
    });
    // ll_container.createEl('h1', { text: 'Lookup' });

    const lookup_lists_settings_config = this.env.config.collections.lookup_lists.settings_config;
    // const lookup_lists_settings = await smart_view.render_settings(lookup_lists_settings_config, { scope: this.env.lookup_lists });
    // if (lookup_lists_settings) ll_container.appendChild(lookup_lists_settings);
    render_settings_config(
      lookup_lists_settings_config,
      this.env.lookup_lists,
      ll_container,
      {
        default_group_name: 'Lookup lists',
        group_params: {
          'Lookup lists': {
            heading_btn: [
              {
                label: 'Learn about Lookup Lists',
                btn_text: 'Learn more',
                callback: () => window.open('https://smartconnections.app/smart-connections/lookup/?utm_source=connections-settings-tab', '_external'),
              },
              {
                label: 'Settings documentation for Lookup Lists',
                btn_icon: 'help-circle',
                callback: () => window.open('https://smartconnections.app/smart-connections/settings/?utm_source=connections-settings-tab#lookup-lists', '_external'),
              }
            ]
          },
        }
      }
    );

    this.render_sync_settings(container);

    this.register_env_events();
  }

  render_sync_settings(container) {
    if (!container) return;
    const sync_container = container.createDiv({
      cls: 'sc-settings-tab__section',
      attr: { 'data-section-key': 'sync' },
    });
    sync_container.createEl('h1', { text: 'Sync behavior' });
    const stale_hours = Number(this.plugin.sync_settings.stale_hours) || 48;
    const last_sync_at = Number(this.plugin.sync_settings.last_sync_at) || 0;
    const last_sync_text = last_sync_at ? new Date(last_sync_at).toLocaleString() : 'not yet';
    sync_container.createEl('p', {
      text: `Mode: ${this.plugin.sync_mode}. Live watchers: ${this.plugin.sync_mode === 'realtime' ? 'on' : 'off'}. Last sync: ${last_sync_text}. Threshold: ${stale_hours}h.`,
      cls: 'setting-item-description',
    });

    new Setting(sync_container)
      .setName('Sync mode')
      .setDesc('Choose between realtime updates, launch-based stale checks, or command-only sync.')
      .addDropdown((dropdown) => {
        dropdown
          .addOption('realtime', 'Realtime (watch changes)')
          .addOption('hybrid', 'Hybrid (check stale on launch)')
          .addOption('manual', 'Manual (command only)')
          .setValue(this.plugin.sync_mode)
          .onChange(async (value) => {
            await this.plugin.update_sync_settings({ mode: value });
            new Notice('Sync mode saved. Restart plugin to apply startup/watcher behavior changes.');
            await this.render_plugin_settings(this.plugin_container);
          });
      })
    ;

    new Setting(sync_container)
      .setName('Stale threshold (hours)')
      .setDesc('Hybrid mode launches a catch-up sync when the last completed sync is older than this value.')
      .addText((text) => {
        text
          .setPlaceholder('48')
          .setValue(String(this.plugin.sync_settings.stale_hours || 48))
          .onChange(async (value) => {
            const parsed = Number(value);
            if (!Number.isFinite(parsed) || parsed <= 0) return;
            await this.plugin.update_sync_settings({ stale_hours: parsed });
          });
      })
    ;

    new Setting(sync_container)
      .setName('Run stale check at launch')
      .setDesc('When enabled, Hybrid mode runs one catch-up sync at startup if stale.')
      .addToggle((toggle) => {
        toggle
          .setValue(!!this.plugin.sync_settings.run_stale_check_at_launch)
          .onChange(async (value) => {
            await this.plugin.update_sync_settings({ run_stale_check_at_launch: value });
          });
      })
    ;

    new Setting(sync_container)
      .setName('Sync now')
      .setDesc('Scan for changed sources and update embeddings now.')
      .addButton((button) => {
        button
          .setButtonText('Run incremental sync')
          .onClick(async () => {
            button.setDisabled(true);
            try {
              await this.plugin.run_incremental_sync({ reason: 'manual' });
            } finally {
              button.setDisabled(false);
            }
          });
      })
      .addExtraButton((button) => {
        button
          .setIcon('refresh-cw')
          .setTooltip('Refresh settings display')
          .onClick(() => {
            this.render_plugin_settings(this.plugin_container);
          });
      })
    ;

    new Setting(sync_container)
      .setName('Full reindex and re-embed')
      .setDesc('Clears source data and rebuilds embeddings for all included notes. Resource-intensive.')
      .addButton((button) => {
        button
          .setWarning()
          .setButtonText('Run full rebuild')
          .onClick(async () => {
            button.setDisabled(true);
            try {
              await this.plugin.run_full_reindex();
            } finally {
              button.setDisabled(false);
            }
          });
      })
    ;
  }

  register_env_events() {
    if (this.turn_off_listener || !this.env?.events) return;
    this.turn_off_listener = this.env.events.on('settings:changed', (event) => {
      if (event.path?.includes('connections_post_process')
        || event.path?.includes('score_algo_key')
        || event.path?.includes('connections_list_item')
        || event.path?.includes('sync_settings')
      ) {
        this.render_plugin_settings(this.plugin_container);
      }
    });
  }
}
