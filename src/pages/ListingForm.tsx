import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Upload, X, Loader2, GripVertical, Eye, Video, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import imageCompression from "browser-image-compression";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ApartmentCard from "@/components/ApartmentCard";
import { Apartment, Media, MediaType } from "@/types";

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

interface SortableMediaItemProps {
  id: number;
  item: Media;
  index: number;
  onRemove: (index: number) => void;
}

const SortableMediaItem = ({
  id,
  item,
  index,
  onRemove,
}: SortableMediaItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative aspect-square group"
    >
      {item.type === "video" ? (
        <video
          src={item.url}
          className="w-full h-full object-cover rounded-lg"
          controls
        />
      ) : (
        <img
          src={item.url}
          alt={`Upload ${index + 1}`}
          className="w-full h-full object-cover rounded-lg"
        />
      )}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 p-1 bg-background/80 backdrop-blur-sm rounded cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <Button
        type="button"
        size="icon"
        variant="destructive"
        className="absolute top-2 right-2 h-8 w-8"
        onClick={() => onRemove(index)}
      >
        <X className="w-4 h-4" />
      </Button>
      <div className="absolute bottom-2 left-2 px-2 py-1 bg-background/80 backdrop-blur-sm rounded text-xs font-medium">
        {item.type === "video" ? "Video" : "Image"} {index + 1}
      </div>
    </div>
  );
};

const ListingForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    media: [] as Media[],
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
        ? data.media.map((m: any) => ({ 
            url: m.url || m, 
            type: (m.type || "image") as MediaType,
            thumbnail: m.thumbnail 
          } as Media))
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

  // Generate video thumbnail
  const generateVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      
      video.onloadedmetadata = () => {
        video.currentTime = 1; // Capture at 1 second
      };
      
      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx?.drawImage(video, 0, 0);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
        resolve(thumbnail);
      };
      
      video.onerror = () => {
        resolve(''); // Return empty on error
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (formData.media.length + files.length > 10) {
      toast.error("Maximum 10 media files allowed");
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        let processedFile = file;

        // Validate file size (50MB max)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
          toast.error(`${file.name} exceeds 50MB limit`);
          return null;
        }

        // Compress images larger than 2MB
        if (file.type.startsWith("image/") && file.size > 2 * 1024 * 1024) {
          toast.info(`Compressing ${file.name}...`);
          try {
            processedFile = await imageCompression(file, {
              maxSizeMB: 2,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
            });
          } catch (compressionError) {
            console.error("Compression error:", compressionError);
            toast.warning(`Could not compress ${file.name}, uploading original`);
          }
        }

        // Warn for large videos (but still upload)
        if (file.type.startsWith("video/") && file.size > 10 * 1024 * 1024) {
          toast.warning(`${file.name} is large (${(file.size / 1024 / 1024).toFixed(1)}MB). Upload may take longer.`);
        }

        const fileExt = processedFile.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("profile-pictures")
          .upload(filePath, processedFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("profile-pictures").getPublicUrl(filePath);

        const mediaType: MediaType = file.type.startsWith("video/") ? "video" : "image";
        
        // Generate thumbnail for videos
        let thumbnail = undefined;
        if (mediaType === "video") {
          thumbnail = await generateVideoThumbnail(file);
        }
        
        return { url: publicUrl, type: mediaType, thumbnail } as Media;
      });

      const uploadedMedia = (await Promise.all(uploadPromises)).filter(
        (item): item is Media => item !== null
      );

      if (uploadedMedia.length > 0) {
        setFormData((prev) => ({
          ...prev,
          media: [...prev.media, ...uploadedMedia],
        }));
        toast.success("Media uploaded successfully");
      }
    } catch (error: any) {
      toast.error("Failed to upload media");
      console.error(error);
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Handle folder drop
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const items = Array.from(e.dataTransfer.items);
    const files: File[] = [];

    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      // Create a synthetic event to pass to handleMediaUpload
      const dataTransfer = new DataTransfer();
      files.forEach(file => dataTransfer.items.add(file));
      
      const syntheticEvent = {
        target: { files: dataTransfer.files, value: '' }
      } as React.ChangeEvent<HTMLInputElement>;
      
      await handleMediaUpload(syntheticEvent);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFormData((prev) => {
        const oldIndex = prev.media.findIndex((_, i) => i === active.id);
        const newIndex = prev.media.findIndex((_, i) => i === over.id);
        return {
          ...prev,
          media: arrayMove(prev.media, oldIndex, newIndex),
        };
      });
    }
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
      toast.error("At least 1 image or video is required");
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
        media: formData.media as any,
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

  const previewApartment: Apartment | null = formData.name && formData.media.length > 0 ? {
    id: id || "preview",
    listerId: "",
    name: formData.name,
    description: formData.description || undefined,
    location: {
      address: formData.address,
      city: formData.city,
      neighborhood: formData.neighborhood || undefined,
    },
    pricePerNight: Number(formData.pricePerNight) || 0,
    bedrooms: Number(formData.bedrooms) || 0,
    bathrooms: Number(formData.bathrooms) || 0,
    amenities: formData.amenities,
    media: formData.media,
    availabilityStatus: formData.availabilityStatus as "available" | "unavailable",
    averageRating: 0,
    totalReviews: 0,
    favoritesCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } : null;

  return (
    <div className="min-h-screen bg-background pb-20 pt-6">
      <div className="max-w-2xl mx-auto px-6 space-y-6">
        <div className="flex items-center justify-between">
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
          <Button
            variant="outline"
            onClick={() => setShowPreview(true)}
            disabled={!previewApartment}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
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
                Media <span className="text-destructive">*</span>
              </h3>
              <p className="text-sm text-muted-foreground">
                Upload up to 10 images and videos (at least 1 required). Drag to reorder. Drop entire folders here!
              </p>

              <div 
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed rounded-lg p-4 transition-colors hover:border-primary"
              >
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={formData.media.map((_, i) => i)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="grid grid-cols-3 gap-4">
                      {formData.media.map((item, index) => (
                        <SortableMediaItem
                          key={index}
                          id={index}
                          item={item}
                          index={index}
                          onRemove={removeMedia}
                        />
                      ))}

                      {formData.media.length < 10 && (
                        <label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-accent transition-colors">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            onChange={handleMediaUpload}
                            className="hidden"
                            disabled={uploading}
                          />
                          {uploading ? (
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                              <span className="text-xs text-muted-foreground text-center px-2">
                                Click or drop files/folders
                              </span>
                            </>
                          )}
                        </label>
                      )}
                    </div>
                  </SortableContext>
                </DndContext>
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

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-full h-screen p-0 gap-0">
          <DialogHeader className="absolute top-4 left-4 z-20">
            <DialogTitle className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-lg">
              Preview Mode
            </DialogTitle>
          </DialogHeader>
          {previewApartment && (
            <div className="h-full w-full">
              <ApartmentCard apartment={previewApartment} isActive={true} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ListingForm;
