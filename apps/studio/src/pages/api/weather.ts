import type { APIRoute } from 'astro';

// Using Open-Meteo API (free weather API, no key required)
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';

export const GET: APIRoute = async ({ url }) => {
  const lat = url.searchParams.get('lat');
  const lon = url.searchParams.get('lon');
  
  if (!lat || !lon) {
    return new Response(JSON.stringify({ error: 'Parameters "lat" and "lon" are required' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    // Build request to Open-Meteo API
    const weatherUrl = new URL(WEATHER_API_URL);
    weatherUrl.searchParams.set('latitude', lat);
    weatherUrl.searchParams.set('longitude', lon);
    weatherUrl.searchParams.set('current', 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m');
    weatherUrl.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum');
    weatherUrl.searchParams.set('timezone', 'auto');
    weatherUrl.searchParams.set('forecast_days', '7');
    
    const response = await fetch(weatherUrl.toString());

    if (!response.ok) {
      throw new Error(`Weather API returned ${response.status}`);
    }

    const data = await response.json();
    
    // Add weather description based on WMO weather codes
    const getWeatherDescription = (code: number) => {
      const weatherCodes: { [key: number]: string } = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        71: 'Slight snow',
        73: 'Moderate snow',
        75: 'Heavy snow',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with slight hail',
        99: 'Thunderstorm with heavy hail',
      };
      return weatherCodes[code] || 'Unknown';
    };

    // Format the response
    const result = {
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
      },
      current: {
        ...data.current,
        weather_description: getWeatherDescription(data.current.weather_code),
      },
      daily: data.daily.time.map((date: string, index: number) => ({
        date,
        weather_code: data.daily.weather_code[index],
        weather_description: getWeatherDescription(data.daily.weather_code[index]),
        temperature_max: data.daily.temperature_2m_max[index],
        temperature_min: data.daily.temperature_2m_min[index],
        precipitation: data.daily.precipitation_sum[index],
      })),
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=1800', // Cache for 30 minutes
      },
    });
  } catch (error) {
    console.error('Weather API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch weather data' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};