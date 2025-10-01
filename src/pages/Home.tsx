import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Apartment } from "@/types";
import ApartmentCard from "@/components/ApartmentCard";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const Home = () => {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchApartments();
  }, []);

  const fetchApartments = async () => {
    try {
      const { data, error } = await supabase
        .from("apartments")
        .select("*")
        .eq("availability_status", "available")
        .order("created_at", { ascending: false });

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
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      style={{ scrollBehavior: "smooth" }}
    >
      {apartments.map((apartment, index) => (
        <div
          key={apartment.id}
          className="h-screen snap-start snap-always relative"
        >
          <ApartmentCard apartment={apartment} isActive={index === currentIndex} />
        </div>
      ))}
    </div>
  );
};

export default Home;
