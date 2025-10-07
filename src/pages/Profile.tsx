import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Booking, Apartment } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  LogOut,
  Mail,
  Phone,
  Star,
  Edit,
  Bell,
  Globe,
  HelpCircle,
  Shield,
  FileText,
  Calendar,
  MapPin,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import ProfileEditDialog from "@/components/ProfileEditDialog";
import { format, differenceInDays, differenceInHours } from "date-fns";
import ListerStats from "@/components/ListerStats";
import ListingCard from "@/components/ListingCard";
import { Building2 } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<
    (Booking & { apartments: Apartment }) | null
  >(null);
  const [bookingHistory, setBookingHistory] = useState<
    (Booking & { apartments: Apartment })[]
  >([]);
  const [notifications, setNotifications] = useState(true);
  const [listings, setListings] = useState<Apartment[]>([]);
  const [listerStats, setListerStats] = useState({
    totalListings: 0,
    averageRating: 0,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      if (profile.userType === "lister") {
        fetchListings();
      } else {
        fetchCurrentBooking();
        fetchBookingHistory();
      }
    }
  }, [profile]);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      const transformedProfile: User = {
        id: data.id,
        email: data.email,
        phone: data.phone || undefined,
        fullName: data.full_name,
        profilePicture: data.profile_picture || undefined,
        userType: data.user_type,
        rating: Number(data.rating),
        verificationStatus: data.verification_status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setProfile(transformedProfile);
    } catch (error: any) {
      toast.error("Failed to load profile");
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentBooking = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("bookings")
        .select("*, apartments(*)")
        .eq("user_id", user.id)
        .eq("status", "checked_in")
        .gte("check_out_date_time", now)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setCurrentBooking(data as any);
    } catch (error: any) {
      console.error("Error fetching current booking:", error);
    }
  };

  const fetchBookingHistory = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("bookings")
        .select("*, apartments(*)")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("check_out_date_time", { ascending: false })
        .limit(6);

      if (error) throw error;
      setBookingHistory((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching booking history:", error);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast.success("Logged out successfully");
      navigate("/");
    } catch (error: any) {
      toast.error("Failed to logout");
    }
  };

  const fetchListings = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("apartments")
        .select("*")
        .eq("lister_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const transformedListings: Apartment[] = (data || []).map((apt) => ({
        id: apt.id,
        listerId: apt.lister_id,
        name: apt.name,
        description: apt.description,
        location: {
          address: apt.address,
          city: apt.city,
          neighborhood: apt.neighborhood,
          lat: apt.latitude,
          lng: apt.longitude,
        },
        pricePerNight: Number(apt.price_per_night),
        bedrooms: apt.bedrooms,
        bathrooms: apt.bathrooms,
        amenities: apt.amenities || [],
        media: Array.isArray(apt.media)
          ? apt.media.map((m: any) => ({
              type: m.type || "image",
              url: m.url || m,
              thumbnail: m.thumbnail,
            }))
          : [],
        availabilityStatus: apt.availability_status,
        averageRating: Number(apt.average_rating),
        totalReviews: apt.total_reviews,
        createdAt: apt.created_at,
        updatedAt: apt.updated_at,
      }));

      setListings(transformedListings);
      setListerStats({
        totalListings: transformedListings.length,
        averageRating: profile?.rating || 0,
      });
    } catch (error: any) {
      console.error("Error fetching listings:", error);
    }
  };

  const handleListingClick = async (listing: Apartment) => {
    if (listing.availabilityStatus === "booked") {
      // Fetch the active booking for this listing
      try {
        const { data: bookingData, error } = await supabase
          .from("bookings")
          .select("id")
          .eq("apartment_id", listing.id)
          .in("status", ["pending", "confirmed", "checked_in"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (bookingData) {
          navigate(`/booking/${bookingData.id}`);
        } else {
          navigate(`/apartment/${listing.id}`);
        }
      } catch (error) {
        console.error("Error fetching booking:", error);
        navigate(`/apartment/${listing.id}`);
      }
    } else {
      navigate(`/apartment/${listing.id}`);
    }
  };

  const handleStatusChange = async (
    listingId: string,
    status: "available" | "unavailable"
  ) => {
    try {
      const { error } = await supabase
        .from("apartments")
        .update({ availability_status: status })
        .eq("id", listingId);

      if (error) throw error;

      toast.success("Status updated successfully");
      fetchListings();
    } catch (error: any) {
      toast.error("Failed to update status");
      console.error(error);
    }
  };

  const getCheckoutCountdown = (checkOutDateTime: string) => {
    const now = new Date();
    const checkOut = new Date(checkOutDateTime);
    const days = differenceInDays(checkOut, now);
    const hours = differenceInHours(checkOut, now) % 24;

    if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""} ${hours} hour${hours !== 1 ? "s" : ""}`;
    }
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background pb-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-6">
      <div className="max-w-2xl mx-auto px-6 space-y-6">
        <h1 className="text-3xl font-bold">Profile</h1>

        {/* Profile Header */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile.profilePicture} />
              <AvatarFallback className="text-2xl">
                {profile.fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">{profile.fullName}</h2>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={
                    profile.userType === "lister" ? "default" : "secondary"
                  }
                >
                  {profile.userType === "lister" ? "Lister" : "User"}
                </Badge>
                {profile.verificationStatus && (
                  <Badge variant="outline" className="text-primary border-primary">
                    Verified
                  </Badge>
                )}
              </div>
            </div>
            <Button onClick={() => setEditDialogOpen(true)}>
              Edit Profile
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Mail className="w-5 h-5" />
              <span>{profile.email}</span>
            </div>
            {profile.phone && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Phone className="w-5 h-5" />
                <span>{profile.phone}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Lister Stats */}
        {profile.userType === "lister" && (
          <ListerStats
            totalListings={listerStats.totalListings}
            averageRating={listerStats.averageRating}
          />
        )}

        {/* Rating Section (Users only) */}
        {profile.userType === "user" && (
          <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Your Guest Rating</h3>
          </div>
          {profile.rating > 0 ? (
            <>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Star className="w-8 h-8 fill-yellow-400 text-yellow-400" />
                  <span className="text-3xl font-bold">
                    {profile.rating.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">/5.0</span>
                </div>
              </div>
              <Progress value={(profile.rating / 5) * 100} className="h-2" />
            </>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Star className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No ratings yet</p>
              <p className="text-sm">Complete bookings to receive ratings</p>
            </div>
          )}
        </Card>
        )}

        {/* Lister My Listings Section */}
        {profile.userType === "lister" && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">My Listings</h3>
              <Button
                size="sm"
                onClick={() => navigate("/listing/new")}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Listing
              </Button>
            </div>
            {listings.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {listings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    id={listing.id}
                    image={listing.media?.[0]?.url || "/placeholder.svg"}
                    name={listing.name}
                    location={`${listing.location.city}, ${listing.location.neighborhood || ""}`}
                    status={listing.availabilityStatus}
                    views={0}
                    onEdit={() => navigate(`/listing/edit/${listing.id}`)}
                    onStatusChange={(status) =>
                      handleStatusChange(listing.id, status)
                    }
                    onClick={() => handleListingClick(listing)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>No listings yet</p>
                <p className="text-sm">Create your first listing to get started</p>
              </div>
            )}
          </Card>
        )}

        {/* Currently Booked Section (Users only) */}
        {profile.userType === "user" && currentBooking && (
          <Card className="p-6 space-y-4 border-primary">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Currently Staying</h3>
              <Badge className="bg-green-500">Active</Badge>
            </div>
            <div
              className="flex gap-4 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate(`/booking/${currentBooking.id}`)}
            >
              <img
                src={
                  currentBooking.apartments.media?.[0]?.url ||
                  "/placeholder.svg"
                }
                alt={currentBooking.apartments.name}
                className="w-24 h-24 object-cover rounded-lg"
              />
              <div className="flex-1">
                <h4 className="font-semibold">
                  {currentBooking.apartments.name}
                </h4>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="w-4 h-4" />
                  <span>{currentBooking.apartments.location.city}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Check-out in{" "}
                    {getCheckoutCountdown(currentBooking.checkOutDateTime)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Booking History (Users only) */}
        {profile.userType === "user" && bookingHistory.length > 0 && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Booking History</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/bookings")}
              >
                View All
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {bookingHistory.map((booking) => (
                <div
                  key={booking.id}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => navigate(`/apartment/${booking.apartmentId}`)}
                >
                  <img
                    src={
                      booking.apartments.media?.[0]?.url || "/placeholder.svg"
                    }
                    alt={booking.apartments.name}
                    className="w-full h-32 object-cover rounded-lg mb-2"
                  />
                  <h4 className="font-semibold text-sm line-clamp-1">
                    {booking.apartments.name}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {format(
                      new Date(booking.checkInDateTime),
                      "MMM dd, yyyy"
                    )}
                  </p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {booking.apartments.availabilityStatus === "available"
                      ? "Available"
                      : "Booked"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Settings */}
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Settings</h3>
          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span>Notifications</span>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>

            <div className="flex items-center justify-between cursor-pointer hover:bg-accent p-2 rounded-md -mx-2">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <span>Language</span>
              </div>
              <span className="text-sm text-muted-foreground">English</span>
            </div>

            <div
              className="flex items-center justify-between cursor-pointer hover:bg-accent p-2 rounded-md -mx-2"
              onClick={() => toast.info("Help & Support coming soon")}
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-muted-foreground" />
                <span>Help & Support</span>
              </div>
            </div>

            <div
              className="flex items-center justify-between cursor-pointer hover:bg-accent p-2 rounded-md -mx-2"
              onClick={() => toast.info("Privacy Policy coming soon")}
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <span>Privacy Policy</span>
              </div>
            </div>

            <div
              className="flex items-center justify-between cursor-pointer hover:bg-accent p-2 rounded-md -mx-2"
              onClick={() => toast.info("Terms of Service coming soon")}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <span>Terms of Service</span>
              </div>
            </div>
          </div>

          <Separator />

          <Button
            variant="destructive"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </Card>
      </div>

      {/* Profile Edit Dialog */}
      {profile && (
        <ProfileEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          profile={profile}
          onProfileUpdate={fetchProfile}
        />
      )}
    </div>
  );
};

export default Profile;
