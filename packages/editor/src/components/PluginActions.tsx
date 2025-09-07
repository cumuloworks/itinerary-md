import { type FC, useState } from 'react';
import type { PluginAction } from '../plugins/types';

interface PluginActionsProps {
  actions: PluginAction[];
  className?: string;
}

export const PluginActions: FC<PluginActionsProps> = ({ actions, className = '' }) => {
  const [isExecuting, setIsExecuting] = useState<string | null>(null);

  const handleAction = async (action: PluginAction) => {
    if (!action.enabled || isExecuting) return;
    
    setIsExecuting(action.id);
    try {
      await action.execute();
    } catch (error) {
      console.error(`Error executing action ${action.id}:`, error);
    } finally {
      setIsExecuting(null);
    }
  };

  if (actions.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs text-gray-500">Plugins:</span>
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => handleAction(action)}
          disabled={!action.enabled || isExecuting === action.id}
          className={`
            inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors
            ${action.enabled && isExecuting !== action.id
              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer'
              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            }
          `}
          title={action.label}
        >
          {typeof action.icon === 'string' ? (
            <span className="text-sm">{action.icon}</span>
          ) : (
            action.icon
          )}
          <span>{action.label}</span>
          {isExecuting === action.id && (
            <span className="ml-1">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                  fill="none"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </span>
          )}
        </button>
      ))}
    </div>
  );
};