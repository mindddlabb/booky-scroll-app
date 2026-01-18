import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExternalApartment {
  id: string;
  name: string;
  description?: string;
  price?: string;
  pricePerNight?: number;
  location: string;
  imageUrl?: string;
  sourceUrl: string;
  sourceName: string;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { location, query } = await req.json();

    if (!location) {
      return new Response(
        JSON.stringify({ success: false, error: 'Location is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Search service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build search query for apartments
    const searchQuery = query 
      ? `${query} apartments for rent in ${location}`
      : `apartments for rent in ${location} short term rental`;

    console.log('Searching for:', searchQuery);

    // Use Firecrawl search to find apartment listings
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 10,
        scrapeOptions: {
          formats: ['markdown'],
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || 'Search failed' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Search results received:', data.data?.length || 0);

    // Transform search results into apartment format
    const apartments: ExternalApartment[] = (data.data || []).map((result: any, index: number) => {
      // Extract price from title or description if available
      const priceMatch = (result.title + ' ' + (result.description || '')).match(/\$[\d,]+/);
      const priceStr = priceMatch ? priceMatch[0] : undefined;
      const priceNum = priceStr ? parseInt(priceStr.replace(/[$,]/g, '')) : undefined;

      // Extract bedrooms/bathrooms from content
      const bedroomMatch = (result.title + ' ' + (result.description || '')).match(/(\d+)\s*(?:bed|br|bedroom)/i);
      const bathroomMatch = (result.title + ' ' + (result.description || '')).match(/(\d+)\s*(?:bath|ba|bathroom)/i);

      // Extract source name from URL
      let sourceName = 'External Listing';
      try {
        const url = new URL(result.url);
        sourceName = url.hostname.replace('www.', '').split('.')[0];
        sourceName = sourceName.charAt(0).toUpperCase() + sourceName.slice(1);
      } catch (e) {
        // Keep default
      }

      return {
        id: `ext_${Date.now()}_${index}`,
        name: result.title || 'Apartment Listing',
        description: result.description || result.markdown?.substring(0, 200),
        price: priceStr,
        pricePerNight: priceNum,
        location: location,
        imageUrl: result.image || undefined,
        sourceUrl: result.url,
        sourceName,
        bedrooms: bedroomMatch ? parseInt(bedroomMatch[1]) : undefined,
        bathrooms: bathroomMatch ? parseInt(bathroomMatch[1]) : undefined,
      };
    }).filter((apt: ExternalApartment) => apt.sourceUrl && apt.name);

    console.log('Processed apartments:', apartments.length);

    return new Response(
      JSON.stringify({ success: true, apartments }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error searching apartments:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to search';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
