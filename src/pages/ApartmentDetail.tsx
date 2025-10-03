import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Apartment } from "@/types";
import { Loader2, ArrowLeft, MapPin, Star, Bed, Bath, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addFavorite, removeFavorite } from "@/store/favoritesSlice";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const ApartmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const favoriteIds = useAppSelector((state) => state.favorites.apartmentIds);
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [loading, setLoading] = useState(true);

  const isFavorite = id ? favoriteIds.includes(id) : false;

  useEffect(() => {
    fetchApartment();
  }, [id]);

  const fetchApartment = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from("apartments")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        const mediaArray = Array.isArray(data.media) ? data.media as any[] : [];
        
        const transformedApartment: Apartment = {
          id: data.id,
          listerId: data.lister_id,
          name: data.name,
          description: data.description || undefined,
          location: {
            address: data.address,
            city: data.city,
            neighborhood: data.neighborhood || undefined,
            lat: data.latitude ? Number(data.latitude) : undefined,
            lng: data.longitude ? Number(data.longitude) : undefined,
          },
          pricePerNight: Number(data.price_per_night),
          bedrooms: data.bedrooms,
          bathrooms: data.bathrooms,
          amenities: data.amenities || [],
          media: mediaArray.map((m: any) => ({
            type: m.type || 'image',
            url: m.url || '',
            thumbnail: m.thumbnail,
          })),
          availabilityStatus: data.availability_status,
          averageRating: Number(data.average_rating),
          totalReviews: data.total_reviews,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        setApartment(transformedApartment);
      }
    } catch (error: any) {
      toast.error("Failed to load apartment details");
      console.error("Error fetching apartment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async () => {
    if (!apartment) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please login to save favorites");
        return;
      }

      // Optimistic update
      if (isFavorite) {
        dispatch(removeFavorite(apartment.id));
      } else {
        dispatch(addFavorite(apartment.id));
      }

      // Update database
      if (isFavorite) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("apartment_id", apartment.id);

        if (error) {
          // Revert on error
          dispatch(addFavorite(apartment.id));
          throw error;
        }
        toast.success("Removed from favorites");
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({
            user_id: user.id,
            apartment_id: apartment.id,
          });

        if (error) {
          // Revert on error
          dispatch(removeFavorite(apartment.id));
          throw error;
        }
        toast.success("Added to favorites");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update favorites");
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!apartment) {
    return (
      <div className="h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Apartment not found</h2>
          <Button onClick={() => navigate("/")}>Go Back Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFavorite}
            className={isFavorite ? "text-red-500" : ""}
          >
            <Heart className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Media Carousel */}
      <div className="relative aspect-[4/3]">
        <Carousel className="w-full h-full">
          <CarouselContent>
            {apartment.media.length > 0 ? (
              apartment.media.map((media, index) => (
                <CarouselItem key={index}>
                  {media.type === "video" ? (
                    <video
                      src={media.url}
                      className="w-full h-full object-cover"
                      controls
                    />
                  ) : (
                    <img
                      src={media.url}
                      alt={`${apartment.name} - Image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </CarouselItem>
              ))
            ) : (
              <CarouselItem>
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
              </CarouselItem>
            )}
          </CarouselContent>
          {apartment.media.length > 1 && (
            <>
              <CarouselPrevious className="left-4" />
              <CarouselNext className="right-4" />
            </>
          )}
        </Carousel>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Title and Rating */}
        <div>
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-3xl font-bold">{apartment.name}</h1>
            <Badge
              className={`${
                apartment.availabilityStatus === "available"
                  ? "bg-green-500"
                  : "bg-red-500"
              } text-white`}
            >
              {apartment.availabilityStatus}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-5 h-5" />
            <span>{apartment.location.address}, {apartment.location.city}</span>
          </div>
          {apartment.averageRating > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{apartment.averageRating.toFixed(1)}/5</span>
              <span className="text-muted-foreground">
                ({apartment.totalReviews} reviews)
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <Bed className="w-6 h-6 mx-auto mb-1 text-primary" />
            <div className="text-2xl font-bold">{apartment.bedrooms}</div>
            <div className="text-sm text-muted-foreground">Bedrooms</div>
          </div>
          <div className="text-center">
            <Bath className="w-6 h-6 mx-auto mb-1 text-primary" />
            <div className="text-2xl font-bold">{apartment.bathrooms}</div>
            <div className="text-sm text-muted-foreground">Bathrooms</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">${apartment.pricePerNight}</div>
            <div className="text-sm text-muted-foreground">per night</div>
          </div>
        </div>

        {/* Description */}
        {apartment.description && (
          <div>
            <h2 className="text-xl font-semibold mb-3">About this place</h2>
            <p className="text-muted-foreground leading-relaxed">{apartment.description}</p>
          </div>
        )}

        {/* Amenities */}
        {apartment.amenities.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-3">Amenities</h2>
            <div className="grid grid-cols-2 gap-3">
              {apartment.amenities.map((amenity, i) => (
                <Badge key={i} variant="secondary" className="justify-start text-sm py-2">
                  {amenity}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-2xl font-bold">
              ${apartment.pricePerNight}
              <span className="text-base font-normal text-muted-foreground">/night</span>
            </div>
          </div>
          <Button
            size="lg"
            className="bg-gradient-to-r from-secondary to-accent hover:opacity-90 font-semibold flex-1 max-w-xs"
          >
            Book Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApartmentDetail;
