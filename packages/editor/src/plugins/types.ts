import type { ReactNode } from 'react';

export interface PluginContext {
  /** Current editor content */
  content: string;
  /** Currently selected text in the editor */
  selectedText?: string;
  /** Current cursor position */
  cursorPosition?: { line: number; column: number };
  /** API base URL for making requests */
  apiBaseUrl: string;
  /** Current UI language */
  language: string;
  /** Current timezone */
  timezone: string;
}

export interface PluginAction {
  /** Unique identifier for the action */
  id: string;
  /** Display name for the action */
  label: string;
  /** Icon component or string */
  icon?: ReactNode | string;
  /** Whether the action is currently available */
  enabled: boolean;
  /** Execute the action */
  execute: () => void | Promise<void>;
}

export interface Plugin {
  /** Unique identifier for the plugin */
  id: string;
  /** Display name for the plugin */
  name: string;
  /** Plugin description */
  description?: string;
  /** Plugin version */
  version: string;
  /** Initialize the plugin with context */
  initialize?: (context: PluginContext) => void | Promise<void>;
  /** Get available actions based on current context */
  getActions: (context: PluginContext) => PluginAction[];
  /** Render custom UI component (optional) */
  render?: (context: PluginContext) => ReactNode;
  /** Clean up when plugin is removed */
  destroy?: () => void;
}

export interface PluginManager {
  /** Register a new plugin */
  register(plugin: Plugin): void;
  /** Unregister a plugin */
  unregister(pluginId: string): void;
  /** Get all registered plugins */
  getPlugins(): Plugin[];
  /** Get plugin by ID */
  getPlugin(pluginId: string): Plugin | undefined;
  /** Get all available actions from all plugins */
  getAllActions(context: PluginContext): PluginAction[];
}