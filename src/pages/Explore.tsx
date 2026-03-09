import { useState, useRef, useEffect } from "react";
import { Search, Loader2, MapPin, Globe, Map, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Apartment, ExternalApartment } from "@/types";
import { externalApartmentsApi } from "@/lib/api/externalApartments";
import ExternalApartmentCard from "@/components/ExternalApartmentCard";
import ApartmentMap from "@/components/ApartmentMap";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Explore = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [externalApartments, setExternalApartments] = useState<ExternalApartment[]>([]);
  const [internalApartments, setInternalApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"list" | "map">("map");
  const [activeApartmentId, setActiveApartmentId] = useState<string>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch internal apartments with coordinates
  useEffect(() => {
    fetchInternalApartments();
  }, []);

  const fetchInternalApartments = async () => {
    try {
      const { data, error } = await supabase
        .from("apartments")
        .select("*")
        .eq("availability_status", "available")
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (error) throw error;

      const transformed: Apartment[] = (data || []).map((apt) => {
        const mediaArray = Array.isArray(apt.media) ? (apt.media as any[]) : [];
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
            type: m.type || "image",
            url: m.url || "",
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

      setInternalApartments(transformed);
    } catch (error) {
      console.error("Error fetching apartments for map:", error);
    }
  };

  const handleSearch = async (loc?: string) => {
    const searchLocation = loc || location;
    if (!searchLocation.trim()) {
      toast.error("Please enter a location to search");
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const result = await externalApartmentsApi.search(searchLocation, searchQuery);

      if (result.success && result.apartments) {
        setExternalApartments(result.apartments);
        if (result.apartments.length === 0) {
          toast.info("No external apartments found. Try a different location.");
        }
      } else {
        toast.error(result.error || "Failed to search apartments");
        setExternalApartments([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search. Please try again.");
      setExternalApartments([]);
    } finally {
      setLoading(false);
    }
  };

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`
          );
          const data = await res.json();
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            "";
          const state = data.address?.state || "";
          const detected = [city, state].filter(Boolean).join(", ");

          if (detected) {
            setLocation(detected);
            toast.success(`Location detected: ${detected}`);
            handleSearch(detected);
          } else {
            toast.error("Could not determine your city");
          }
        } catch {
          toast.error("Failed to detect location");
        } finally {
          setDetectingLocation(false);
        }
      },
      () => {
        toast.error("Location access denied");
        setDetectingLocation(false);
      },
      { timeout: 10000 }
    );
  };

  useEffect(() => {
    if (!location && !hasSearched) {
      detectLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const windowHeight = window.innerHeight;
    const newIndex = Math.round(scrollTop / windowHeight);
    setCurrentIndex(newIndex);
  };

  const handleMarkerClick = (apartment: Apartment) => {
    setActiveApartmentId(apartment.id);
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b px-5 pt-5 pb-4 pt-safe">
        <div className="animate-fade-in space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Explore</h1>
                <p className="text-xs text-muted-foreground">Discover apartments near you</p>
              </div>
            </div>

            {/* View toggle */}
            <div className="flex bg-muted/60 rounded-xl p-1">
              <button
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === "map"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                Map
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === "list"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                List
              </button>
            </div>
          </div>

          {/* Location Input */}
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="City, state or region..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="pl-10 pr-24 h-11 rounded-2xl bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs h-8 px-3 rounded-xl text-primary hover:bg-primary/10"
              onClick={detectLocation}
              disabled={detectingLocation}
            >
              {detectingLocation ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <MapPin className="h-3 w-3 mr-1" />
              )}
              Detect
            </Button>
          </div>

          {/* Search input - only in list mode */}
          {viewMode === "list" && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Keywords (optional)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 rounded-2xl bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button
                onClick={() => handleSearch()}
                disabled={loading}
                className="h-11 px-6 rounded-2xl font-semibold"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "map" ? (
          <div className="h-full relative">
            <ApartmentMap
              apartments={internalApartments}
              activeApartmentId={activeApartmentId}
              onMarkerClick={handleMarkerClick}
            />

            {/* Bottom apartment card carousel on map */}
            {activeApartmentId && (
              <div className="absolute bottom-20 left-4 right-4 z-[400] animate-in slide-in-from-bottom-4 duration-300">
                {internalApartments
                  .filter((a) => a.id === activeApartmentId)
                  .map((apt) => (
                    <div
                      key={apt.id}
                      onClick={() => navigate(`/apartment/${apt.id}`)}
                      className="bg-background rounded-2xl shadow-xl border overflow-hidden flex cursor-pointer active:scale-[0.98] transition-transform"
                    >
                      <div className="w-28 h-28 shrink-0">
                        {apt.media?.[0]?.url ? (
                          <img
                            src={apt.media[0].url}
                            alt={apt.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
                        )}
                      </div>
                      <div className="flex-1 p-3 min-w-0 flex flex-col justify-between">
                        <div>
                          <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                            {apt.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {apt.location.address}, {apt.location.city}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-bold text-primary">
                            ${apt.pricePerNight}
                            <span className="text-xs font-normal text-muted-foreground">/night</span>
                          </span>
                          {apt.averageRating > 0 && (
                            <span className="text-xs flex items-center gap-0.5 text-muted-foreground">
                              ⭐ {apt.averageRating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {loading ? (
              <div className="h-full flex items-center justify-center animate-fade-in">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Loader2 className="w-7 h-7 animate-spin text-primary" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Searching the web for apartments...
                  </p>
                </div>
              </div>
            ) : !hasSearched ? (
              <div className="h-full flex items-center justify-center p-6 animate-fade-in">
                <div className="text-center space-y-5 max-w-xs">
                  <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Search className="w-9 h-9 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">Find Apartments Anywhere</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Enter your location above to discover apartments from rental sites across the internet.
                  </p>
                </div>
              </div>
            ) : externalApartments.length === 0 ? (
              <div className="h-full flex items-center justify-center p-6 animate-fade-in">
                <div className="text-center space-y-4 max-w-xs">
                  <div className="w-16 h-16 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto">
                    <MapPin className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <h2 className="text-xl font-bold">No apartments found</h2>
                  <p className="text-sm text-muted-foreground">
                    Try a different location or different keywords.
                  </p>
                </div>
              </div>
            ) : (
              <div
                ref={containerRef}
                onScroll={handleScroll}
                className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
                style={{ scrollBehavior: "smooth" }}
              >
                {externalApartments.map((apartment, index) => (
                  <div
                    key={apartment.id}
                    className="h-full snap-start snap-always relative"
                    style={{ minHeight: "calc(100vh - 200px)" }}
                  >
                    <ExternalApartmentCard
                      apartment={apartment}
                      isActive={index === currentIndex}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Explore;
