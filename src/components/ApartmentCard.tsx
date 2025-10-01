import { useState } from "react";
import { Apartment } from "@/types";
import { Heart, MapPin, Star, Bed, Bath } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ApartmentCardProps {
  apartment: Apartment;
  isActive: boolean;
}

const ApartmentCard = ({ apartment, isActive }: ApartmentCardProps) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Get first image or use placeholder
  const mainImage = apartment.media[0]?.url || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop";

  const handleFavorite = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please login to save favorites");
        return;
      }

      if (isFavorite) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("apartment_id", apartment.id);

        if (error) throw error;
        setIsFavorite(false);
        toast.success("Removed from favorites");
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({
            user_id: user.id,
            apartment_id: apartment.id,
          });

        if (error) throw error;
        setIsFavorite(true);
        toast.success("Added to favorites");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update favorites");
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Background Image */}
      <div className="absolute inset-0">
        {!imageError ? (
          <img
            src={mainImage}
            alt={apartment.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col justify-between p-6 text-white">
        {/* Top Actions */}
        <div className="flex justify-between items-start">
          <div className="flex gap-2">
            {apartment.averageRating > 0 && (
              <Badge className="bg-black/50 backdrop-blur-sm border-white/20">
                <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                {apartment.averageRating.toFixed(1)}
              </Badge>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            className={`rounded-full backdrop-blur-sm ${
              isFavorite
                ? "bg-red-500/80 hover:bg-red-600/80"
                : "bg-black/30 hover:bg-black/50"
            }`}
            onClick={handleFavorite}
          >
            <Heart
              className={`w-5 h-5 ${
                isFavorite ? "fill-white" : ""
              }`}
            />
          </Button>
        </div>

        {/* Bottom Info */}
        <div className="space-y-4 animate-fade-in">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">{apartment.name}</h2>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4" />
              <span>{apartment.location.neighborhood || apartment.location.city}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Bed className="w-4 h-4" />
              <span>{apartment.bedrooms} beds</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="w-4 h-4" />
              <span>{apartment.bathrooms} baths</span>
            </div>
          </div>

          {apartment.amenities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {apartment.amenities.slice(0, 3).map((amenity, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="bg-white/20 backdrop-blur-sm border-white/30"
                >
                  {amenity}
                </Badge>
              ))}
              {apartment.amenities.length > 3 && (
                <Badge
                  variant="secondary"
                  className="bg-white/20 backdrop-blur-sm border-white/30"
                >
                  +{apartment.amenities.length - 3} more
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
            <div>
              <p className="text-3xl font-bold">
                ${apartment.pricePerNight}
                <span className="text-lg font-normal text-white/80">/night</span>
              </p>
            </div>
            <Button
              size="lg"
              className="bg-gradient-to-r from-secondary to-accent hover:opacity-90 font-semibold"
            >
              Book Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApartmentCard;
