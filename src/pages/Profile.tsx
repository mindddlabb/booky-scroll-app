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
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import ProfileEditDialog from "@/components/ProfileEditDialog";
import { format, differenceInDays, differenceInHours } from "date-fns";

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

  useEffect(() => {
    fetchProfile();
    fetchCurrentBooking();
    fetchBookingHistory();
  }, []);

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

        {/* Rating Section */}
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

        {/* Currently Booked Section */}
        {currentBooking && (
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

        {/* Booking History */}
        {bookingHistory.length > 0 && (
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
