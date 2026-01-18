import { ExternalApartment } from "@/types";
import { Heart, MapPin, Bed, Bath, ExternalLink, Globe } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface ExternalApartmentCardProps {
  apartment: ExternalApartment;
  isActive: boolean;
}

const ExternalApartmentCard = ({ apartment, isActive }: ExternalApartmentCardProps) => {
  const handleBook = () => {
    window.open(apartment.sourceUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative w-full h-full">
      {/* Background Image or Gradient */}
      {apartment.imageUrl ? (
        <img
          src={apartment.imageUrl}
          alt={apartment.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/30" />
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/70 pointer-events-none" />

      {/* External Badge - Top Right */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <Badge className="bg-blue-500/90 backdrop-blur-sm text-white border-0 px-3 py-1.5">
          <Globe className="w-3 h-3 mr-1.5" />
          {apartment.sourceName}
        </Badge>
      </div>

      {/* External Indicator - Top Left */}
      <div className="absolute top-6 left-6">
        <Badge variant="outline" className="bg-black/50 backdrop-blur-sm text-white border-white/30">
          <ExternalLink className="w-3 h-3 mr-1" />
          External Listing
        </Badge>
      </div>

      {/* Bottom Info Preview */}
      <div className="absolute bottom-6 left-6 right-6 text-white">
        <div className="space-y-2 px-0 py-[50px]">
          <h2 className="text-2xl font-bold line-clamp-2">{apartment.name}</h2>
          
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4" />
            <span className="line-clamp-1">{apartment.location}</span>
          </div>

          {apartment.description && (
            <p className="text-sm text-white/80 line-clamp-2">{apartment.description}</p>
          )}

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              {apartment.bedrooms && (
                <div className="flex items-center gap-1">
                  <Bed className="w-4 h-4" />
                  <span>{apartment.bedrooms}</span>
                </div>
              )}
              {apartment.bathrooms && (
                <div className="flex items-center gap-1">
                  <Bath className="w-4 h-4" />
                  <span>{apartment.bathrooms}</span>
                </div>
              )}
              {apartment.price && (
                <span className="font-bold">{apartment.price}</span>
              )}
            </div>
            <Button 
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-full shadow-lg gap-2" 
              onClick={handleBook}
            >
              <ExternalLink className="w-4 h-4" />
              View on {apartment.sourceName}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExternalApartmentCard;
