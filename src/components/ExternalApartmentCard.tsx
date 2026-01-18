import { ExternalApartment } from "@/types";
import { MapPin, Bed, Bath, ExternalLink, Globe, Star, Home, Ruler, Wifi, Car, Dumbbell, PawPrint, Wind, Waves } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface ExternalApartmentCardProps {
  apartment: ExternalApartment;
  isActive: boolean;
}

const amenityIcons: Record<string, React.ReactNode> = {
  'WiFi': <Wifi className="w-3 h-3" />,
  'Parking': <Car className="w-3 h-3" />,
  'Gym': <Dumbbell className="w-3 h-3" />,
  'Pet Friendly': <PawPrint className="w-3 h-3" />,
  'A/C': <Wind className="w-3 h-3" />,
  'Pool': <Waves className="w-3 h-3" />,
};

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
        <div className="w-full h-full bg-gradient-to-br from-blue-500/30 via-purple-500/20 to-pink-500/30" />
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 pointer-events-none" />

      {/* Top Badges */}
      <div className="absolute top-6 left-6 right-6 flex items-start justify-between">
        {/* Left side badges */}
        <div className="flex flex-col gap-2">
          <Badge variant="outline" className="bg-blue-500/90 backdrop-blur-sm text-white border-0 px-3 py-1.5">
            <Globe className="w-3 h-3 mr-1.5" />
            External
          </Badge>
          {apartment.propertyType && (
            <Badge variant="outline" className="bg-black/50 backdrop-blur-sm text-white border-white/30">
              <Home className="w-3 h-3 mr-1" />
              {apartment.propertyType}
            </Badge>
          )}
        </div>

        {/* Right side - Source and Rating */}
        <div className="flex flex-col items-end gap-2">
          <Badge className="bg-black/60 backdrop-blur-sm text-white border-0 px-3 py-1.5">
            {apartment.sourceName}
          </Badge>
          {apartment.rating && (
            <Badge className="bg-yellow-500/90 backdrop-blur-sm text-black border-0 px-3 py-1.5">
              <Star className="w-3 h-3 mr-1 fill-current" />
              {apartment.rating.toFixed(1)}
              {apartment.reviewCount && (
                <span className="ml-1 text-black/70">({apartment.reviewCount})</span>
              )}
            </Badge>
          )}
        </div>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-6 left-6 right-6 text-white">
        <div className="space-y-3 px-0 py-[50px]">
          {/* Title */}
          <h2 className="text-2xl font-bold line-clamp-2 drop-shadow-lg">{apartment.name}</h2>
          
          {/* Location */}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="line-clamp-1">{apartment.location}</span>
          </div>

          {/* Property Details Row */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {apartment.bedrooms && (
              <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
                <Bed className="w-4 h-4" />
                <span>{apartment.bedrooms} bed</span>
              </div>
            )}
            {apartment.bathrooms && (
              <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
                <Bath className="w-4 h-4" />
                <span>{apartment.bathrooms} bath</span>
              </div>
            )}
            {apartment.squareFeet && (
              <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
                <Ruler className="w-4 h-4" />
                <span>{apartment.squareFeet.toLocaleString()} sqft</span>
              </div>
            )}
          </div>

          {/* Amenities */}
          {apartment.amenities && apartment.amenities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {apartment.amenities.slice(0, 5).map((amenity, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="bg-white/10 backdrop-blur-sm text-white border-white/20 text-xs"
                >
                  {amenityIcons[amenity] || null}
                  <span className={amenityIcons[amenity] ? "ml-1" : ""}>{amenity}</span>
                </Badge>
              ))}
              {apartment.amenities.length > 5 && (
                <Badge 
                  variant="outline" 
                  className="bg-white/10 backdrop-blur-sm text-white border-white/20 text-xs"
                >
                  +{apartment.amenities.length - 5} more
                </Badge>
              )}
            </div>
          )}

          {/* Description */}
          {apartment.description && (
            <p className="text-sm text-white/80 line-clamp-2">{apartment.description}</p>
          )}

          {/* Price and CTA */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {apartment.price && (
                <span className="text-2xl font-bold">{apartment.price}</span>
              )}
            </div>
            <Button 
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-full shadow-lg gap-2 transition-all hover:scale-105" 
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
