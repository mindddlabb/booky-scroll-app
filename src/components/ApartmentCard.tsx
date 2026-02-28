import { useState, useRef, useEffect } from "react";
import { Apartment } from "@/types";
import { Heart, MapPin, Star, Bed, Bath } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addFavorite, removeFavorite } from "@/store/favoritesSlice";
import QuickInfoModal from "./QuickInfoModal";
import { useNavigate } from "react-router-dom";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
interface ApartmentCardProps {
  apartment: Apartment;
  isActive: boolean;
}
const ApartmentCard = ({
  apartment,
  isActive
}: ApartmentCardProps) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const favoriteIds = useAppSelector(state => state.favorites.apartmentIds);
  const isFavorite = favoriteIds.includes(apartment.id);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
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
        const {
          error
        } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("apartment_id", apartment.id);
        if (error) {
          // Revert on error
          dispatch(addFavorite(apartment.id));
          throw error;
        }
        toast.success("Removed from favorites");
      } else {
        const {
          error
        } = await supabase.from("favorites").insert({
          user_id: user.id,
          apartment_id: apartment.id
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
  const handleBook = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/apartment/${apartment.id}`);
  };
  return <>
      <div className="relative w-full h-full">
        {/* Media Carousel - Full Screen */}
        <Carousel className="w-full h-full" opts={{
        dragFree: true
      }}>
          <CarouselContent className="touch-pan-y">
            {apartment.media.length > 0 ? apartment.media.filter(media => media.type === "image").map((media, index) => <CarouselItem key={index} className="h-screen">
                    <img src={media.url} alt={`${apartment.name} - Image ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  </CarouselItem>) : <CarouselItem className="h-screen">
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
              </CarouselItem>}
          </CarouselContent>
        </Carousel>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

        {/* Availability Dot - Top Right */}
        <div className="absolute top-6 right-6 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-full">
          <div className={`w-3 h-3 rounded-full ${apartment.availabilityStatus === "available" ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"}`} />
          <span className="text-white text-xs font-medium capitalize">
            {apartment.availabilityStatus}
          </span>
        </div>

        {/* Favorite Button - Right Side */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10">
          <Button size="icon" variant="ghost" className={`rounded-full backdrop-blur-sm w-14 h-14 ${isFavorite ? "bg-red-500/80 hover:bg-red-600/80" : "bg-black/50 hover:bg-black/70"}`} onClick={handleFavorite}>
            <Heart className={`w-6 h-6 ${isFavorite ? "fill-white" : ""}`} />
          </Button>
        </div>


        {/* Bottom Info Preview */}
        <div className="absolute bottom-6 left-6 right-6 text-white pointer-events-none" onClick={() => setIsSheetOpen(true)}>
          <div className="space-y-2 pointer-events-auto cursor-pointer px-0 py-[50px]">
            <div className="flex items-center gap-2">
              {apartment.averageRating > 0 && <Badge className="bg-black/50 backdrop-blur-sm border-white/20">
                  <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                  {apartment.averageRating.toFixed(1)}
                </Badge>}
              {apartment.favoritesCount > 0 && <Badge className="bg-black/50 backdrop-blur-sm border-white/20">
                  <Heart className="w-3 h-3 mr-1 fill-red-400 text-red-400" />
                  {apartment.favoritesCount}
                </Badge>}
            </div>
            <h2 className="text-2xl font-bold line-clamp-1">{apartment.name}</h2>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4" />
              <span className="line-clamp-1">
                {apartment.location.neighborhood || apartment.location.city}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Bed className="w-4 h-4" />
                  <span>{apartment.bedrooms}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Bath className="w-4 h-4" />
                  <span>{apartment.bathrooms}</span>
                </div>
                <span className="font-bold">
                  ${apartment.pricePerNight}
                  <span className="font-normal text-white/80">/night</span>
                </span>
              </div>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2 rounded-full shadow-lg" onClick={handleBook}>
                Book Now
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Info Bottom Sheet */}
      <QuickInfoModal apartment={apartment} open={isSheetOpen} onOpenChange={setIsSheetOpen} />
    </>;
};
export default ApartmentCard;