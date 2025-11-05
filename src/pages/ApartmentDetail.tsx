import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Apartment } from "@/types";
import { Loader2, ArrowLeft, MapPin, Star, Bed, Bath, Heart, Wifi, Wind, Utensils, Car, Tv, WashingMachine, MessageCircle, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addFavorite, removeFavorite } from "@/store/favoritesSlice";
import { differenceInDays, isWithinInterval, parseISO } from "date-fns";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { CarouselApi } from "@/components/ui/carousel";
import { BookingConfirmationDialog } from "@/components/BookingConfirmationDialog";
import { BookingSuccessDialog } from "@/components/BookingSuccessDialog";

const amenityIcons: Record<string, any> = {
  WiFi: Wifi,
  "Air Conditioning": Wind,
  Kitchen: Utensils,
  Parking: Car,
  TV: Tv,
  Washer: WashingMachine,
};

const ApartmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const favoriteIds = useAppSelector((state) => state.favorites.apartmentIds);
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [listerProfile, setListerProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkInDate, setCheckInDate] = useState<Date | undefined>();
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>();
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState("");

  const isFavorite = id ? favoriteIds.includes(id) : false;

  const numberOfNights = checkInDate && checkOutDate 
    ? differenceInDays(checkOutDate, checkInDate) 
    : 0;
  
  const basePrice = apartment && numberOfNights > 0 ? numberOfNights * apartment.pricePerNight : 0;
  const serviceFee = basePrice * 0.1;
  const cleaningFee = 50;
  const totalPrice = basePrice + serviceFee + cleaningFee;

  useEffect(() => {
    fetchApartment();
    fetchReviews();
    fetchBookings();
  }, [id]);

  useEffect(() => {
    if (!carouselApi) return;

    setCurrentSlide(carouselApi.selectedScrollSnap());

    carouselApi.on("select", () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

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
        
        // Fetch lister profile
        const { data: listerData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.lister_id)
          .single();
        
        if (listerData) {
          setListerProfile(listerData);
        }
      }
    } catch (error: any) {
      toast.error("Failed to load apartment details");
      console.error("Error fetching apartment:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, reviewer:profiles!reviews_reviewer_id_fkey(*)")
        .eq("apartment_id", id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      if (data) setReviews(data);
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
    }
  };

  const fetchBookings = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("apartment_id", id)
        .in("status", ["confirmed", "pending"]);

      if (error) throw error;
      if (data) setBookings(data);
    } catch (error: any) {
      console.error("Error fetching bookings:", error);
    }
  };

  const isDateBooked = (date: Date) => {
    return bookings.some((booking) => {
      const checkIn = parseISO(booking.check_in_date_time);
      const checkOut = parseISO(booking.check_out_date_time);
      return isWithinInterval(date, { start: checkIn, end: checkOut });
    });
  };

  const handleBookNow = () => {
    if (!checkInDate || !checkOutDate) {
      toast.error("Please select check-in and check-out dates");
      return;
    }

    if (numberOfNights < 1) {
      toast.error("Minimum stay is 1 night");
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmBooking = async () => {
    if (!apartment || !checkInDate || !checkOutDate) return;

    setBookingLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please login to book");
        setBookingLoading(false);
        return;
      }

      // Create booking
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          user_id: user.id,
          apartment_id: apartment.id,
          lister_id: apartment.listerId,
          check_in_date_time: checkInDate.toISOString(),
          check_out_date_time: checkOutDate.toISOString(),
          total_price: totalPrice,
          status: "confirmed",
          payment_status: "paid",
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      setCreatedBookingId(bookingData.id);
      setShowConfirmDialog(false);
      setShowSuccessDialog(true);
      toast.success("Booking confirmed successfully!");
      
      // Refresh bookings
      await fetchBookings();
    } catch (error: any) {
      toast.error(error.message || "Failed to create booking");
      console.error("Error creating booking:", error);
    } finally {
      setBookingLoading(false);
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
    <div className="min-h-screen bg-background pb-32 md:pb-20">
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
        <Carousel className="w-full h-full" setApi={setCarouselApi} opts={{ dragFree: true }}>
          <CarouselContent>
            {apartment.media.length > 0 ? (
              apartment.media.map((media, index) => (
                <CarouselItem key={index}>
                  {media.type === "video" ? (
                    <video
                      src={media.url}
                      poster={media.thumbnail}
                      className="w-full h-full object-cover"
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
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
        
        {/* Dots Indicator */}
        {apartment.media.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
            {apartment.media.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentSlide 
                    ? "w-8 bg-white" 
                    : "w-2 bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
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
          <Card>
            <CardHeader>
              <CardTitle>Amenities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {apartment.amenities.map((amenity, i) => {
                  const Icon = amenityIcons[amenity] || Star;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-primary" />
                      <span className="text-sm">{amenity}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendar Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Select Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Check-in</p>
              <Calendar
                mode="single"
                selected={checkInDate}
                onSelect={setCheckInDate}
                disabled={(date) => date < new Date() || isDateBooked(date)}
                className="rounded-md border pointer-events-auto"
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Check-out</p>
              <Calendar
                mode="single"
                selected={checkOutDate}
                onSelect={setCheckOutDate}
                disabled={(date) => !checkInDate || date <= checkInDate || isDateBooked(date)}
                className="rounded-md border pointer-events-auto"
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing Card */}
        {numberOfNights > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Price Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  ${apartment.pricePerNight} x {numberOfNights} nights
                </span>
                <span className="font-semibold">${basePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service fee (10%)</span>
                <span className="font-semibold">${serviceFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cleaning fee</span>
                <span className="font-semibold">${cleaningFee.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-bold">Total</span>
                <span className="font-bold">${totalPrice.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lister Info Card */}
        {listerProfile && (
          <Card>
            <CardHeader>
              <CardTitle>Hosted by</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={listerProfile.profile_picture} />
                  <AvatarFallback>{listerProfile.full_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{listerProfile.full_name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{listerProfile.rating?.toFixed(1) || "New host"}</span>
                  </div>
                </div>
              </div>
              <Button className="w-full" variant="outline">
                <MessageCircle className="w-4 h-4 mr-2" />
                Message Host
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Reviews Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Reviews</span>
              {apartment.averageRating > 0 && (
                <div className="flex items-center gap-2 text-base">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span>{apartment.averageRating.toFixed(1)} ({apartment.totalReviews})</span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {reviews.length > 0 ? (
              <>
                {reviews.map((review) => (
                  <div key={review.id} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={review.reviewer?.profile_picture} />
                        <AvatarFallback>{review.reviewer?.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{review.reviewer?.full_name}</p>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-muted-foreground">{review.overall_rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground pl-13">{review.comment}</p>
                    )}
                    <Separator />
                  </div>
                ))}
                {apartment.totalReviews > 3 && (
                  <Button variant="outline" className="w-full">
                    See All {apartment.totalReviews} Reviews
                  </Button>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-center py-4">No reviews yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xl font-bold">
              {numberOfNights > 0 ? (
                <>
                  ${totalPrice.toFixed(0)}
                  <span className="text-sm font-normal text-muted-foreground"> total</span>
                </>
              ) : (
                <>
                  ${apartment.pricePerNight}
                  <span className="text-sm font-normal text-muted-foreground">/night</span>
                </>
              )}
            </div>
          </div>
          <Button
            size="lg"
            className="bg-gradient-to-r from-secondary to-accent hover:opacity-90 font-semibold flex-1 max-w-xs"
            disabled={!checkInDate || !checkOutDate}
            onClick={handleBookNow}
          >
            Book Now
          </Button>
        </div>
      </div>

      {/* Booking Confirmation Dialog */}
      {apartment && checkInDate && checkOutDate && (
        <BookingConfirmationDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          onConfirm={handleConfirmBooking}
          apartmentName={apartment.name}
          apartmentAddress={`${apartment.location.address}, ${apartment.location.city}`}
          bedrooms={apartment.bedrooms}
          bathrooms={apartment.bathrooms}
          checkInDate={checkInDate}
          checkOutDate={checkOutDate}
          numberOfNights={numberOfNights}
          basePrice={basePrice}
          serviceFee={serviceFee}
          cleaningFee={cleaningFee}
          totalPrice={totalPrice}
          isLoading={bookingLoading}
        />
      )}

      {/* Booking Success Dialog */}
      {apartment && checkInDate && checkOutDate && (
        <BookingSuccessDialog
          open={showSuccessDialog}
          onOpenChange={setShowSuccessDialog}
          bookingId={createdBookingId}
          apartmentName={apartment.name}
          apartmentAddress={`${apartment.location.address}, ${apartment.location.city}`}
          checkInDate={checkInDate}
          checkOutDate={checkOutDate}
          totalPrice={totalPrice}
        />
      )}
    </div>
  );
};

export default ApartmentDetail;
