import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const AMENITIES = [
  "WiFi",
  "Parking",
  "AC",
  "Kitchen",
  "Washer",
  "TV",
  "Pool",
  "Gym",
  "Pet Friendly",
  "Balcony",
];

const ListingForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    neighborhood: "",
    pricePerNight: "",
    bedrooms: "",
    bathrooms: "",
    amenities: [] as string[],
    availabilityStatus: "available",
    media: [] as { url: string; type: string }[],
  });

  useEffect(() => {
    if (id) {
      fetchListing();
    }
  }, [id]);

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase
        .from("apartments")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      const mediaArray = Array.isArray(data.media) 
        ? data.media.map((m: any) => ({ url: m.url || m, type: m.type || "image" }))
        : [];

      setFormData({
        name: data.name,
        description: data.description || "",
        address: data.address,
        city: data.city,
        neighborhood: data.neighborhood || "",
        pricePerNight: data.price_per_night.toString(),
        bedrooms: data.bedrooms.toString(),
        bathrooms: data.bathrooms.toString(),
        amenities: data.amenities || [],
        availabilityStatus: data.availability_status,
        media: mediaArray,
      });
    } catch (error: any) {
      toast.error("Failed to load listing");
      console.error(error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (formData.media.length + files.length > 10) {
      toast.error("Maximum 10 images allowed");
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("profile-pictures")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("profile-pictures").getPublicUrl(filePath);

        return { url: publicUrl, type: "image" };
      });

      const uploadedMedia = await Promise.all(uploadPromises);
      setFormData((prev) => ({
        ...prev,
        media: [...prev.media, ...uploadedMedia],
      }));

      toast.success("Images uploaded successfully");
    } catch (error: any) {
      toast.error("Failed to upload images");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index),
    }));
  };

  const toggleAmenity = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (
      !formData.name ||
      !formData.address ||
      !formData.city ||
      !formData.pricePerNight ||
      !formData.bedrooms ||
      !formData.bathrooms
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    if (formData.media.length === 0) {
      toast.error("At least 1 image is required");
      return;
    }

    if (Number(formData.pricePerNight) <= 0) {
      toast.error("Price must be greater than 0");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const apartmentData = {
        name: formData.name,
        description: formData.description || null,
        address: formData.address,
        city: formData.city,
        neighborhood: formData.neighborhood || null,
        price_per_night: Number(formData.pricePerNight),
        bedrooms: Number(formData.bedrooms),
        bathrooms: Number(formData.bathrooms),
        amenities: formData.amenities,
        availability_status: formData.availabilityStatus as "available" | "unavailable",
        media: formData.media,
        lister_id: user.id,
      };

      if (id) {
        const { error } = await supabase
          .from("apartments")
          .update(apartmentData)
          .eq("id", id);

        if (error) throw error;
        toast.success("Listing updated successfully");
      } else {
        const { error } = await supabase
          .from("apartments")
          .insert(apartmentData);

        if (error) throw error;
        toast.success("Listing created successfully");
      }

      navigate("/profile");
    } catch (error: any) {
      toast.error("Failed to save listing");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-6">
      <div className="max-w-2xl mx-auto px-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/profile")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold">
            {id ? "Edit Listing" : "Add New Listing"}
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">
                  Apartment Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Modern Downtown Apartment"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe your property..."
                  maxLength={500}
                  rows={4}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {formData.description.length}/500 characters
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bedrooms">
                    Bedrooms <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    min="0"
                    value={formData.bedrooms}
                    onChange={(e) =>
                      setFormData({ ...formData, bedrooms: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="bathrooms">
                    Bathrooms <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    min="0"
                    value={formData.bathrooms}
                    onChange={(e) =>
                      setFormData({ ...formData, bathrooms: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="price">
                  Price per Night ($){" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  min="1"
                  value={formData.pricePerNight}
                  onChange={(e) =>
                    setFormData({ ...formData, pricePerNight: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Location</h3>
              <div>
                <Label htmlFor="address">
                  Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">
                    City <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="neighborhood">Neighborhood</Label>
                  <Input
                    id="neighborhood"
                    value={formData.neighborhood}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        neighborhood: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Amenities</h3>
              <div className="grid grid-cols-2 gap-3">
                {AMENITIES.map((amenity) => (
                  <div key={amenity} className="flex items-center gap-2">
                    <Checkbox
                      id={amenity}
                      checked={formData.amenities.includes(amenity)}
                      onCheckedChange={() => toggleAmenity(amenity)}
                    />
                    <Label htmlFor={amenity} className="cursor-pointer">
                      {amenity}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Media Upload */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                Photos <span className="text-destructive">*</span>
              </h3>
              <p className="text-sm text-muted-foreground">
                Upload up to 10 images (at least 1 required)
              </p>

              <div className="grid grid-cols-3 gap-4">
                {formData.media.map((item, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={item.url}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={() => removeMedia(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                {formData.media.length < 10 && (
                  <label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-accent transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                    {uploading ? (
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">
                          Upload
                        </span>
                      </>
                    )}
                  </label>
                )}
              </div>
            </div>

            {/* Availability */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Availability</h3>
              <RadioGroup
                value={formData.availabilityStatus}
                onValueChange={(value) =>
                  setFormData({ ...formData, availabilityStatus: value })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="available" id="available" />
                  <Label htmlFor="available">Available</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="unavailable" id="unavailable" />
                  <Label htmlFor="unavailable">Unavailable</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : id ? (
                "Update Listing"
              ) : (
                "Create Listing"
              )}
            </Button>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default ListingForm;
