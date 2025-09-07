import type { APIRoute } from 'astro';

// Using Nominatim API (OpenStreetMap's geocoding service)
// Free to use, no API key required, but has usage limits
const NOMINATIM_API_URL = 'https://nominatim.openstreetmap.org/search';

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q');
  
  if (!query) {
    return new Response(JSON.stringify({ error: 'Query parameter "q" is required' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    // Build request to Nominatim API
    const nominatimUrl = new URL(NOMINATIM_API_URL);
    nominatimUrl.searchParams.set('q', query);
    nominatimUrl.searchParams.set('format', 'json');
    nominatimUrl.searchParams.set('limit', '5'); // Return up to 5 results
    nominatimUrl.searchParams.set('accept-language', 'ja,en'); // Support Japanese and English
    
    const response = await fetch(nominatimUrl.toString(), {
      headers: {
        'User-Agent': 'ItineraryEditor/1.0', // Required by Nominatim
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API returned ${response.status}`);
    }

    const data = await response.json();
    
    // Transform the response to a simpler format
    const results = data.map((item: any) => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      type: item.type,
      importance: item.importance,
      boundingbox: item.boundingbox,
    }));

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    return new Response(JSON.stringify({ error: 'Failed to geocode location' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};