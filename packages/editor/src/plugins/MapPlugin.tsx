import { useState } from 'react';
import type { Plugin, PluginContext } from './types';
import { notifyError, notifySuccess } from '../core/errors';

interface GeocodeResult {
  display_name: string;
  lat: number;
  lon: number;
  type: string;
  importance: number;
}

export class MapPlugin implements Plugin {
  id = 'map-plugin';
  name = 'Map Plugin';
  description = 'Show locations on a map using geocoding';
  version = '1.0.0';

  private apiBaseUrl = '';

  initialize(context: PluginContext): void {
    this.apiBaseUrl = context.apiBaseUrl;
  }

  getActions(context: PluginContext) {
    const hasSelection = !!context.selectedText?.trim();
    
    return [
      {
        id: 'geocode-location',
        label: context.language === 'ja' ? '地図で表示' : 'Show on Map',
        icon: '🗺️',
        enabled: hasSelection,
        execute: async () => {
          if (!context.selectedText) return;
          
          try {
            const response = await fetch(`${this.apiBaseUrl}/api/geocode?q=${encodeURIComponent(context.selectedText)}`);
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
              const result = data.results[0];
              this.showMapModal(result, context.selectedText);
              notifySuccess(`Found location: ${result.display_name}`);
            } else {
              notifyError('Location not found');
            }
          } catch (error) {
            console.error('Geocoding error:', error);
            notifyError('Failed to geocode location');
          }
        },
      },
    ];
  }

  private showMapModal(location: GeocodeResult, query: string): void {
    // Create a modal to show the map
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    
    const content = document.createElement('div');
    content.className = 'bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto';
    
    content.innerHTML = `
      <div class="mb-4">
        <h2 class="text-xl font-bold mb-2">${query}</h2>
        <p class="text-gray-600 text-sm mb-4">${location.display_name}</p>
        <div class="grid grid-cols-2 gap-2 text-sm mb-4">
          <div><strong>Latitude:</strong> ${location.lat.toFixed(6)}</div>
          <div><strong>Longitude:</strong> ${location.lon.toFixed(6)}</div>
        </div>
      </div>
      <div class="relative">
        <iframe
          width="100%"
          height="400"
          frameborder="0"
          scrolling="no"
          marginheight="0"
          marginwidth="0"
          src="https://www.openstreetmap.org/export/embed.html?bbox=${location.lon - 0.01},${location.lat - 0.01},${location.lon + 0.01},${location.lat + 0.01}&layer=mapnik&marker=${location.lat},${location.lon}"
          style="border: 1px solid #ccc; border-radius: 4px;"
        ></iframe>
        <div class="mt-2 text-xs text-gray-500">
          <a href="https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lon}#map=15/${location.lat}/${location.lon}" 
             target="_blank" 
             rel="noopener noreferrer"
             class="text-blue-500 hover:underline">
            View larger map on OpenStreetMap →
          </a>
        </div>
      </div>
      <div class="mt-4 flex justify-end">
        <button class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md" onclick="this.closest('.fixed').remove()">
          Close
        </button>
      </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
}

export const mapPlugin = new MapPlugin();