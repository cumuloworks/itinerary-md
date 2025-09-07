import type { Plugin, PluginContext, PluginAction, PluginManager as IPluginManager } from './types';

export class PluginManager implements IPluginManager {
  private plugins: Map<string, Plugin> = new Map();

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin with ID "${plugin.id}" is already registered`);
      return;
    }
    this.plugins.set(plugin.id, plugin);
    console.log(`Plugin "${plugin.name}" (${plugin.id}) registered`);
  }

  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      if (plugin.destroy) {
        plugin.destroy();
      }
      this.plugins.delete(pluginId);
      console.log(`Plugin "${plugin.name}" (${pluginId}) unregistered`);
    }
  }

  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  getAllActions(context: PluginContext): PluginAction[] {
    const actions: PluginAction[] = [];
    for (const plugin of this.plugins.values()) {
      try {
        const pluginActions = plugin.getActions(context);
        actions.push(...pluginActions);
      } catch (error) {
        console.error(`Error getting actions from plugin "${plugin.id}":`, error);
      }
    }
    return actions;
  }

  async initializeAll(context: PluginContext): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.initialize) {
        try {
          await plugin.initialize(context);
          console.log(`Plugin "${plugin.name}" initialized`);
        } catch (error) {
          console.error(`Error initializing plugin "${plugin.id}":`, error);
        }
      }
    }
  }
}

// Create a singleton instance
export const pluginManager = new PluginManager();