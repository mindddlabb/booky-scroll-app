import { useState, useRef, useEffect } from "react";
import { Search, Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExternalApartment } from "@/types";
import { externalApartmentsApi } from "@/lib/api/externalApartments";
import ExternalApartmentCard from "@/components/ExternalApartmentCard";
import { toast } from "sonner";

const Explore = () => {
  const [location, setLocation] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [apartments, setApartments] = useState<ExternalApartment[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSearch = async () => {
    if (!location.trim()) {
      toast.error("Please enter a location to search");
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const result = await externalApartmentsApi.search(location, searchQuery);

      if (result.success && result.apartments) {
        setApartments(result.apartments);
        if (result.apartments.length === 0) {
          toast.info("No apartments found. Try a different location.");
        }
      } else {
        toast.error(result.error || "Failed to search apartments");
        setApartments([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search. Please try again.");
      setApartments([]);
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

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Search Header */}
      <div className="p-4 border-b bg-background/95 backdrop-blur-md sticky top-0 z-50">
        <div className="space-y-3">
          <h1 className="text-xl font-bold">Explore External Listings</h1>
          <p className="text-sm text-muted-foreground">
            Search for apartments from across the web in your area
          </p>
          
          <div className="flex flex-col gap-2">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter city, state or region..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-9"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search keywords (optional)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Searching the web for apartments...</p>
            </div>
          </div>
        ) : !hasSearched ? (
          <div className="h-full flex items-center justify-center p-6">
            <div className="text-center space-y-4 max-w-sm">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Search className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Find Apartments Anywhere</h2>
              <p className="text-muted-foreground">
                Enter your location above to discover apartments from rental sites across the internet.
              </p>
            </div>
          </div>
        ) : apartments.length === 0 ? (
          <div className="h-full flex items-center justify-center p-6">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-bold">No apartments found</h2>
              <p className="text-muted-foreground">
                Try searching for a different location or using different keywords.
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
            {apartments.map((apartment, index) => (
              <div
                key={apartment.id}
                className="h-full snap-start snap-always relative"
                style={{ minHeight: 'calc(100vh - 180px)' }}
              >
                <ExternalApartmentCard 
                  apartment={apartment} 
                  isActive={index === currentIndex} 
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;
