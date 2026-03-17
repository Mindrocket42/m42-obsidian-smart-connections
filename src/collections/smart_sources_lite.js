import { SmartSource, SmartSources } from 'smart-sources';

export class SmartSourcesLite extends SmartSources {
  async init_items() {
    if (this.opts?.defer_initial_scan) {
      this.emit_event('source:initial_scan_skipped', {
        reason: 'deferred_sync_mode',
      });
      return;
    }
    return super.init_items();
  }

  register_source_watchers() {
    if (this.opts?.disable_source_watchers) {
      this._source_watchers_registered = false;
      return false;
    }
    return super.register_source_watchers();
  }

  async process_load_queue() {
    await super.process_load_queue();
    if (this.opts?.prevent_import_on_load) {
      this.refresh_import_queue_for_outdated_sources();
    }
  }

  refresh_import_queue_for_outdated_sources(opts = {}) {
    const { force = false } = opts;
    for (const source of Object.values(this.items || {})) {
      if (!source) continue;
      if (force) {
        source.queue_import();
        continue;
      }
      let should_import = false;
      try {
        should_import = !source.data?.last_import || !!source.source_adapter?.outdated;
      } catch (_error) {
        should_import = true;
      }
      source._queue_import = should_import;
    }
  }
}

export default {
  class: SmartSourcesLite,
  collection_key: 'smart_sources',
  item_type: SmartSource,
};
