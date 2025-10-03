import { useState, useRef, useEffect } from "react";
import { Apartment } from "@/types";
import { Heart, ArrowRight, MapPin, Star, Bed, Bath, Volume2, VolumeX } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface ApartmentCardProps {
  apartment: Apartment;
  isActive: boolean;
}

const ApartmentCard = ({ apartment, isActive }: ApartmentCardProps) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Auto-play videos when card is active
  useEffect(() => {
    if (isActive) {
      videoRefs.current.forEach((video) => {
        if (video) {
          video.play().catch(() => {
            // Auto-play might be blocked, that's ok
          });
        }
      });
    } else {
      videoRefs.current.forEach((video) => {
        if (video) {
          video.pause();
        }
      });
    }
  }, [isActive]);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleBook = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success("Opening booking flow...");
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
    videoRefs.current.forEach((video) => {
      if (video) {
        video.muted = !isMuted;
      }
    });
  };

  return (
    <>
      <div className="relative w-full h-full" onClick={() => setIsSheetOpen(true)}>
        {/* Media Carousel - Full Screen */}
        <Carousel className="w-full h-full">
          <CarouselContent>
            {apartment.media.length > 0 ? (
              apartment.media.map((media, index) => (
                <CarouselItem key={index} className="h-screen">
                  {media.type === "video" ? (
                    <video
                      ref={(el) => (videoRefs.current[index] = el)}
                      src={media.url}
                      className="w-full h-full object-cover"
                      loop
                      muted={isMuted}
                      playsInline
                      onClick={(e) => {
                        e.stopPropagation();
                        const video = e.currentTarget;
                        if (video.paused) {
                          video.play();
                        } else {
                          video.pause();
                        }
                      }}
                    />
                  ) : (
                    <img
                      src={media.url}
                      alt={`${apartment.name} - Image ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                </CarouselItem>
              ))
            ) : (
              <CarouselItem className="h-screen">
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
              </CarouselItem>
            )}
          </CarouselContent>
          {apartment.media.length > 1 && (
            <>
              <CarouselPrevious className="left-4 bg-black/50 border-white/20 text-white hover:bg-black/70" />
              <CarouselNext className="right-4 bg-black/50 border-white/20 text-white hover:bg-black/70" />
            </>
          )}
        </Carousel>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

        {/* Availability Dot - Top Right */}
        <div className="absolute top-6 right-6 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-full">
          <div
            className={`w-3 h-3 rounded-full ${
              apartment.availabilityStatus === "available"
                ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]"
                : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"
            }`}
          />
          <span className="text-white text-xs font-medium capitalize">
            {apartment.availabilityStatus}
          </span>
        </div>

        {/* Right Side Actions */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-10">
          <Button
            size="icon"
            variant="ghost"
            className={`rounded-full backdrop-blur-sm w-14 h-14 ${
              isFavorite
                ? "bg-red-500/80 hover:bg-red-600/80"
                : "bg-black/50 hover:bg-black/70"
            }`}
            onClick={handleFavorite}
          >
            <Heart
              className={`w-6 h-6 ${isFavorite ? "fill-white" : ""}`}
            />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full backdrop-blur-sm bg-black/50 hover:bg-black/70 w-14 h-14"
            onClick={handleBook}
          >
            <ArrowRight className="w-6 h-6" />
          </Button>
        </div>

        {/* Video Controls - Bottom Left */}
        {apartment.media.some((m) => m.type === "video") && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute bottom-24 left-6 rounded-full backdrop-blur-sm bg-black/50 hover:bg-black/70"
            onClick={toggleMute}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </Button>
        )}

        {/* Bottom Info Preview */}
        <div className="absolute bottom-6 left-6 right-24 text-white pointer-events-none">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {apartment.averageRating > 0 && (
                <Badge className="bg-black/50 backdrop-blur-sm border-white/20 pointer-events-auto">
                  <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                  {apartment.averageRating.toFixed(1)}
                </Badge>
              )}
            </div>
            <h2 className="text-2xl font-bold line-clamp-1">{apartment.name}</h2>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4" />
              <span className="line-clamp-1">
                {apartment.location.neighborhood || apartment.location.city}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
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
          </div>
        </div>
      </div>

      {/* Quick Info Bottom Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-2xl">{apartment.name}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-5 h-5" />
              <span>{apartment.location.address}, {apartment.location.city}</span>
            </div>

            {apartment.averageRating > 0 && (
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{apartment.averageRating.toFixed(1)}</span>
                <span className="text-muted-foreground">
                  ({apartment.totalReviews} reviews)
                </span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 py-4 border-y">
              <div>
                <div className="text-2xl font-bold">{apartment.bedrooms}</div>
                <div className="text-sm text-muted-foreground">Bedrooms</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{apartment.bathrooms}</div>
                <div className="text-sm text-muted-foreground">Bathrooms</div>
              </div>
              <div>
                <div className="text-2xl font-bold">${apartment.pricePerNight}</div>
                <div className="text-sm text-muted-foreground">per night</div>
              </div>
            </div>

            {apartment.description && (
              <div>
                <h3 className="font-semibold mb-2">About</h3>
                <p className="text-muted-foreground">{apartment.description}</p>
              </div>
            )}

            {apartment.amenities.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {apartment.amenities.map((amenity, i) => (
                    <Badge key={i} variant="secondary">
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-secondary to-accent hover:opacity-90 font-semibold"
              onClick={handleBook}
            >
              Book Now - ${apartment.pricePerNight}/night
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default ApartmentCard;
