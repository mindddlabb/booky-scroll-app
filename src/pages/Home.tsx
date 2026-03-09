import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Apartment, ExternalApartment } from "@/types";
import ApartmentCard from "@/components/ApartmentCard";
import ApartmentCardSkeleton from "@/components/ApartmentCardSkeleton";
import ExternalApartmentCard from "@/components/ExternalApartmentCard";
import { Loader2, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setFavorites } from "@/store/favoritesSlice";
import { setSearchQuery } from "@/store/filterSlice";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { externalApartmentsApi } from "@/lib/api/externalApartments";

type MixedListing = (Apartment & { isExternal?: false }) | ExternalApartment;

const Home = () => {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.filters);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [externalApartments, setExternalApartments] = useState<ExternalApartment[]>([]);
  const [mixedListings, setMixedListings] = useState<MixedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Pull-to-refresh state
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const PULL_THRESHOLD = 80;

  useEffect(() => {
    fetchApartments();
    fetchFavorites();
    fetchExternalApartments();
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

      if (filters.searchQuery) {
        query = query.or(
          `name.ilike.%${filters.searchQuery}%,address.ilike.%${filters.searchQuery}%,city.ilike.%${filters.searchQuery}%`
        );
      }
      if (filters.city) query = query.eq("city", filters.city);
      if (filters.priceMin > 0) query = query.gte("price_per_night", filters.priceMin);
      if (filters.priceMax < 10000) query = query.lte("price_per_night", filters.priceMax);
      if (filters.bedrooms) query = query.gte("bedrooms", filters.bedrooms);
      if (filters.bathrooms) query = query.gte("bathrooms", filters.bathrooms);
      if (filters.amenities.length > 0) query = query.contains("amenities", filters.amenities);
      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

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
          favoritesCount: apt.favorites_count || 0,
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

  const fetchExternalApartments = async () => {
    const location = filters.city || filters.searchQuery;
    if (!location) {
      setExternalApartments([]);
      return;
    }
    try {
      const result = await externalApartmentsApi.search(location, filters.searchQuery);
      if (result.success && result.apartments) {
        setExternalApartments(result.apartments);
      }
    } catch (error) {
      console.error("Error fetching external apartments:", error);
    }
  };

  // Mix external apartments into the feed
  useEffect(() => {
    if (apartments.length === 0) {
      setMixedListings([]);
      return;
    }
    const mixed: MixedListing[] = [];
    let externalIndex = 0;
    apartments.forEach((apt, index) => {
      mixed.push({ ...apt, isExternal: false });
      if ((index + 1) % 4 === 0 && externalIndex < externalApartments.length) {
        mixed.push(externalApartments[externalIndex]);
        externalIndex++;
      }
    });
    while (externalIndex < externalApartments.length && externalIndex < 3) {
      mixed.push(externalApartments[externalIndex]);
      externalIndex++;
    }
    setMixedListings(mixed);
  }, [apartments, externalApartments]);

  const handleScroll = () => {
    // scroll tracking if needed
  };

  // Pull-to-refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling || refreshing) return;
    const diff = Math.max(0, e.touches[0].clientY - startY.current);
    setPullDistance(Math.min(diff * 0.5, PULL_THRESHOLD * 1.5));
  }, [pulling, refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    setPulling(false);
    if (pullDistance >= PULL_THRESHOLD) {
      setRefreshing(true);
      try {
        await Promise.all([fetchApartments(), fetchFavorites(), fetchExternalApartments()]);
        toast.success("Feed refreshed");
      } finally {
        setRefreshing(false);
      }
    }
    setPullDistance(0);
  }, [pulling, pullDistance]);

  // Skeleton loading state
  if (loading) {
    return (
      <div className="h-screen overflow-hidden">
        <ApartmentCardSkeleton />
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
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div
          className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center transition-all duration-200 pt-safe"
          style={{ height: refreshing ? 56 : pullDistance }}
        >
          <div className={`bg-background/90 backdrop-blur-sm rounded-full p-2 shadow-lg ${refreshing ? 'animate-spin' : ''}`}>
            <RefreshCw
              className={`w-5 h-5 text-primary transition-transform ${pullDistance >= PULL_THRESHOLD ? 'text-primary' : 'text-muted-foreground'}`}
              style={{ transform: refreshing ? undefined : `rotate(${pullDistance * 3}deg)` }}
            />
          </div>
        </div>
      )}

      {/* Minimal Search Bar */}
      <div className="fixed top-4 left-4 right-4 z-50 pt-safe">
        {searchExpanded ? (
          <div className="flex items-center gap-2 bg-background/95 backdrop-blur-md rounded-full border shadow-lg p-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search..."
                value={filters.searchQuery}
                onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                className="pl-9 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                onBlur={() => {
                  if (!filters.searchQuery) setSearchExpanded(false);
                }}
              />
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="icon"
            className="rounded-full bg-background/95 backdrop-blur-md shadow-lg h-10 w-10"
            onClick={() => {
              setSearchExpanded(true);
              setTimeout(() => searchInputRef.current?.focus(), 100);
            }}
          >
            <Search className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Apartments List */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollBehavior: "smooth" }}
      >
        {mixedListings.length > 0 ? (
          mixedListings.map((listing, index) => (
            <div key={listing.id} className="h-screen snap-start snap-always relative">
              <ApartmentCard apartment={listing as Apartment} isActive={true} />
            </div>
          ))
        ) : (
          apartments.map((apartment, index) => (
            <div key={apartment.id} className="h-screen snap-start snap-always relative">
              <ApartmentCard apartment={apartment} isActive={true} />
            </div>
          ))
        )}
      </div>
    </>
  );
};

export default Home;
