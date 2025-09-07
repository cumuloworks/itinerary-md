import type { Plugin, PluginContext } from './types';
import { notifyError, notifySuccess } from '../core/errors';

interface WeatherData {
  location: {
    latitude: number;
    longitude: number;
    timezone: string;
  };
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    weather_description: string;
    wind_speed_10m: number;
  };
  daily: Array<{
    date: string;
    weather_code: number;
    weather_description: string;
    temperature_max: number;
    temperature_min: number;
    precipitation: number;
  }>;
}

export class WeatherPlugin implements Plugin {
  id = 'weather-plugin';
  name = 'Weather Plugin';
  description = 'Show weather forecast for locations';
  version = '1.0.0';

  private apiBaseUrl = '';

  initialize(context: PluginContext): void {
    this.apiBaseUrl = context.apiBaseUrl;
  }

  getActions(context: PluginContext) {
    const hasSelection = !!context.selectedText?.trim();
    
    return [
      {
        id: 'show-weather',
        label: context.language === 'ja' ? '天気予報を表示' : 'Show Weather',
        icon: '🌤️',
        enabled: hasSelection,
        execute: async () => {
          if (!context.selectedText) return;
          
          try {
            // First, geocode the location
            const geocodeResponse = await fetch(`${this.apiBaseUrl}/api/geocode?q=${encodeURIComponent(context.selectedText)}`);
            const geocodeData = await geocodeResponse.json();
            
            if (!geocodeData.results || geocodeData.results.length === 0) {
              notifyError('Location not found');
              return;
            }
            
            const location = geocodeData.results[0];
            
            // Then fetch weather data
            const weatherResponse = await fetch(`${this.apiBaseUrl}/api/weather?lat=${location.lat}&lon=${location.lon}`);
            const weatherData: WeatherData = await weatherResponse.json();
            
            this.showWeatherModal(weatherData, context.selectedText, location.display_name);
            notifySuccess(`Weather forecast loaded for ${context.selectedText}`);
          } catch (error) {
            console.error('Weather fetch error:', error);
            notifyError('Failed to fetch weather data');
          }
        },
      },
    ];
  }

  private getWeatherEmoji(code: number): string {
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code >= 45 && code <= 48) return '🌫️';
    if (code >= 51 && code <= 55) return '🌦️';
    if (code >= 61 && code <= 65) return '🌧️';
    if (code >= 71 && code <= 75) return '❄️';
    if (code >= 80 && code <= 82) return '🌦️';
    if (code >= 95) return '⛈️';
    return '🌤️';
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  }

  private showWeatherModal(weather: WeatherData, query: string, locationName: string): void {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    
    const content = document.createElement('div');
    content.className = 'bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-auto';
    
    const dailyForecastHtml = weather.daily.map(day => `
      <div class="bg-gray-50 rounded-lg p-3">
        <div class="font-medium text-sm">${this.formatDate(day.date)}</div>
        <div class="flex items-center justify-between mt-2">
          <div class="flex items-center gap-2">
            <span class="text-2xl">${this.getWeatherEmoji(day.weather_code)}</span>
            <span class="text-sm text-gray-600">${day.weather_description}</span>
          </div>
          <div class="text-right">
            <div class="text-lg font-semibold">${Math.round(day.temperature_max)}°</div>
            <div class="text-sm text-gray-500">${Math.round(day.temperature_min)}°</div>
          </div>
        </div>
        ${day.precipitation > 0 ? `
          <div class="mt-2 text-xs text-blue-600">
            💧 ${day.precipitation.toFixed(1)}mm
          </div>
        ` : ''}
      </div>
    `).join('');
    
    content.innerHTML = `
      <div class="mb-4">
        <h2 class="text-xl font-bold mb-2">${query} - Weather Forecast</h2>
        <p class="text-gray-600 text-sm">${locationName}</p>
      </div>
      
      <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 mb-4">
        <h3 class="font-semibold mb-3">Current Weather</h3>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-4xl">${this.getWeatherEmoji(weather.current.weather_code)}</span>
            <div>
              <div class="text-3xl font-bold">${Math.round(weather.current.temperature_2m)}°C</div>
              <div class="text-sm text-gray-700">${weather.current.weather_description}</div>
            </div>
          </div>
          <div class="text-right text-sm text-gray-700">
            <div>💨 ${weather.current.wind_speed_10m.toFixed(1)} km/h</div>
            <div>💧 ${weather.current.relative_humidity_2m}%</div>
          </div>
        </div>
      </div>
      
      <div>
        <h3 class="font-semibold mb-3">7-Day Forecast</h3>
        <div class="grid gap-2">
          ${dailyForecastHtml}
        </div>
      </div>
      
      <div class="mt-4 text-xs text-gray-500">
        Data provided by Open-Meteo.com
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

export const weatherPlugin = new WeatherPlugin();