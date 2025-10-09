import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Apartment } from "@/types";
import ApartmentCard from "@/components/ApartmentCard";
import { Loader2, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setFavorites } from "@/store/favoritesSlice";
import { setSearchQuery } from "@/store/filterSlice";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FilterModal from "@/components/FilterModal";

const Home = () => {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.filters);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeFilterCount = [
    filters.city,
    filters.bedrooms,
    filters.bathrooms,
    filters.amenities.length > 0,
    filters.checkInDate,
    filters.priceMin > 0 || filters.priceMax < 10000,
  ].filter(Boolean).length;

  useEffect(() => {
    fetchApartments();
    fetchFavorites();
  }, [filters]);

  const fetchFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from("favorites")
        .select("apartment_id")
        .eq("user_id", user.id);

      if (error) throw error;

      const favoriteIds = data?.map((fav) => fav.apartment_id) || [];
      dispatch(setFavorites(favoriteIds));
    } catch (error: any) {
      console.error("Error fetching favorites:", error);
    }
  };

  const fetchApartments = async () => {
    try {
      let query = supabase
        .from("apartments")
        .select("*")
        .eq("availability_status", "available");

      // Apply filters
      if (filters.searchQuery) {
        query = query.or(
          `name.ilike.%${filters.searchQuery}%,address.ilike.%${filters.searchQuery}%,city.ilike.%${filters.searchQuery}%`
        );
      }

      if (filters.city) {
        query = query.eq("city", filters.city);
      }

      if (filters.priceMin > 0) {
        query = query.gte("price_per_night", filters.priceMin);
      }

      if (filters.priceMax < 10000) {
        query = query.lte("price_per_night", filters.priceMax);
      }

      if (filters.bedrooms) {
        query = query.gte("bedrooms", filters.bedrooms);
      }

      if (filters.bathrooms) {
        query = query.gte("bathrooms", filters.bathrooms);
      }

      if (filters.amenities.length > 0) {
        query = query.contains("amenities", filters.amenities);
      }

      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Transform database format to app format
      const transformedApartments: Apartment[] = (data || []).map((apt) => {
        const mediaArray = Array.isArray(apt.media) ? apt.media as any[] : [];
        
        return {
          id: apt.id,
          listerId: apt.lister_id,
          name: apt.name,
          description: apt.description || undefined,
          location: {
            address: apt.address,
            city: apt.city,
            neighborhood: apt.neighborhood || undefined,
            lat: apt.latitude ? Number(apt.latitude) : undefined,
            lng: apt.longitude ? Number(apt.longitude) : undefined,
          },
          pricePerNight: Number(apt.price_per_night),
          bedrooms: apt.bedrooms,
          bathrooms: apt.bathrooms,
          amenities: apt.amenities || [],
          media: mediaArray.map((m: any) => ({
            type: m.type || 'image',
            url: m.url || '',
            thumbnail: m.thumbnail,
          })),
          availabilityStatus: apt.availability_status,
          averageRating: Number(apt.average_rating),
          totalReviews: apt.total_reviews,
          createdAt: apt.created_at,
          updatedAt: apt.updated_at,
        };
      });

      setApartments(transformedApartments);
    } catch (error: any) {
      toast.error("Failed to load apartments");
      console.error("Error fetching apartments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const scrollTop = containerRef.current.scrollTop;
    const windowHeight = window.innerHeight;
    const newIndex = Math.round(scrollTop / windowHeight);
    
    setCurrentIndex(newIndex);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (apartments.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">No apartments available</h2>
          <p className="text-muted-foreground">
            Check back soon for new listings!
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Search and Filter Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center gap-2 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search apartments, locations..."
              value={filters.searchQuery}
              onChange={(e) => dispatch(setSearchQuery(e.target.value))}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setFilterModalOpen(true)}
            className="relative"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Apartments List */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide pt-[72px]"
        style={{ scrollBehavior: "smooth" }}
      >
        {apartments.map((apartment, index) => (
          <div
            key={apartment.id}
            className="h-[calc(100vh-72px)] snap-start snap-always relative"
          >
            <ApartmentCard apartment={apartment} isActive={index === currentIndex} />
          </div>
        ))}
      </div>

      {/* Filter Modal */}
      <FilterModal
        open={filterModalOpen}
        onOpenChange={setFilterModalOpen}
        onApply={fetchApartments}
      />
    </>
  );
};

export default Home;
