import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Booking } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Calendar, MapPin, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const Bookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please login to view bookings");
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          apartments (
            name,
            address,
            city,
            media
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const transformedBookings: Booking[] = (data || []).map((booking) => ({
        id: booking.id,
        userId: booking.user_id,
        apartmentId: booking.apartment_id,
        listerId: booking.lister_id,
        checkInDateTime: booking.check_in_date_time,
        checkOutDateTime: booking.check_out_date_time,
        totalPrice: Number(booking.total_price),
        status: booking.status,
        paymentStatus: booking.payment_status,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at,
      }));

      setBookings(transformedBookings);
    } catch (error: any) {
      toast.error("Failed to load bookings");
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const upcomingBookings = bookings.filter(b => new Date(b.checkInDateTime) > new Date() && b.status !== 'completed');
  const ongoingBookings = bookings.filter(b => b.status === 'checked_in');
  const pastBookings = bookings.filter(b => b.status === 'completed');

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background pb-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderBookingCard = (booking: any) => (
    <Card 
      key={booking.id} 
      className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => navigate(`/booking/${booking.id}`)}
    >
      <div className="flex gap-4">
        <div className="w-24 h-24 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
          {booking.apartments?.media?.[0]?.url ? (
            <img
              src={booking.apartments.media[0].url}
              alt={booking.apartments.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
          )}
        </div>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold">{booking.apartments?.name}</h3>
            <Badge variant={
              booking.status === "confirmed" ? "default" :
              booking.status === "checked_in" ? "default" :
              booking.status === "completed" ? "outline" :
              "destructive"
            }>
              {booking.status === "checked_in" ? "Checked In" : booking.status}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{booking.apartments?.city}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <p>
                {format(new Date(booking.checkInDateTime), "MMM d")} - {format(new Date(booking.checkOutDateTime), "MMM d, yyyy")}
              </p>
              <p className="font-semibold text-primary mt-1">
                ${booking.totalPrice}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </Card>
  );

  const renderEmptyState = (message: string) => (
    <Card className="p-12 text-center">
      <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-xl font-semibold mb-2">{message}</h3>
      <p className="text-muted-foreground">
        {message === "No bookings yet" 
          ? "Start exploring apartments to make your first booking"
          : "Check back later for updates"}
      </p>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pb-20 pt-6">
      <div className="max-w-2xl mx-auto px-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">My Bookings</h1>
          <button 
            onClick={() => fetchBookings(true)}
            disabled={refreshing}
            className="text-sm text-primary hover:underline disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="ongoing">
              Ongoing ({ongoingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastBookings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4 mt-6">
            {upcomingBookings.length === 0 ? (
              renderEmptyState("No upcoming bookings")
            ) : (
              upcomingBookings.map(renderBookingCard)
            )}
          </TabsContent>

          <TabsContent value="ongoing" className="space-y-4 mt-6">
            {ongoingBookings.length === 0 ? (
              renderEmptyState("No ongoing bookings")
            ) : (
              ongoingBookings.map(renderBookingCard)
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4 mt-6">
            {pastBookings.length === 0 ? (
              renderEmptyState("No past bookings")
            ) : (
              pastBookings.map(renderBookingCard)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Bookings;
