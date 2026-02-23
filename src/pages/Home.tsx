import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Apartment, ExternalApartment } from "@/types";
import ApartmentCard from "@/components/ApartmentCard";
import ExternalApartmentCard from "@/components/ExternalApartmentCard";
import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setFavorites } from "@/store/favoritesSlice";
import { setSearchQuery } from "@/store/filterSlice";
import { Input } from "@/components/ui/input";
import FilterModal from "@/components/FilterModal";
import { externalApartmentsApi } from "@/lib/api/externalApartments";

type MixedListing = (Apartment & { isExternal?: false }) | ExternalApartment;

const Home = () => {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.filters);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [externalApartments, setExternalApartments] = useState<ExternalApartment[]>([]);
  const [mixedListings, setMixedListings] = useState<MixedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeFilterCount = [
    filters.city, filters.bedrooms, filters.bathrooms,
    filters.amenities.length > 0, filters.checkInDate,
    filters.priceMin > 0 || filters.priceMax < 10000,
  ].filter(Boolean).length;

  useEffect(() => {
    fetchApartments();
    fetchFavorites();
    fetchExternalApartments();
  }, [filters]);

  const fetchFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from("favorites").select("apartment_id").eq("user_id", user.id);
      if (error) throw error;
      dispatch(setFavorites(data?.map((fav) => fav.apartment_id) || []));
    } catch (error: any) { console.error("Error fetching favorites:", error); }
  };

  const fetchApartments = async () => {
    try {
      let query = supabase.from("apartments").select("*").eq("availability_status", "available");
      if (filters.searchQuery) query = query.or(`name.ilike.%${filters.searchQuery}%,address.ilike.%${filters.searchQuery}%,city.ilike.%${filters.searchQuery}%`);
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
          id: apt.id, listerId: apt.lister_id, name: apt.name,
          description: apt.description || undefined,
          location: { address: apt.address, city: apt.city, neighborhood: apt.neighborhood || undefined, lat: apt.latitude ? Number(apt.latitude) : undefined, lng: apt.longitude ? Number(apt.longitude) : undefined },
          pricePerNight: Number(apt.price_per_night), bedrooms: apt.bedrooms, bathrooms: apt.bathrooms,
          amenities: apt.amenities || [],
          media: mediaArray.map((m: any) => ({ type: m.type || 'image', url: m.url || '', thumbnail: m.thumbnail })),
          availabilityStatus: apt.availability_status, averageRating: Number(apt.average_rating),
          totalReviews: apt.total_reviews, favoritesCount: apt.favorites_count || 0,
          createdAt: apt.created_at, updatedAt: apt.updated_at,
        };
      });
      setApartments(transformedApartments);
    } catch (error: any) { toast.error("Failed to load apartments"); console.error(error); }
    finally { setLoading(false); }
  };

  const fetchExternalApartments = async () => {
    const location = filters.city || filters.searchQuery;
    if (!location) { setExternalApartments([]); return; }
    try {
      const result = await externalApartmentsApi.search(location, filters.searchQuery);
      if (result.success && result.apartments) setExternalApartments(result.apartments);
    } catch (error) { console.error("Error fetching external apartments:", error); }
  };

  useEffect(() => {
    if (apartments.length === 0) { setMixedListings([]); return; }
    const mixed: MixedListing[] = [];
    let externalIndex = 0;
    apartments.forEach((apt, index) => {
      mixed.push({ ...apt, isExternal: false });
      if ((index + 1) % 4 === 0 && externalIndex < externalApartments.length) {
        mixed.push(externalApartments[externalIndex]); externalIndex++;
      }
    });
    while (externalIndex < externalApartments.length && externalIndex < 3) {
      mixed.push(externalApartments[externalIndex]); externalIndex++;
    }
    setMixedListings(mixed);
  }, [apartments, externalApartments]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const windowHeight = window.innerHeight;
    setCurrentIndex(Math.round(scrollTop / windowHeight));
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
      <div className="h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Search className="w-7 h-7 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold mb-1">No apartments available</h2>
        <p className="text-sm text-muted-foreground">Check back soon for new listings!</p>
      </div>
    );
  }

  return (
    <>
      {/* Search bar */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-safe">
        <div className="pt-3">
          {searchExpanded ? (
            <div className="flex items-center gap-2 bg-background/90 backdrop-blur-xl rounded-2xl border shadow-lg p-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search apartments..."
                  value={filters.searchQuery}
                  onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                  className="pl-9 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl"
                />
              </div>
              <button
                onClick={() => setFilterModalOpen(true)}
                className="relative w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 transition-colors hover:bg-muted"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setSearchExpanded(false); dispatch(setSearchQuery("")); }}
                className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 transition-colors hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setSearchExpanded(true); setTimeout(() => searchInputRef.current?.focus(), 100); }}
                className="w-10 h-10 rounded-full bg-background/90 backdrop-blur-xl border shadow-md flex items-center justify-center transition-transform active:scale-95"
              >
                <Search className="h-4 w-4" />
              </button>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => setFilterModalOpen(true)}
                  className="h-10 px-4 rounded-full bg-background/90 backdrop-blur-xl border shadow-md flex items-center gap-1.5 text-sm font-medium transition-transform active:scale-95"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>{activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Scroll indicator dots */}
      {mixedListings.length > 1 && (
        <div className="fixed right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1.5">
          {mixedListings.slice(0, 8).map((_, index) => (
            <div
              key={index}
              className={`rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "w-1.5 h-5 bg-white shadow-md"
                  : "w-1.5 h-1.5 bg-white/40"
              }`}
            />
          ))}
          {mixedListings.length > 8 && (
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          )}
        </div>
      )}

      {/* Apartments List */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollBehavior: "smooth" }}
      >
        {(mixedListings.length > 0 ? mixedListings : apartments.map(a => ({ ...a, isExternal: false as const }))).map((listing, index) => (
          <div key={listing.id} className="h-screen snap-start snap-always relative">
            {listing.isExternal ? (
              <ExternalApartmentCard apartment={listing} isActive={index === currentIndex} />
            ) : (
              <ApartmentCard apartment={listing as Apartment} isActive={index === currentIndex} />
            )}
          </div>
        ))}
      </div>

      <FilterModal open={filterModalOpen} onOpenChange={setFilterModalOpen} onApply={fetchApartments} />
    </>
  );
};

export default Home;
