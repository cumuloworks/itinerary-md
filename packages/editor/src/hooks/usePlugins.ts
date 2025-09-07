import { useEffect, useMemo, useState, useCallback } from 'react';
import type { Plugin, PluginContext, PluginAction } from '../plugins/types';
import { pluginManager } from '../plugins/PluginManager';
import { mapPlugin } from '../plugins/MapPlugin';
import { weatherPlugin } from '../plugins/WeatherPlugin';

interface UsePluginsOptions {
  content: string;
  selectedText?: string;
  cursorPosition?: { line: number; column: number };
  language: string;
  timezone: string;
  apiBaseUrl?: string;
}

export function usePlugins(options: UsePluginsOptions) {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [initialized, setInitialized] = useState(false);

  const context: PluginContext = useMemo(() => ({
    content: options.content,
    selectedText: options.selectedText,
    cursorPosition: options.cursorPosition,
    apiBaseUrl: options.apiBaseUrl || window.location.origin,
    language: options.language,
    timezone: options.timezone,
  }), [
    options.content,
    options.selectedText,
    options.cursorPosition,
    options.apiBaseUrl,
    options.language,
    options.timezone,
  ]);

  // Initialize plugins on mount
  useEffect(() => {
    if (!initialized) {
      // Register default plugins
      pluginManager.register(mapPlugin);
      pluginManager.register(weatherPlugin);
      
      // Initialize all plugins
      pluginManager.initializeAll(context).then(() => {
        setPlugins(pluginManager.getPlugins());
        setInitialized(true);
      });
    }
  }, [initialized, context]);

  // Get all available actions
  const actions = useMemo(() => {
    if (!initialized) return [];
    return pluginManager.getAllActions(context);
  }, [initialized, context]);

  // Register a new plugin
  const registerPlugin = useCallback((plugin: Plugin) => {
    pluginManager.register(plugin);
    plugin.initialize?.(context);
    setPlugins(pluginManager.getPlugins());
  }, [context]);

  // Unregister a plugin
  const unregisterPlugin = useCallback((pluginId: string) => {
    pluginManager.unregister(pluginId);
    setPlugins(pluginManager.getPlugins());
  }, []);

  return {
    plugins,
    actions,
    registerPlugin,
    unregisterPlugin,
  };
}