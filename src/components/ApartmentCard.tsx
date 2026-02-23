import { useState } from "react";
import { Apartment } from "@/types";
import { Heart, MapPin, Star, Bed, Bath, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addFavorite, removeFavorite } from "@/store/favoritesSlice";
import QuickInfoModal from "./QuickInfoModal";
import { useNavigate } from "react-router-dom";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import type { CarouselApi } from "@/components/ui/carousel";
import { useEffect } from "react";

interface ApartmentCardProps {
  apartment: Apartment;
  isActive: boolean;
}

const ApartmentCard = ({ apartment, isActive }: ApartmentCardProps) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const favoriteIds = useAppSelector((state) => state.favorites.apartmentIds);
  const isFavorite = favoriteIds.includes(apartment.id);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!carouselApi) return;
    setCurrentSlide(carouselApi.selectedScrollSnap());
    carouselApi.on("select", () => setCurrentSlide(carouselApi.selectedScrollSnap()));
  }, [carouselApi]);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please login to save favorites"); return; }
      if (isFavorite) {
        dispatch(removeFavorite(apartment.id));
        const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("apartment_id", apartment.id);
        if (error) { dispatch(addFavorite(apartment.id)); throw error; }
        toast.success("Removed from favorites");
      } else {
        dispatch(addFavorite(apartment.id));
        const { error } = await supabase.from("favorites").insert({ user_id: user.id, apartment_id: apartment.id });
        if (error) { dispatch(removeFavorite(apartment.id)); throw error; }
        toast.success("Added to favorites");
      }
    } catch (error: any) { toast.error(error.message || "Failed to update favorites"); }
  };

  const handleBook = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/apartment/${apartment.id}`);
  };

  const imageMedia = apartment.media.filter((m) => m.type === "image");

  return (
    <>
      <div className="relative w-full h-full">
        {/* Media Carousel */}
        <Carousel className="w-full h-full" opts={{ dragFree: true }} setApi={setCarouselApi}>
          <CarouselContent className="touch-pan-y">
            {imageMedia.length > 0 ? (
              imageMedia.map((media, index) => (
                <CarouselItem key={index} className="h-screen">
                  <img src={media.url} alt={`${apartment.name} - ${index + 1}`}
                    className="w-full h-full object-cover" loading="lazy" />
                </CarouselItem>
              ))
            ) : (
              <CarouselItem className="h-screen">
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
              </CarouselItem>
            )}
          </CarouselContent>
        </Carousel>

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70 pointer-events-none" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-safe">
          {/* Slide dots */}
          {imageMedia.length > 1 && (
            <div className="flex gap-1">
              {imageMedia.map((_, index) => (
                <div key={index}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    index === currentSlide ? "w-5 bg-white" : "w-1 bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}
          {imageMedia.length <= 1 && <div />}

          {/* Availability pill */}
          <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full backdrop-blur-md ${
            apartment.availabilityStatus === "available"
              ? "bg-primary/80 text-primary-foreground"
              : "bg-destructive/80 text-destructive-foreground"
          }`}>
            {apartment.availabilityStatus}
          </span>
        </div>

        {/* Right-side actions */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3">
          <button
            onClick={handleFavorite}
            className={`w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-200 active:scale-90 ${
              isFavorite
                ? "bg-red-500/90 shadow-lg shadow-red-500/30"
                : "bg-black/30 hover:bg-black/50"
            }`}
          >
            <Heart className={`w-5 h-5 text-white ${isFavorite ? "fill-white" : ""}`} />
          </button>
        </div>

        {/* Bottom card */}
        <div className="absolute bottom-0 left-0 right-0 p-5 pb-24">
          <div
            onClick={() => setIsSheetOpen(true)}
            className="bg-background/90 backdrop-blur-xl rounded-3xl p-5 shadow-2xl cursor-pointer transition-transform active:scale-[0.98] animate-in slide-in-from-bottom-4 duration-500"
          >
            {/* Badges row */}
            <div className="flex items-center gap-2 mb-2">
              {apartment.averageRating > 0 && (
                <div className="flex items-center gap-1 bg-primary/10 rounded-full px-2.5 py-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-bold">{apartment.averageRating.toFixed(1)}</span>
                </div>
              )}
              {apartment.favoritesCount > 0 && (
                <div className="flex items-center gap-1 bg-secondary/10 rounded-full px-2.5 py-1">
                  <Heart className="w-3 h-3 fill-destructive text-destructive" />
                  <span className="text-xs font-semibold">{apartment.favoritesCount}</span>
                </div>
              )}
            </div>

            {/* Title & location */}
            <h2 className="text-lg font-bold leading-snug line-clamp-1 mb-1">{apartment.name}</h2>
            <div className="flex items-center gap-1.5 text-muted-foreground mb-3">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="text-sm line-clamp-1">{apartment.location.neighborhood || apartment.location.city}</span>
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Bed className="w-3.5 h-3.5" />
                  <span>{apartment.bedrooms}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Bath className="w-3.5 h-3.5" />
                  <span>{apartment.bathrooms}</span>
                </div>
                <span className="text-base font-bold text-primary">
                  ${apartment.pricePerNight}<span className="text-xs font-normal text-muted-foreground">/night</span>
                </span>
              </div>
              <Button
                className="rounded-2xl font-semibold px-5 gap-1 shadow-md"
                onClick={handleBook}
              >
                Book <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <QuickInfoModal apartment={apartment} open={isSheetOpen} onOpenChange={setIsSheetOpen} />
    </>
  );
};

export default ApartmentCard;
