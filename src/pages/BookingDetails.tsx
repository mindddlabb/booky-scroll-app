import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, MessageCircle, Navigation, FileText, Check, AlertTriangle, Star } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { ReviewForm } from "@/components/ReviewForm";
import { ReviewsSection } from "@/components/ReviewsSection";

const BookingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [guestProfile, setGuestProfile] = useState<any>(null);
  const [isLister, setIsLister] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [existingReview, setExistingReview] = useState<any>(null);

  useEffect(() => {
    getCurrentUser();
    fetchBookingDetails();
    
    // Update time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, [id]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
    }
  };

  useEffect(() => {
    if (booking) {
      updateBookingStatus();
    }
  }, [currentTime, booking?.id]);

  const fetchBookingDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          apartments (
            id,
            name,
            address,
            city,
            media,
            description
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      setBooking(data);
      
      // Check if current user is the lister
      const { data: { user } } = await supabase.auth.getUser();
      if (user && data.lister_id === user.id) {
        setIsLister(true);
        // Fetch guest profile
        const { data: guestData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user_id)
          .single();
        setGuestProfile(guestData);
      }

      // Check if user has already reviewed
      if (user) {
        const { data: reviewData } = await supabase
          .from('reviews')
          .select('*')
          .eq('booking_id', id)
          .eq('reviewer_id', user.id)
          .maybeSingle();

        setExistingReview(reviewData);

        // Show review prompt if booking is completed and no review exists
        if (data.status === 'completed' && !reviewData) {
          setShowReviewForm(true);
        }
      }
    } catch (error: any) {
      toast.error("Failed to load booking details");
      console.error("Error fetching booking:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async () => {
    if (!booking) return;

    const now = new Date();
    const checkIn = new Date(booking.check_in_date_time);
    const checkOut = new Date(booking.check_out_date_time);

    let newStatus = booking.status;

    if (now >= checkIn && now < checkOut && booking.status !== 'checked_in') {
      newStatus = 'checked_in';
    } else if (now >= checkOut && booking.status !== 'completed') {
      newStatus = 'completed';
    }

    if (newStatus !== booking.status) {
      try {
        const { error } = await supabase
          .from("bookings")
          .update({ status: newStatus })
          .eq("id", booking.id);

        if (error) throw error;

        setBooking({ ...booking, status: newStatus });
        toast.success(`Booking status updated to ${newStatus}`);
      } catch (error) {
        console.error("Error updating booking status:", error);
      }
    }
  };

  const getStatusInfo = () => {
    if (!booking) return null;

    const now = currentTime;
    const checkIn = new Date(booking.check_in_date_time);
    const checkOut = new Date(booking.check_out_date_time);

    if (now < checkIn) {
      return {
        message: `Check-in: ${format(checkIn, "MMM d, yyyy 'at' h:mm a")}`,
        badge: "Confirmed",
        variant: "default" as const,
      };
    } else if (now >= checkIn && now < checkOut) {
      const daysLeft = differenceInDays(checkOut, now);
      const hoursLeft = differenceInHours(checkOut, now) % 24;
      
      return {
        message: "Checked In ✓",
        countdown: `Check-out in ${daysLeft} days ${hoursLeft} hours`,
        badge: "Checked In",
        variant: "default" as const,
      };
    } else {
      return {
        message: "Booking Completed",
        badge: "Completed",
        variant: "outline" as const,
      };
    }
  };

  const handleMessageLister = () => {
    navigate("/inbox");
    toast.info("Opening messages...");
  };

  const handleMessageGuest = () => {
    navigate("/inbox");
    toast.info("Opening messages with guest...");
  };

  const handleGetDirections = () => {
    if (booking?.apartments?.address) {
      const address = encodeURIComponent(`${booking.apartments.address}, ${booking.apartments.city}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
    }
  };

  const handleViewReceipt = () => {
    toast.info("Receipt view coming soon");
  };

  const handleReportIssue = () => {
    toast.info("Report issue functionality coming soon");
  };

  const handleReviewSuccess = () => {
    setShowReviewForm(false);
    fetchBookingDetails();
  };

  const handleMarkAvailable = async () => {
    try {
      const { error } = await supabase
        .from("apartments")
        .update({ availability_status: "available" })
        .eq("id", booking.apartment_id);

      if (error) throw error;

      toast.success("Apartment marked as available");
    } catch (error) {
      toast.error("Failed to update apartment status");
      console.error("Error:", error);
    }
  };

  const getTotalNights = () => {
    if (!booking) return 0;
    const checkIn = new Date(booking.check_in_date_time);
    const checkOut = new Date(booking.check_out_date_time);
    return differenceInDays(checkOut, checkIn);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Booking not found</h2>
          <Button onClick={() => navigate("/bookings")}>Back to Bookings</Button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo();

  // Lister View
  if (isLister) {
    return (
      <div className="min-h-screen bg-background pb-20">
        {/* Review Form Dialog */}
        <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                <div className="flex items-center gap-2">
                  <Star className="text-primary" />
                  Rate your experience
                </div>
              </DialogTitle>
            </DialogHeader>
            <ReviewForm
              bookingId={booking.id}
              apartmentId={booking.apartments?.id}
              revieweeId={booking.user_id}
              reviewType="lister_reviews_user"
              userName={guestProfile?.full_name}
              onSuccess={handleReviewSuccess}
            />
          </DialogContent>
        </Dialog>

        <div className="relative">
          {/* Media Gallery */}
          <div className="h-64 bg-muted relative">
            {booking.apartments?.media?.[0]?.url ? (
              <img
                src={booking.apartments.media[0].url}
                alt={booking.apartments.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm"
              onClick={() => navigate("/profile")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="max-w-2xl mx-auto px-6 space-y-6 -mt-8">
            {/* Apartment Info */}
            <Card className="p-6">
              <h1 className="text-2xl font-bold mb-1">{booking.apartments?.name}</h1>
              <p className="text-muted-foreground">{booking.apartments?.address}, {booking.apartments?.city}</p>
            </Card>

            {/* Guest Info Card */}
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold text-lg">Guest Information</h3>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={guestProfile?.profile_picture} />
                  <AvatarFallback>
                    {guestProfile?.full_name?.charAt(0) || "G"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{guestProfile?.full_name}</p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{guestProfile?.rating?.toFixed(1) || "New"}</span>
                  </div>
                </div>
                <Button onClick={handleMessageGuest}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message
                </Button>
              </div>
            </Card>

            {/* Booking Timeline */}
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold text-lg">Booking Timeline</h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Booking Created</p>
                  <p className="font-medium">
                    {format(new Date(booking.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>

                <Separator />

                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Badge variant={statusInfo?.variant} className="mb-2">
                      {statusInfo?.badge}
                    </Badge>
                    <div className="flex items-center gap-2 text-lg font-semibold mb-2">
                      {statusInfo?.message.includes("Checked In") && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                      {statusInfo?.message}
                    </div>
                    {statusInfo?.countdown && (
                      <p className="text-muted-foreground">{statusInfo.countdown}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Check-in</p>
                    <p className="font-semibold text-lg">
                      {format(new Date(booking.check_in_date_time), "MMM d, yyyy")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(booking.check_in_date_time), "h:mm a")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Check-out</p>
                    <p className="font-semibold text-lg">
                      {format(new Date(booking.check_out_date_time), "MMM d, yyyy")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(booking.check_out_date_time), "h:mm a")}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-sm text-muted-foreground">Total Nights</p>
                  <p className="font-semibold">{getTotalNights()} nights</p>
                </div>
              </div>
            </Card>

            {/* Payment Info */}
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold text-lg">Payment Information</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold text-primary">${booking.total_price}</p>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">Payment Status</p>
                  <Badge variant={booking.payment_status === 'completed' ? 'default' : 'outline'}>
                    {booking.payment_status}
                  </Badge>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Transaction ID</p>
                  <p className="font-mono text-sm">{booking.id.slice(0, 8)}</p>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleViewReceipt}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Receipt
                </Button>
              </div>
            </Card>

            {/* Actions */}
            <div className="space-y-3">
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleMessageGuest}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Message Guest
              </Button>
              
              <Button 
                className="w-full" 
                variant="outline" 
                size="lg"
                onClick={handleReportIssue}
              >
                <AlertTriangle className="w-5 h-5 mr-2" />
                Report Issue
              </Button>

              {booking.status === 'completed' && (
                <Button 
                  className="w-full" 
                  variant="secondary" 
                  size="lg"
                  onClick={handleMarkAvailable}
                >
                  Mark Available
                </Button>
              )}
            </div>

            {/* Reviews Section */}
            {booking.status === 'completed' && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Reviews</h2>
                  {!existingReview && (
                    <Button onClick={() => setShowReviewForm(true)} variant="outline" size="sm">
                      <Star size={16} className="mr-2" />
                      Leave Review
                    </Button>
                  )}
                </div>
                <ReviewsSection apartmentId={booking.apartments?.id} />
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Guest View (original)
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Review Form Dialog */}
      <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <Star className="text-primary" />
                Rate your experience
              </div>
            </DialogTitle>
          </DialogHeader>
          <ReviewForm
            bookingId={booking.id}
            apartmentId={booking.apartments?.id}
            revieweeId={booking.lister_id}
            reviewType="user_reviews_lister"
            apartmentName={booking.apartments?.name}
            onSuccess={handleReviewSuccess}
          />
        </DialogContent>
      </Dialog>

      <div className="relative">
        {/* Media Gallery */}
        <div className="h-64 bg-muted relative">
          {booking.apartments?.media?.[0]?.url ? (
            <img
              src={booking.apartments.media[0].url}
              alt={booking.apartments.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm"
            onClick={() => navigate("/bookings")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-6 space-y-6 -mt-8">
          <Card className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">{booking.apartments?.name}</h1>
                <p className="text-muted-foreground">{booking.apartments?.address}, {booking.apartments?.city}</p>
              </div>
              <Badge variant={statusInfo?.variant}>{statusInfo?.badge}</Badge>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-2 text-lg font-semibold">
                {statusInfo?.message.includes("Checked In") && (
                  <Check className="w-5 h-5 text-primary" />
                )}
                {statusInfo?.message}
              </div>
              
              {statusInfo?.countdown && (
                <p className="text-muted-foreground">{statusInfo.countdown}</p>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-sm text-muted-foreground">Check-in</p>
                  <p className="font-semibold">
                    {format(new Date(booking.check_in_date_time), "MMM d, h:mm a")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-out</p>
                  <p className="font-semibold">
                    {format(new Date(booking.check_out_date_time), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-sm text-muted-foreground">Total Price</p>
                <p className="text-2xl font-bold text-primary">${booking.total_price}</p>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleMessageLister}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Message Lister
            </Button>
            
            <Button 
              className="w-full" 
              variant="outline" 
              size="lg"
              onClick={handleGetDirections}
            >
              <Navigation className="w-5 h-5 mr-2" />
              Get Directions
            </Button>
            
            <Button 
              className="w-full" 
              variant="outline" 
              size="lg"
              onClick={handleViewReceipt}
            >
              <FileText className="w-5 h-5 mr-2" />
              View Booking Receipt
            </Button>
          </div>

          {/* Access Instructions */}
          {booking.apartments?.description && (
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Access Instructions</h3>
              <p className="text-sm text-muted-foreground">
                {booking.apartments.description}
              </p>
            </Card>
          )}

          {/* Reviews Section */}
          {booking.status === 'completed' && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Reviews</h2>
                {!existingReview && (
                  <Button onClick={() => setShowReviewForm(true)} variant="outline" size="sm">
                    <Star size={16} className="mr-2" />
                    Leave Review
                  </Button>
                )}
              </div>
              <ReviewsSection apartmentId={booking.apartments?.id} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingDetails;
