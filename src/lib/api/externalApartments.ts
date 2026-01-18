import { supabase } from '@/integrations/supabase/client';
import { ExternalApartment } from '@/types';

type SearchResponse = {
  success: boolean;
  error?: string;
  apartments?: ExternalApartment[];
};

export const externalApartmentsApi = {
  async search(location: string, query?: string): Promise<SearchResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('search-external-apartments', {
        body: { location, query },
      });

      if (error) {
        console.error('Edge function error:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        return { success: false, error: data.error || 'Search failed' };
      }

      // Add isExternal flag to all apartments
      const apartments: ExternalApartment[] = (data.apartments || []).map((apt: any) => ({
        ...apt,
        isExternal: true as const,
      }));

      return { success: true, apartments };
    } catch (error) {
      console.error('Error searching external apartments:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to search' 
      };
    }
  },
};
