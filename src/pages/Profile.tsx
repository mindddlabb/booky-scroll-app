import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut, Mail, Phone, Star } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
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

        <Card className="p-6 space-y-6">
          {/* Profile Header */}
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile.profilePicture} />
              <AvatarFallback className="text-2xl">
                {profile.fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{profile.fullName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={profile.userType === "lister" ? "default" : "secondary"}>
                  {profile.userType === "lister" ? "Lister" : "User"}
                </Badge>
                {profile.verificationStatus && (
                  <Badge variant="outline" className="text-primary border-primary">
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Rating */}
          {profile.rating > 0 && (
            <div className="flex items-center gap-2 py-2">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="text-lg font-semibold">{profile.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">rating</span>
            </div>
          )}

          {/* Contact Info */}
          <div className="space-y-3 py-2">
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

          {/* Logout Button */}
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
