import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, MessageCircle, Navigation, FileText, Check } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, differenceInHours, differenceInMinutes } from "date-fns";

const BookingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchBookingDetails();
    
    // Update time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, [id]);

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
    // Navigate to chat or inbox
    navigate("/inbox");
    toast.info("Opening messages...");
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

  return (
    <div className="min-h-screen bg-background pb-20">
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
        </div>
      </div>
    </div>
  );
};

export default BookingDetails;
