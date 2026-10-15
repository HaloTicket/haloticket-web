import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FiUploadCloud,
  FiMapPin,
  FiGlobe,
  FiBold,
  FiItalic,
  FiUnderline,
  FiList,
  FiImage,
  FiVideo,
  FiLock,
  FiUnlock,
  FiAlignLeft,
  FiAlignCenter,
  FiAlignRight,
  FiAlignJustify,
  FiChevronRight,
  FiCheckCircle,
  FiAlertCircle,
  FiTrash2,
  FiBookmark,
  FiSearch,
  FiPlus,
  FiX,
  FiUsers,
  FiCalendar
} from "react-icons/fi";
import type { Step1Errors } from "@/types/organizer";
import { eventApi, type EventApiData } from "@/services/eventApi";
import { mediaApi } from "@/services/mediaApi";
import { adminConfigApi } from "@/services/adminConfigApi";
import type { Category } from "@/types/adminConfig";
import { type SystemVenue } from "@/utils/venueUtils";
import {
  DEFAULT_DESCRIPTION_TEMPLATE,
  buildImageMarkup,
  buildMediaEmbedMarkup,
  applyTextFormatToTextarea
} from "@/utils/editorUtils";

interface Step1EventInfoProps {
  title: string;
  setTitle: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  locationType: "offline" | "online";
  setLocationType: (v: "offline" | "online") => void;
  locationName: string;
  setLocationName: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  ward: string;
  setWard: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  posterImage: string | null;
  setPosterImage: (v: string | null) => void;
  bannerImage: string | null;
  setBannerImage: (v: string | null) => void;
  description: string;
  setDescription: (v: string) => void;
  galleryImages?: string[];
  setGalleryImages?: React.Dispatch<React.SetStateAction<string[]>>;
  organizerName: string;
  setOrganizerName: (v: string) => void;
  organizerInfo: string;
  setOrganizerInfo: (v: string) => void;
  organizerLogo: string | null;
  setOrganizerLogo: (v: string | null) => void;
  errors: Step1Errors;
  isOrganizerPreFilled?: boolean;
  onSaveDraft?: () => void;
  onNext: () => void;
}

export const Step1EventInfo: React.FC<Step1EventInfoProps> = ({
  title,
  setTitle,
  category,
  setCategory,
  locationType,
  setLocationType,
  locationName,
  setLocationName,
  city,
  setCity,
  ward,
  setWard,
  address,
  setAddress,
  posterImage,
  setPosterImage,
  bannerImage,
  setBannerImage,
  description,
  setDescription,
  galleryImages = [],
  setGalleryImages,
  organizerName,
  setOrganizerName,
  organizerInfo,
  setOrganizerInfo,
  organizerLogo,
  setOrganizerLogo,
  errors,
  isOrganizerPreFilled = false,
  onSaveDraft,
  onNext
}) => {
  const posterInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const modalUploadInputRef = useRef<HTMLInputElement>(null);
  const modalVideoInputRef = useRef<HTMLInputElement>(null);
  const cursorPositionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const [selectedFormat, setSelectedFormat] = useState<string>("Paragraph");
  const [selectedColor, setSelectedColor] = useState<string>("#ffffff");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // insert/edit image modal state
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageTab, setImageTab] = useState<"general" | "upload" | "gallery">("general");
  const [imageSource, setImageSource] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageWidth, setImageWidth] = useState("");
  const [imageHeight, setImageHeight] = useState("");
  const [imageLockRatio, setImageLockRatio] = useState(true);
  const [imageRatio, setImageRatio] = useState<number | null>(null);

  // insert/edit media modal state
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaTab, setMediaTab] = useState<"general" | "advanced">("general");
  const [mediaSource, setMediaSource] = useState("");
  const [mediaWidth, setMediaWidth] = useState("");
  const [mediaHeight, setMediaHeight] = useState("");
  const [mediaLockRatio, setMediaLockRatio] = useState(true);
  const [mediaRatio, setMediaRatio] = useState<number>(16 / 9);
  const [mediaAltSource, setMediaAltSource] = useState("");
  const [mediaPoster, setMediaPoster] = useState("");

  const [selectedGalleryPreview, setSelectedGalleryPreview] = useState<string | null>(null);

  const [venueCategory, setVenueCategory] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [systemVenues, setSystemVenues] = useState<SystemVenue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<SystemVenue | null>(null);
  const [venueSearchQuery, setVenueSearchQuery] = useState("");
  const [isVenueDropdownOpen, setIsVenueDropdownOpen] = useState(false);

  const [showNewVenueModal, setShowNewVenueModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAIGenerateModal, setShowAIGenerateModal] = useState(false);
  const [aiBulletPoints, setAiBulletPoints] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const newVenueFormTemplate = {
    name: "",
    city: "TP. Hồ Chí Minh",
    ward: "",
    address: "",
    capacity: 1000
  };
  const [newVenueForm, setNewVenueForm] = useState(newVenueFormTemplate);

  // load real db events and extract real venues & booking collisions dynamically
  useEffect(() => {
    let isMounted = true;

    const loadRealData = async () => {
      try {
        const realEvents = await eventApi.getAllEvents();
        const cats = await adminConfigApi.getCategories().catch(() => []);
        if (!isMounted) return;
        
        setCategoriesList(Array.isArray(cats) ? cats : (cats as any)?.data || []);

        if (Array.isArray(realEvents)) {
          const venueMap = new Map<string, SystemVenue>();

          // iterate real DB events to extract & group venue details
          realEvents.forEach((ev: EventApiData & Record<string, unknown>) => {
            if (!ev.locationName || !ev.locationName.trim()) return;

            const key = ev.locationName.toLowerCase().trim();
            const existing = venueMap.get(key);

            const status = String(ev.eventStatus || ev.status || "").toUpperCase();
            const approval = String(ev.eventApprovalStatus || ev.approvalStatus || "").toUpperCase();
            const isCompletedOrPublished = status === "COMPLETED" || status === "PUBLISHED" || approval === "APPROVED";

            // exclude past, completed, cancelled, or rejected events so expired events do NOT falsely hold the venue
            const evEndTime = ev.endTime ? new Date(ev.endTime).getTime() : (ev.startTime ? new Date(ev.startTime).getTime() + 4 * 3600000 : 0);
            const isPast = evEndTime > 0 && evEndTime < Date.now();
            const isCancelled = status === "CANCELLED" || status === "COMPLETED" || approval === "REJECTED";
            const isHoldingBooking = !isPast && !isCancelled;

            const bookingItem = {
              eventName: ev.title || "Sự kiện",
              organizer: (ev.organizer as { name?: string })?.name || (ev.author as string) || "Ban Tổ Chức",
              date: String(ev.datesSummary || (ev.startTime ? new Date(ev.startTime).toLocaleDateString("vi-VN") : "Đã đặt chỗ")),
              timeSlot: ev.startTime
                ? `${new Date(ev.startTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - ${ev.endTime ? new Date(ev.endTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "23:00"
                }`
                : "08:00 - 22:00",
              status: "CONFIRMED" as const
            };

            if (existing) {
              existing.eventsHosted += 1;
              if (isHoldingBooking) {
                const exists = existing.bookings.some((b) => b.eventName === bookingItem.eventName);
                if (!exists) {
                  existing.bookings.push(bookingItem);
                }
              }
              if (isCompletedOrPublished) {
                existing.verified = true;
              }
            } else {
              venueMap.set(key, {
                id: `v-db-${ev.id}`,
                name: ev.locationName,
                city: (ev.city as string) || "TP. Hồ Chí Minh",
                ward: (ev.ward as string) || "",
                address: (ev.address as string) || ev.locationName,
                capacity: 3000,
                verified: isCompletedOrPublished,
                eventsHosted: 1,
                bookings: isHoldingBooking ? [bookingItem] : []
              });
            }
          });

          setSystemVenues(Array.from(venueMap.values()));
        }
      } catch (err) {
        console.error("Failed to load real venues from DB", err);
      }
    };

    loadRealData();

    return () => {
      isMounted = false;
    };
  }, []);

  // pre-fill sample description template if empty on mount
  useEffect(() => {
    if (!description || !description.trim()) {
      setDescription(DEFAULT_DESCRIPTION_TEMPLATE);
    }
  }, [description, setDescription]);

  const filteredVenues = systemVenues.filter(
    (v) =>
      v.name.toLowerCase().includes((venueSearchQuery || locationName).toLowerCase()) ||
      v.address.toLowerCase().includes((venueSearchQuery || locationName).toLowerCase()) ||
      v.city.toLowerCase().includes((venueSearchQuery || locationName).toLowerCase())
  );

  const handleSelectVenue = (venue: SystemVenue) => {
    setSelectedVenue(venue);
    setLocationName(venue.name);
    setCity(venue.city);
    setWard(venue.ward);
    setAddress(venue.address);
    setVenueSearchQuery(venue.name);
    setIsVenueDropdownOpen(false);
  };

  const handleCreateNewVenue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVenueForm.name.trim() || !newVenueForm.address.trim()) return;

    const created: SystemVenue = {
      id: `v-custom-${Date.now()}`,
      name: newVenueForm.name,
      city: newVenueForm.city,
      ward: newVenueForm.ward,
      address: newVenueForm.address,
      capacity: Number(newVenueForm.capacity) || 500,
      verified: false,
      eventsHosted: 0,
      bookings: []
    };

    setSystemVenues((prev) => [created, ...prev]);
    handleSelectVenue(created);
    setNewVenueForm({ name: "", city: "TP. Hồ Chí Minh", ward: "", address: "", capacity: 1000 });
    setShowNewVenueModal(false);
  };

  // media service upload handler with instant local preview & async s3 persistence
  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string | null) => void,
    folder: string = "events"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const tempUrl = URL.createObjectURL(file);
    setter(tempUrl);

    // automatically add vertical poster and horizontal banner to galleryImages upon selection
    if (setter === setPosterImage || setter === setBannerImage) {
      if (setGalleryImages) {
        setGalleryImages((prev) => (prev.includes(tempUrl) ? prev : [...prev, tempUrl]));
      }
    }

    setIsUploadingImage(true);

    try {
      const res = await mediaApi.uploadImage(file, folder);
      if (res && res.imageUrl) {
        setter(res.imageUrl);
        if (setter === setPosterImage || setter === setBannerImage) {
          if (setGalleryImages) {
            setGalleryImages((prev) => prev.map((url) => (url === tempUrl ? res.imageUrl : url)));
          }
        }
      }
    } catch (err) {
      console.warn("S3 upload error, keeping temporary blob preview", err);
    }
    setIsUploadingImage(false);
    e.target.value = "";
  };

  // handlers for Insert/Edit Image Modal
  const handleImageWidthChange = (val: string) => {
    setImageWidth(val);
    if (imageLockRatio && imageRatio && val && !isNaN(Number(val))) {
      setImageHeight(String(Math.round(Number(val) / imageRatio)));
    }
  };

  const handleImageHeightChange = (val: string) => {
    setImageHeight(val);
    if (imageLockRatio && imageRatio && val && !isNaN(Number(val))) {
      setImageWidth(String(Math.round(Number(val) * imageRatio)));
    }
  };

  const handleModalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const tempUrl = URL.createObjectURL(file);
    setImageSource(tempUrl);

    const img = new Image();
    img.onload = () => {
      setImageWidth(String(img.naturalWidth));
      setImageHeight(String(img.naturalHeight));
      if (img.naturalHeight > 0) {
        setImageRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = tempUrl;
    setImageTab("general");

    setIsUploadingImage(true);
    try {
      const res = await mediaApi.uploadImage(file, "gallery");
      if (res && res.imageUrl) {
        setImageSource(res.imageUrl);
        if (setGalleryImages) {
          setGalleryImages((prev) => (prev.includes(res.imageUrl) ? prev : [...prev, res.imageUrl]));
        }
      }
    } catch (err) {
      console.warn("Upload image in modal failed, using blob preview", err);
    }
    setIsUploadingImage(false);
    e.target.value = "";
  };

  // upload small video (<= 20MB)
  const handleModalVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      showToast("Dung lượng video không được vượt quá 20MB. Vui lòng chọn video ngắn/nhỏ hơn.", "error");
      e.target.value = "";
      return;
    }

    const tempUrl = URL.createObjectURL(file);
    setMediaSource(tempUrl);
    setIsUploadingImage(true);

    try {
      const res = await mediaApi.uploadVideo(file, "events");
      if (res && res.imageUrl) {
        setMediaSource(res.imageUrl);
        showToast("Tải video lên thành công!", "success");
      }
    } catch (err) {
      console.warn("Upload video in modal failed, using blob preview", err);
    } finally {
      setIsUploadingImage(false);
      e.target.value = "";
    }
  };

  // helper to insert markdown/HTML at exact cursor position in the description textarea
  const insertAtCursor = (markup: string) => {
    const textarea = document.getElementById("event-description-textarea") as HTMLTextAreaElement | null;
    const start = textarea?.selectionStart ?? cursorPositionRef.current.start ?? description.length;
    const end = textarea?.selectionEnd ?? cursorPositionRef.current.end ?? description.length;
    const before = description.substring(0, start);
    const after = description.substring(end);
    const newContent = `${before}${markup}${after}`;
    setDescription(newContent);
    cursorPositionRef.current = { start: start + markup.length, end: start + markup.length };
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(start + markup.length, start + markup.length);
      }
    }, 50);
  };

  // upload and insert multiple direct images into gallery images list with instant preview
  const handleInsertGalleryImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const tempMappings = files.map((file) => ({
      file,
      tempUrl: URL.createObjectURL(file)
    }));

    if (setGalleryImages) {
      setGalleryImages((prev) => [...prev, ...tempMappings.map((m) => m.tempUrl)]);
    }

    setIsUploadingImage(true);

    await Promise.all(
      tempMappings.map(async ({ file, tempUrl }) => {
        try {
          const res = await mediaApi.uploadImage(file, "gallery");
          if (res?.imageUrl && setGalleryImages) {
            setGalleryImages((prev) =>
              prev.map((url) => (url === tempUrl ? res.imageUrl : url))
            );
          }
        } catch (err) {
          console.warn("Upload image to gallery failed", err);
        }
      })
    );

    setIsUploadingImage(false);
    e.target.value = "";
  };

  const handleSaveImageModal = () => {
    if (!imageSource || !imageSource.trim()) {
      setShowImageModal(false);
      return;
    }
    const markup = buildImageMarkup({
      source: imageSource,
      alt: imageAlt,
      width: imageWidth,
      height: imageHeight
    });
    insertAtCursor(markup);
    if (setGalleryImages) {
      setGalleryImages((prev) => (prev.includes(imageSource.trim()) ? prev : [...prev, imageSource.trim()]));
    }
    setShowImageModal(false);
  };

  // handlers for Insert/Edit Media Modal
  const handleMediaWidthChange = (val: string) => {
    setMediaWidth(val);
    if (mediaLockRatio && mediaRatio && val && !isNaN(Number(val))) {
      setMediaHeight(String(Math.round(Number(val) / mediaRatio)));
    }
  };

  const handleMediaHeightChange = (val: string) => {
    setMediaHeight(val);
    if (mediaLockRatio && mediaRatio && val && !isNaN(Number(val))) {
      setMediaWidth(String(Math.round(Number(val) * mediaRatio)));
    } else if (val && !isNaN(Number(val)) && Number(val) > 0 && mediaWidth && !isNaN(Number(mediaWidth))) {
      setMediaRatio(Number(mediaWidth) / Number(val));
    }
  };

  const handleSaveMediaModal = () => {
    if (!mediaSource || !mediaSource.trim()) {
      setShowMediaModal(false);
      return;
    }
    const markup = buildMediaEmbedMarkup({
      source: mediaSource,
      width: mediaWidth,
      height: mediaHeight,
      altSource: mediaAltSource,
      poster: mediaPoster
    });
    insertAtCursor(markup);
    setShowMediaModal(false);
  };

  // textarea formatting helper
  const applyTextFormat = (prefix: string, suffix: string = prefix) => {
    const updated = applyTextFormatToTextarea("event-description-textarea", description, prefix, suffix);
    setDescription(updated);
  };

  const handleGenerateDescription = async () => {
    if (!title) {
      showToast("Vui lòng nhập tên sự kiện trước khi sử dụng tính năng sinh nội dung AI.", "error");
      return;
    }
    if (!aiBulletPoints.trim()) {
      showToast("Vui lòng nhập một số ý chính (bullet points) về sự kiện.", "error");
      return;
    }

    setIsGenerating(true);
    try {
      const { aiApi } = await import("@/services/aiApi");
      const res = await aiApi.generateEventContent(title, aiBulletPoints);
      if (res && res.description) {
        let fullDesc = res.description;
        if (res.terms_and_conditions) {
          fullDesc += "\n\nĐiều khoản & Quy định:\n" + res.terms_and_conditions;
        }
        // Strictly remove all markdown headers (#, ##, ###), bold/italic (***, **, *)
        fullDesc = fullDesc
          .replace(/^#{1,6}\s+/gm, '')
          .replace(/\*{2,3}/g, '')
          .replace(/_{2,3}/g, '');
        setDescription(fullDesc);
        setShowAIGenerateModal(false);
        setAiBulletPoints("");
        showToast("Tạo nội dung tự động thành công!", "success");
      }
    } catch (err) {
      console.error("Lỗi khi sinh nội dung:", err);
      showToast("Có lỗi xảy ra khi sinh nội dung. Vui lòng thử lại.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-full shadow-lg text-sm font-bold animate-in fade-in slide-in-from-top-4 flex items-center gap-2 ${toast.type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>
          {toast.type === "error" ? <FiAlertCircle className="w-5 h-5" /> : <FiCheckCircle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      {/* Upload Images Section */}
      <div className="app-bg-card border app-border rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b app-border pb-4">
          <h3 className="text-lg font-extrabold app-text-main flex items-center gap-2">
            <span className="text-blue-600 dark:text-blue-400 font-black">*</span>
            <span>Upload hình ảnh sự kiện</span>
          </h3>
          <div className="flex items-center gap-3">
            {isUploadingImage && (
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 animate-pulse flex items-center gap-1">
                <FiUploadCloud className="w-4 h-4 animate-bounce" /> Đang tải lên S3...
              </span>
            )}
            <span className="text-xs app-text-muted">Định dạng JPG, PNG (Tối đa 5MB)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Poster 3:4 Upload Box */}
          <div className="md:col-span-5 flex flex-col space-y-2">
            <label className="text-xs font-bold app-text-main">
              Ảnh sự kiện dọc (Khuyên dùng: 720 x 958 px)
            </label>
            <input
              type="file"
              ref={posterInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, setPosterImage)}
            />
            <div
              onClick={() => posterInputRef.current?.click()}
              className="relative aspect-[3/4] w-full rounded-2xl border-2 border-dashed app-border hover:border-blue-500 transition-colors app-bg-subnav flex flex-col items-center justify-center p-4 text-center cursor-pointer group overflow-hidden"
            >
              {posterImage ? (
                <div className="relative w-full h-full group">
                  <img src={posterImage} alt="Poster" className="w-full h-full object-cover rounded-xl" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        posterInputRef.current?.click();
                      }}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-md hover:bg-blue-700"
                    >
                      <FiUploadCloud className="w-3.5 h-3.5" />
                      <span>Đổi ảnh</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPosterImage(null);
                      }}
                      className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-md hover:bg-rose-700"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <FiUploadCloud className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-extrabold app-text-main mb-1">
                    Thêm ảnh poster sự kiện
                  </span>
                  <span className="text-[11px] app-text-muted">Kéo thả hoặc bấm để chọn ảnh</span>
                </>
              )}
            </div>
          </div>

          {/* Banner 16:9 Upload Box */}
          <div className="md:col-span-7 flex flex-col space-y-2">
            <label className="text-xs font-bold app-text-main">
              Ảnh nền / Banner ngang (Khuyên dùng: 1280 x 720 px)
            </label>
            <input
              type="file"
              ref={bannerInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, setBannerImage)}
            />
            <div
              onClick={() => bannerInputRef.current?.click()}
              className="relative aspect-[16/9] w-full rounded-2xl border-2 border-dashed app-border hover:border-blue-500 transition-colors app-bg-subnav flex flex-col items-center justify-center p-6 text-center cursor-pointer group overflow-hidden"
            >
              {bannerImage ? (
                <div className="relative w-full h-full group">
                  <img src={bannerImage} alt="Banner" className="w-full h-full object-cover rounded-xl" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        bannerInputRef.current?.click();
                      }}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-md hover:bg-blue-700"
                    >
                      <FiUploadCloud className="w-3.5 h-3.5" />
                      <span>Đổi ảnh</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBannerImage(null);
                      }}
                      className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-md hover:bg-rose-700"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <FiUploadCloud className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-extrabold app-text-main mb-1">
                    Thêm ảnh nền Banner ngang
                  </span>
                  <span className="text-[11px] app-text-muted">Hiển thị ở trang chi tiết & carousel chính</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* General Info Form Section */}
      <div className="app-bg-card border app-border rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
        <h3 className="text-lg font-extrabold app-text-main border-b app-border pb-4">
          Thông tin chung sự kiện
        </h3>

        {/* Event Title */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold app-text-main">
              <span className="text-rose-500 font-bold">*</span> Tên sự kiện
            </label>
            <span className="text-[11px] app-text-muted">{title.length} / 100</span>
          </div>
          <input
            type="text"
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nhập tên sự kiện nổi bật..."
            className={`w-full app-bg-subnav app-text-main placeholder-zinc-400 text-sm rounded-xl px-4 py-3 border ${errors.title ? "border-rose-500 ring-1 ring-rose-500" : "app-border"
              } focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium`}
          />
          {errors.title && (
            <p className="text-xs text-rose-500 font-bold mt-1 flex items-center gap-1">
              <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.title}</span>
            </p>
          )}
        </div>

        {/* Category Dropdown */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold app-text-main">
            <span className="text-rose-500 font-bold">*</span> Thể loại sự kiện
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-3 border ${errors.category ? "border-rose-500 ring-1 ring-rose-500" : "app-border"
              } focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold cursor-pointer`}
          >
            <option value="" disabled>-- Chọn thể loại --</option>
            {categoriesList.filter(c => c.active && c.status !== "INACTIVE").map(cat => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
            <option value="Khác">Khác</option>
          </select>
          {errors.category && (
            <p className="text-xs text-rose-500 font-bold mt-1 flex items-center gap-1">
              <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.category}</span>
            </p>
          )}
        </div>

        {/* Event Location */}
        <div className="space-y-4 pt-2">
          <label className="text-xs font-bold app-text-main block">
            <span className="text-rose-500 font-bold">*</span> Hình thức tổ chức địa điểm
          </label>

          {/* Offline / Online Selector */}
          <div className="inline-flex p-1 app-bg-subnav rounded-xl border app-border">
            <button
              type="button"
              onClick={() => setLocationType("offline")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${locationType === "offline"
                ? "bg-blue-600 text-white shadow-xs"
                : "app-text-muted hover:app-text-main"
                }`}
            >
              <FiMapPin className="w-4 h-4" />
              <span>Sự kiện Offline</span>
            </button>
            <button
              type="button"
              onClick={() => setLocationType("online")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${locationType === "online"
                ? "bg-blue-600 text-white shadow-xs"
                : "app-text-muted hover:app-text-main"
                }`}
            >
              <FiGlobe className="w-4 h-4" />
              <span>Sự kiện Online (Trực tuyến)</span>
            </button>
          </div>

          {locationType === "offline" && (
            <div className="space-y-4 pt-2">
              {/* Public vs Private Venue Type Selector */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setVenueCategory("PUBLIC")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    venueCategory === "PUBLIC"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "app-bg-subnav app-text-muted app-border hover:app-text-main"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <FiGlobe className="w-4 h-4" />
                    <span>Địa điểm công cộng (Cho thuê công khai)</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setVenueCategory("PRIVATE")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    venueCategory === "PRIVATE"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "app-bg-subnav app-text-muted app-border hover:app-text-main"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <FiLock className="w-4 h-4" />
                    <span>Địa điểm cá nhân (Địa điểm riêng Ban tổ chức)</span>
                  </span>
                </button>
              </div>

              {venueCategory === "PRIVATE" ? (
                /* Private Location Form Fields */
                <div className="p-5 rounded-2xl app-bg-subnav border app-border space-y-4 animate-in fade-in duration-200">
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs font-medium space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <FiLock className="w-4 h-4 text-amber-600" />
                      <span>Địa điểm cá nhân / Nội bộ ban tổ chức</span>
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      Địa điểm này thuộc sở hữu/sử dụng riêng của ban tổ chức, không mở cho bên ngoài thuê.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold app-text-main">
                        <span className="text-rose-500">*</span> Tên địa điểm cá nhân
                      </label>
                      <input
                        type="text"
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        placeholder="VD: Hội trường Halo Studio, Sân riêng BTC..."
                        className="w-full app-bg-card app-text-main text-sm rounded-xl px-4 py-3 border app-border focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold app-text-main">Tỉnh / Thành phố</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="TP. Hồ Chí Minh / Hà Nội..."
                        className="w-full app-bg-card app-text-main text-sm rounded-xl px-4 py-3 border app-border focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold app-text-main">Quận / Phường / Xã</label>
                      <input
                        type="text"
                        value={ward}
                        onChange={(e) => setWard(e.target.value)}
                        placeholder="Phường Bến Nghé / Quận 1..."
                        className="w-full app-bg-card app-text-main text-sm rounded-xl px-4 py-3 border app-border focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold app-text-main">
                        <span className="text-rose-500">*</span> Địa chỉ chi tiết
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Số nhà, tên đường, khu vực..."
                        className="w-full app-bg-card app-text-main text-sm rounded-xl px-4 py-3 border app-border focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Smart System Public Venue Selector & Search */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold app-text-main flex items-center gap-1.5">
                        <span className="text-rose-500">*</span> Chọn Địa điểm công cộng có sẵn:
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowNewVenueModal(true)}
                        className="text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <FiPlus className="w-3.5 h-3.5" />
                        <span>Khai báo địa điểm công cộng mới</span>
                      </button>
                    </div>

                    {/* Search & Select Input with Dropdown */}
                    <div className="relative">
                      <div className="flex items-center gap-2 app-bg-subnav border app-border rounded-xl px-4 py-3 shadow-xs">
                        <FiSearch className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={venueSearchQuery || locationName}
                          onFocus={() => setIsVenueDropdownOpen(true)}
                          onChange={(e) => {
                            setVenueSearchQuery(e.target.value);
                            setLocationName(e.target.value);
                            setIsVenueDropdownOpen(true);
                          }}
                          placeholder="Tìm địa điểm có sẵn (Ví dụ: Mỹ Đình, Hòa Bình, Phú Thọ...)"
                          className="w-full bg-transparent app-text-main text-sm focus:outline-none placeholder-slate-400 font-medium"
                        />
                        {locationName && (
                          <button
                            type="button"
                            onClick={() => {
                              setLocationName("");
                              setSelectedVenue(null);
                              setVenueSearchQuery("");
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown Menu of System Venues */}
                      {isVenueDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 z-50 app-bg-card border app-border rounded-2xl shadow-2xl p-2 max-h-72 overflow-y-auto no-scrollbar space-y-1 animate-in fade-in zoom-in-95">
                          <div className="px-3 py-1.5 text-[10px] font-bold app-text-muted uppercase tracking-wider flex items-center justify-between border-b app-border pb-2">
                            <span>Địa điểm tổ chức có sẵn ({filteredVenues.length})</span>
                            <button
                              type="button"
                              onClick={() => setIsVenueDropdownOpen(false)}
                              className="text-xs text-blue-600 hover:underline cursor-pointer"
                            >
                              Đóng
                            </button>
                          </div>

                          {filteredVenues.length === 0 ? (
                            <div className="p-4 text-center space-y-2">
                              <p className="text-xs app-text-muted">Không tìm thấy địa điểm phù hợp</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsVenueDropdownOpen(false);
                                  setShowNewVenueModal(true);
                                }}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 cursor-pointer flex items-center justify-center gap-1 mx-auto"
                              >
                                <FiPlus className="w-3.5 h-3.5" />
                                <span>Khai báo địa điểm mới ngay</span>
                              </button>
                            </div>
                          ) : (
                            filteredVenues.map((v) => (
                              <div
                                key={v.id}
                                onClick={() => handleSelectVenue(v)}
                                className="p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold app-text-main flex items-center gap-1.5">
                                    <FiMapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    <span>{v.name}</span>
                                  </span>
                                  {v.verified ? (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                      <FiCheckCircle className="w-3 h-3" /> Đã xác minh
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                      <FiAlertCircle className="w-3 h-3 text-amber-500" /> Chưa xác minh
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] app-text-muted">{v.address}, {v.city}</p>
                                <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 pt-0.5">
                                  <span className="flex items-center gap-1">
                                    <FiUsers className="w-3 h-3 text-indigo-500" /> Sức chứa: {v.capacity.toLocaleString()} khán giả
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <FiCalendar className="w-3 h-3 text-amber-500" /> {v.eventsHosted} sự kiện đã tổ chức
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {errors.locationName && (
                      <p className="text-xs text-rose-500 font-bold mt-1 flex items-center gap-1">
                        <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.locationName}</span>
                      </p>
                    )}
                  </div>

                  {/* Venue Info & Schedule Collision Indicator Box */}
                  {selectedVenue && (
                    <div className="p-4 rounded-2xl app-bg-subnav border app-border space-y-3 animate-in fade-in duration-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b app-border pb-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold app-text-main flex items-center gap-1.5">
                              <FiBookmark className="w-4 h-4 text-blue-600" />
                              <span>{selectedVenue.name}</span>
                            </h4>
                            {selectedVenue.verified ? (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                                Đã xác thực
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                                Địa điểm do BTC khai báo
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] app-text-muted">
                            {selectedVenue.address}, {selectedVenue.ward}, {selectedVenue.city}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <span className="px-2.5 py-1 rounded-lg app-bg-card border app-border text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <FiUsers className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Sức chứa: {selectedVenue.capacity.toLocaleString()} ghế</span>
                          </span>
                        </div>
                      </div>

                      {/* Real-time Schedule Collision Check Badge */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl app-bg-card border app-border">
                        <div className="flex items-start gap-2.5">
                          {selectedVenue.bookings.length > 0 ? (
                            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 shrink-0">
                              <FiAlertCircle className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 shrink-0">
                              <FiCheckCircle className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <h5 className="text-xs font-bold app-text-main flex items-center gap-1.5">
                              <span>Trạng thái Lịch tổ chức tại Địa điểm:</span>
                              {selectedVenue.bookings.length > 0 ? (
                                <span className="text-amber-600 dark:text-amber-400">Đã có {selectedVenue.bookings.length} sự kiện đăng ký giữ chỗ</span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400">Sẵn sàng (Chưa có lịch trùng)</span>
                              )}
                            </h5>
                            <p className="text-[11px] app-text-muted mt-0.5">
                              {selectedVenue.bookings.length > 0
                                ? "Hệ thống khuyến nghị đối soát lịch để tránh trùng thời gian tổ chức với BTC khác."
                                : "Địa điểm chưa bị giữ chỗ. Sự kiện của bạn đủ điều kiện duyệt tự động nhanh."}
                            </p>
                          </div>
                        </div>

                        {selectedVenue.bookings.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowScheduleModal(true)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1.5 justify-center"
                          >
                            <FiCalendar className="w-3.5 h-3.5" />
                            <span>Xem lịch đăng ký</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

              {/* Detailed Address Inputs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold app-text-main">
                      <span className="text-rose-500">*</span> Tỉnh/Thành phố
                    </label>
                    {selectedVenue && (
                      <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <FiLock className="w-3 h-3" /> Tự động khóa theo địa điểm
                      </span>
                    )}
                  </div>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!!selectedVenue}
                    className={`w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-3 border ${errors.city ? "border-rose-500 ring-1 ring-rose-500" : "app-border"
                      } cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                    <option value="Hà Nội">Hà Nội</option>
                    <option value="Đà Nẵng">Đà Nẵng</option>
                    <option value="Cần Thơ">Cần Thơ</option>
                    <option value="Hải Phòng">Hải Phòng</option>
                  </select>
                  {errors.city && (
                    <p className="text-xs text-rose-500 font-bold mt-1 flex items-center gap-1">
                      <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.city}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold app-text-main">Phường/Xã</label>
                    {selectedVenue && (
                      <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <FiLock className="w-3 h-3" /> Đã cố định
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    disabled={!!selectedVenue}
                    placeholder="Nhập Phường/Xã..."
                    className="w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-3 border app-border disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <div className="flex justify-between text-xs font-bold app-text-main">
                    <span className="flex items-center gap-1.5">
                      <span className="text-rose-500">*</span> Số nhà, tên đường
                      {selectedVenue && (
                        <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 ml-1">
                          <FiLock className="w-3 h-3" /> Đã cố định theo địa điểm
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] app-text-muted">{address.length} / 80</span>
                  </div>
                  <input
                    type="text"
                    maxLength={80}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={!!selectedVenue}
                    placeholder="Ví dụ: 240 Đường 3/2, Phường 12..."
                    className={`w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-3 border ${errors.address ? "border-rose-500 ring-1 ring-rose-500" : "app-border"
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                  />
                  {errors.address && (
                    <p className="text-xs text-rose-500 font-bold mt-1 flex items-center gap-1">
                      <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.address}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  </div>

      {/* Event Description Rich Text Section */}
      <div className="app-bg-card border app-border rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b app-border pb-3">
          <h3 className="text-lg font-extrabold app-text-main">
            <span className="text-rose-500 font-bold">*</span> Mô tả chi tiết nội dung sự kiện
          </h3>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAIGenerateModal(true)}
              className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer flex items-center gap-1"
            >
              <span>Trợ lý AI Soạn thảo</span>
            </button>
            <button
              type="button"
              onClick={() => setDescription(DEFAULT_DESCRIPTION_TEMPLATE)}
              className="text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <FiBookmark className="w-3.5 h-3.5" />
              <span>Tải văn bản mẫu</span>
            </button>
          </div>
        </div>

        {/* Rich Text Formatting Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-2 app-bg-subnav border app-border rounded-xl">
          {/* Paragraph Format Selector */}
          <select
            value={selectedFormat}
            onChange={(e) => {
              setSelectedFormat(e.target.value);
              const val = e.target.value;
              if (val === "Heading 1") applyTextFormat("# ", "");
              else if (val === "Heading 2") applyTextFormat("## ", "");
              else if (val === "Heading 3") applyTextFormat("### ", "");
            }}
            className="app-bg-card app-text-main text-xs font-bold px-3 py-1.5 rounded-lg border app-border focus:outline-none cursor-pointer"
          >
            <option value="Paragraph">Paragraph</option>
            <option value="Heading 1">Heading 1</option>
            <option value="Heading 2">Heading 2</option>
            <option value="Heading 3">Heading 3</option>
          </select>

          {/* Color Palette */}
          <div className="flex items-center gap-1.5 px-2 border-r app-border">
            <button
              type="button"
              onClick={() => {
                setSelectedColor("#ffffff");
                applyTextFormat('<span style="color: #ffffff">', '</span>');
              }}
              className={`w-5 h-5 rounded-md bg-white border border-slate-400 hover:scale-110 transition-transform ${selectedColor === "#ffffff" ? "ring-2 ring-blue-500" : ""}`}
              title="Màu Trắng"
            />
            <button
              type="button"
              onClick={() => {
                setSelectedColor("#22c55e");
                applyTextFormat('<span style="color: #22c55e">', '</span>');
              }}
              className={`w-5 h-5 rounded-md bg-emerald-500 hover:scale-110 transition-transform ${selectedColor === "#22c55e" ? "ring-2 ring-blue-500" : ""}`}
              title="Màu Xanh Lá"
            />
            <button
              type="button"
              onClick={() => {
                setSelectedColor("#ef4444");
                applyTextFormat('<span style="color: #ef4444">', '</span>');
              }}
              className={`w-5 h-5 rounded-md bg-rose-500 hover:scale-110 transition-transform ${selectedColor === "#ef4444" ? "ring-2 ring-blue-500" : ""}`}
              title="Màu Đỏ"
            />
            <button
              type="button"
              onClick={() => {
                setSelectedColor("#eab308");
                applyTextFormat('<span style="color: #eab308">', '</span>');
              }}
              className={`w-5 h-5 rounded-md bg-amber-400 hover:scale-110 transition-transform ${selectedColor === "#eab308" ? "ring-2 ring-blue-500" : ""}`}
              title="Màu Vàng"
            />
          </div>

          {/* Formatting: Bold, Italic, Underline */}
          <div className="flex items-center gap-1 px-2 border-r app-border">
            <button
              type="button"
              onClick={() => applyTextFormat("**", "**")}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-black app-text-main cursor-pointer"
              title="In đậm (Bold)"
            >
              <FiBold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyTextFormat("*", "*")}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-black app-text-main cursor-pointer"
              title="In nghiêng (Italic)"
            >
              <FiItalic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyTextFormat("<u>", "</u>")}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-black app-text-main cursor-pointer"
              title="Gạch chân (Underline)"
            >
              <FiUnderline className="w-4 h-4" />
            </button>
          </div>

          {/* Alignments */}
          <div className="flex items-center gap-1 px-2 border-r app-border">
            <button
              type="button"
              onClick={() => applyTextFormat('<div align="left">\n', '\n</div>')}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-bold app-text-main cursor-pointer"
              title="Căn trái"
            >
              <FiAlignLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyTextFormat('<div align="center">\n', '\n</div>')}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-bold app-text-main cursor-pointer"
              title="Căn giữa"
            >
              <FiAlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyTextFormat('<div align="right">\n', '\n</div>')}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-bold app-text-main cursor-pointer"
              title="Căn phải"
            >
              <FiAlignRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyTextFormat('<div align="justify">\n', '\n</div>')}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-bold app-text-main cursor-pointer"
              title="Căn đều"
            >
              <FiAlignJustify className="w-4 h-4" />
            </button>
          </div>

          {/* Lists */}
          <div className="flex items-center gap-1 px-2 border-r app-border">
            <button
              type="button"
              onClick={() => applyTextFormat("\n• ", "")}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-bold app-text-main cursor-pointer"
              title="Danh sách dấu đầu dòng"
            >
              <FiList className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyTextFormat("\n1. ", "")}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-extrabold app-text-main cursor-pointer"
              title="Danh sách có đánh số"
            >
              <span className="text-xs font-bold font-mono">1.</span>
            </button>
          </div>

          {/* Media Attachments: Image & Video (Matching Screenshots 1 & 2) */}
          <div className="flex items-center gap-1.5 pl-1">
            {/* Image Button with Tooltip */}
            <div className="relative group">
              <button
                type="button"
                onClick={() => {
                  setImageSource("");
                  setImageAlt("");
                  setImageWidth("");
                  setImageHeight("");
                  setImageTab("general");
                  setShowImageModal(true);
                }}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
                aria-label="Insert/edit image"
              >
                <FiImage className="w-4 h-4" />
              </button>
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                <div className="bg-[#1e293b] text-white text-[11px] font-medium px-2.5 py-1 rounded-md shadow-xl border border-slate-700 whitespace-nowrap">
                  Insert/edit image
                </div>
              </div>
            </div>

            {/* Media/Video Button with Tooltip */}
            <div className="relative group">
              <button
                type="button"
                onClick={() => {
                  setMediaSource("");
                  setMediaWidth("");
                  setMediaHeight("");
                  setMediaAltSource("");
                  setMediaPoster("");
                  setMediaTab("general");
                  setShowMediaModal(true);
                }}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
                aria-label="Insert/edit media"
              >
                <FiVideo className="w-4 h-4" />
              </button>
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                <div className="bg-[#1e293b] text-white text-[11px] font-medium px-2.5 py-1 rounded-md shadow-xl border border-slate-700 whitespace-nowrap">
                  Insert/edit media
                </div>
              </div>
            </div>
          </div>
        </div>

        <textarea
          id="event-description-textarea"
          rows={12}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            cursorPositionRef.current = { start: e.target.selectionStart, end: e.target.selectionEnd };
          }}
          onSelect={(e) => {
            cursorPositionRef.current = { start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd };
          }}
          onClick={(e) => {
            cursorPositionRef.current = { start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd };
          }}
          onKeyUp={(e) => {
            cursorPositionRef.current = { start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd };
          }}
          className={`w-full app-bg-subnav app-text-main text-sm rounded-xl p-4 border ${errors.description ? "border-rose-500 ring-1 ring-rose-500" : "app-border"
            } focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans leading-relaxed`}
        />
        {errors.description && (
          <p className="text-xs text-rose-500 font-bold mt-1 flex items-center gap-1">
            <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errors.description}</span>
          </p>
        )}

        {/* Gallery Images Visual Preview & Management Section */}
        <div className="pt-4 border-t app-border space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold app-text-main flex items-center gap-2">
              <FiImage className="w-4 h-4 text-blue-600" />
              <span>Bộ sưu tập ảnh sự kiện ({galleryImages.length} ảnh)</span>
            </label>
            <input
              type="file"
              ref={galleryInputRef}
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleInsertGalleryImage}
            />
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <FiPlus className="w-3.5 h-3.5" />
              <span>Thêm ảnh vào Gallery</span>
            </button>
          </div>

          {galleryImages.length === 0 ? (
            <div className="p-4 rounded-xl app-bg-subnav border app-border text-center">
              <p className="text-xs app-text-muted">Chưa có ảnh gallery nào. Poster, banner hoặc ảnh bạn tải lên sẽ tự động có mặt tại đây để tái sử dụng.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {galleryImages.map((imgUrl, idx) => (
                <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border app-border app-bg-subnav shadow-xs">
                  <img src={imgUrl} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                    <button
                      type="button"
                      onClick={() => setSelectedGalleryPreview(imgUrl)}
                      className="p-1.5 bg-slate-700/80 text-white rounded-lg hover:bg-slate-600 transition-colors shadow-md text-xs"
                      title="Xem ảnh lớn"
                    >
                      <FiSearch className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        insertAtCursor(buildImageMarkup({ source: imgUrl, alt: `Gallery image ${idx + 1}` }));
                        showToast("Đã chèn ảnh vào vị trí con trỏ trong mô tả!");
                      }}
                      className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md text-xs"
                      title="Chèn ảnh này vào mô tả sự kiện"
                    >
                      <FiPlus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (setGalleryImages) {
                          setGalleryImages((prev) => prev.filter((_, i) => i !== idx));
                        }
                      }}
                      className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors shadow-md"
                      title="Xóa vĩnh viễn khỏi Gallery"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Full Size Gallery Preview Modal */}
          {selectedGalleryPreview && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
              <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => setSelectedGalleryPreview(null)}
                  className="absolute -top-10 right-0 p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors cursor-pointer"
                >
                  <FiX className="w-6 h-6" />
                </button>
                <img
                  src={selectedGalleryPreview}
                  alt="Gallery Preview"
                  className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border app-border"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Organizer Info Section */}
      <div className="app-bg-card border app-border rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b app-border pb-4">
          <h3 className="text-lg font-extrabold app-text-main">
            Thông tin Ban Tổ Chức (BTC)
          </h3>
          {isOrganizerPreFilled && (
            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-full border border-blue-200 dark:border-blue-800 flex items-center gap-1.5">
              <FiCheckCircle className="w-3.5 h-3.5" />
              <span>Đã tự động tải từ hồ sơ Ban tổ chức của bạn</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Logo Upload */}
          <div className="md:col-span-4 space-y-2">
            <label className="text-xs font-bold app-text-main">Logo Ban Tổ Chức (275 x 275 px)</label>
            <input
              type="file"
              ref={logoInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, setOrganizerLogo)}
            />
            <div
              onClick={() => logoInputRef.current?.click()}
              className="relative w-36 h-36 rounded-2xl border-2 border-dashed app-border hover:border-blue-500 app-bg-subnav flex flex-col items-center justify-center p-3 text-center cursor-pointer overflow-hidden group"
            >
              {organizerLogo ? (
                <div className="relative w-full h-full group">
                  <img src={organizerLogo} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        logoInputRef.current?.click();
                      }}
                      className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
                      title="Đổi logo"
                    >
                      <FiUploadCloud className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOrganizerLogo(null);
                      }}
                      className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-sm"
                      title="Xóa logo"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <FiUploadCloud className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-bold app-text-main">Thêm logo BTC</span>
                </>
              )}
            </div>
          </div>

          {/* Organizer Name & Description */}
          <div className="md:col-span-8 space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold app-text-main">
                <span><span className="text-rose-500">*</span> Tên Ban Tổ Chức</span>
                <span className="text-[11px] app-text-muted">{organizerName.length} / 80</span>
              </div>
              <input
                type="text"
                maxLength={80}
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                placeholder="Nhập tên công ty hoặc thương hiệu BTC..."
                className={`w-full app-bg-subnav app-text-main text-sm rounded-xl px-4 py-3 border ${errors.organizerName ? "border-rose-500 ring-1 ring-rose-500" : "app-border"
                  }`}
              />
              {errors.organizerName && (
                <p className="text-xs text-rose-500 font-bold mt-1 flex items-center gap-1">
                  <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.organizerName}</span>
                </p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold app-text-main">
                <span>Thông tin mô tả Ban Tổ Chức</span>
                <span className="text-[11px] app-text-muted">{organizerInfo.length} / 500</span>
              </div>
              <textarea
                rows={3}
                maxLength={500}
                value={organizerInfo}
                onChange={(e) => setOrganizerInfo(e.target.value)}
                placeholder="Giới thiệu uy tín & kinh nghiệm của Ban tổ chức..."
                className={`w-full app-bg-subnav app-text-main text-sm rounded-xl p-4 border ${errors.organizerInfo ? "border-rose-500 ring-1 ring-rose-500" : "app-border"
                  }`}
              />
              {errors.organizerInfo && (
                <p className="text-xs text-rose-500 font-bold mt-1 flex items-center gap-1">
                  <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.organizerInfo}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal 1: Khai báo địa điểm mới */}
      {showNewVenueModal && createPortal(
        <div className="fixed inset-0 min-h-screen w-screen z-[99999] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="app-bg-card border app-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b app-border pb-3">
              <h3 className="text-sm font-extrabold app-text-main flex items-center gap-2">
                <FiPlus className="w-4 h-4 text-blue-600" />
                <span>Khai báo Địa điểm Tổ chức Mới</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewVenueModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewVenue} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold app-text-main">
                  <span className="text-rose-500">*</span> Tên địa điểm mới
                </label>
                <input
                  type="text"
                  required
                  value={newVenueForm.name}
                  onChange={(e) => setNewVenueForm({ ...newVenueForm, name: e.target.value })}
                  placeholder="Ví dụ: Phim trường CityLand, Sân khấu Outdoor ABC..."
                  className="w-full app-bg-subnav app-text-main text-xs rounded-xl px-3.5 py-2.5 border app-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold app-text-main">Tỉnh/Thành phố</label>
                  <select
                    value={newVenueForm.city}
                    onChange={(e) => setNewVenueForm({ ...newVenueForm, city: e.target.value })}
                    className="w-full app-bg-subnav app-text-main text-xs rounded-xl px-3 py-2 border app-border"
                  >
                    <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                    <option value="Hà Nội">Hà Nội</option>
                    <option value="Đà Nẵng">Đà Nẵng</option>
                    <option value="Cần Thơ">Cần Thơ</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold app-text-main">Phường/Xã</label>
                  <input
                    type="text"
                    value={newVenueForm.ward}
                    onChange={(e) => setNewVenueForm({ ...newVenueForm, ward: e.target.value })}
                    placeholder="Phường/Xã..."
                    className="w-full app-bg-subnav app-text-main text-xs rounded-xl px-3 py-2 border app-border"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold app-text-main">
                  <span className="text-rose-500">*</span> Số nhà, tên đường
                </label>
                <input
                  type="text"
                  required
                  value={newVenueForm.address}
                  onChange={(e) => setNewVenueForm({ ...newVenueForm, address: e.target.value })}
                  placeholder="Số nhà, tên đường chi tiết..."
                  className="w-full app-bg-subnav app-text-main text-xs rounded-xl px-3.5 py-2.5 border app-border"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold app-text-main">Sức chứa ước tính (khán giả)</label>
                <input
                  type="number"
                  min={50}
                  value={newVenueForm.capacity}
                  onChange={(e) => setNewVenueForm({ ...newVenueForm, capacity: Number(e.target.value) })}
                  className="w-full app-bg-subnav app-text-main text-xs rounded-xl px-3.5 py-2.5 border app-border"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewVenueModal(false)}
                  className="px-4 py-2 app-bg-subnav app-text-main font-bold text-xs rounded-xl border app-border"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Lưu & Chọn địa điểm
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal 2: Lịch đặt sự kiện tại địa điểm */}
      {showScheduleModal && selectedVenue && createPortal(
        <div className="fixed inset-0 min-h-screen w-screen z-[99999] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="app-bg-card border app-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b app-border pb-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-extrabold app-text-main flex items-center gap-2">
                  <FiCalendar className="w-4 h-4 text-amber-500" />
                  <span>Lịch Sự kiện đã giữ chỗ tại địa điểm</span>
                </h3>
                <p className="text-[11px] app-text-muted">{selectedVenue.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto no-scrollbar">
              {selectedVenue.bookings.map((b, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl app-bg-subnav border app-border space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between font-bold app-text-main">
                    <span>{b.eventName}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px]">
                      {b.status === "CONFIRMED" ? "Đã giữ chỗ" : "Đang chờ duyệt"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] app-text-muted">
                    <span className="flex items-center gap-1 font-mono font-medium">
                      <FiCalendar className="w-3 h-3 text-blue-500" /> {b.date} ({b.timeSlot})
                    </span>
                    <span className="flex items-center gap-1">
                      <FiUsers className="w-3 h-3 text-purple-500" /> BTC: {b.organizer}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-5 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Insert/Edit Image (Styled with app design tokens & Gallery selector) */}
      {showImageModal && createPortal(
        <div className="fixed inset-0 min-h-screen w-screen z-[99999] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="app-bg-card app-text-main border app-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b app-border pb-3">
              <h3 className="text-base font-bold app-text-main flex items-center gap-2">
                <FiImage className="w-4 h-4 text-blue-500" />
                <span>Chèn / Chỉnh sửa hình ảnh (Insert/Edit Image)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer text-lg p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="grid grid-cols-12 gap-5 min-h-[220px]">
              {/* Left Tabs */}
              <div className="col-span-3 border-r app-border pr-3 space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => setImageTab("general")}
                  className={`w-full text-left py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    imageTab === "general"
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                      : "app-text-muted hover:app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  Thông tin
                </button>
                <button
                  type="button"
                  onClick={() => setImageTab("upload")}
                  className={`w-full text-left py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    imageTab === "upload"
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                      : "app-text-muted hover:app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  Tải ảnh lên
                </button>
                <button
                  type="button"
                  onClick={() => setImageTab("gallery")}
                  className={`w-full text-left py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    imageTab === "gallery"
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                      : "app-text-muted hover:app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  Từ Gallery ({galleryImages.length})
                </button>
              </div>

              {/* Right Form Fields */}
              <div className="col-span-9 pl-4 space-y-4">
                {imageTab === "general" ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold app-text-muted block">Đường dẫn hình ảnh (Source URL)</label>
                      <input
                        type="text"
                        value={imageSource}
                        onChange={(e) => setImageSource(e.target.value)}
                        placeholder="https://..."
                        className="w-full app-bg-subnav app-text-main text-xs rounded-xl px-3 py-2 border app-border focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold app-text-muted block">Mô tả thay thế (Alt text)</label>
                      <input
                        type="text"
                        value={imageAlt}
                        onChange={(e) => setImageAlt(e.target.value)}
                        placeholder="Mô tả hình ảnh..."
                        className="w-full app-bg-subnav app-text-main text-xs rounded-xl px-3 py-2 border app-border focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-5 space-y-1">
                        <label className="text-xs font-bold app-text-muted block">Chiều rộng (px)</label>
                        <input
                          type="text"
                          value={imageWidth}
                          onChange={(e) => handleImageWidthChange(e.target.value)}
                          placeholder="Auto / 800"
                          className="w-full app-bg-subnav app-text-main text-xs rounded-xl px-3 py-2 border app-border focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="col-span-5 space-y-1">
                        <label className="text-xs font-bold app-text-muted block">Chiều cao (px)</label>
                        <input
                          type="text"
                          value={imageHeight}
                          onChange={(e) => handleImageHeightChange(e.target.value)}
                          placeholder="Auto"
                          className="w-full app-bg-subnav app-text-main text-xs rounded-xl px-3 py-2 border app-border focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="col-span-2 pb-0.5">
                        <button
                          type="button"
                          onClick={() => setImageLockRatio(!imageLockRatio)}
                          className={`w-full py-2 app-bg-subnav border ${imageLockRatio ? "border-blue-500 text-blue-500" : "app-border app-text-muted"
                            } rounded-xl flex items-center justify-center cursor-pointer transition-colors`}
                          title={imageLockRatio ? "Đang khóa tỉ lệ khung hình" : "Mở khóa tỉ lệ khung hình"}
                        >
                          {imageLockRatio ? <FiLock className="w-4 h-4" /> : <FiUnlock className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                ) : imageTab === "upload" ? (
                  <div className="w-full h-44 border-2 border-dashed app-border rounded-xl app-bg-subnav flex flex-col items-center justify-center p-6 text-center">
                    <input
                      type="file"
                      ref={modalUploadInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={handleModalImageUpload}
                    />
                    <FiUploadCloud className="w-8 h-8 text-blue-500 mb-2" />
                    <button
                      type="button"
                      disabled={isUploadingImage}
                      onClick={() => modalUploadInputRef.current?.click()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isUploadingImage ? "Đang tải lên..." : "Chọn ảnh từ máy tính"}
                    </button>
                    <span className="text-[10px] app-text-muted mt-2">Định dạng JPG, PNG, WebP (Tối đa 5MB)</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar p-1">
                    <span className="text-xs font-bold app-text-muted block">Chọn ảnh từ Gallery sự kiện:</span>
                    {galleryImages.length === 0 ? (
                      <p className="text-xs app-text-muted italic py-6 text-center">Gallery chưa có ảnh nào. Bạn có thể tải ảnh ở tab "Tải ảnh lên".</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2.5">
                        {galleryImages.map((url, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              setImageSource(url);
                              setImageTab("general");
                            }}
                            className={`group relative aspect-square rounded-lg overflow-hidden border cursor-pointer transition-all ${
                              imageSource === url ? "border-blue-500 ring-2 ring-blue-500" : "app-border hover:border-blue-400"
                            }`}
                          >
                            <img src={url} alt={`Gallery item ${i + 1}`} className="w-full h-full object-cover" />
                            {imageSource === url && (
                              <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center">
                                <FiCheckCircle className="w-5 h-5 text-white" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t app-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="px-4 py-2 app-bg-subnav app-text-main font-bold text-xs rounded-xl border app-border cursor-pointer transition-all hover:brightness-95"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveImageModal}
                disabled={!imageSource.trim()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
              >
                Chèn hình ảnh
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Insert/Edit Media (Styled with app design tokens & Video Upload <=20MB) */}
      {showMediaModal && createPortal(
        <div className="fixed inset-0 min-h-screen w-screen z-[99999] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="app-bg-card app-text-main border app-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b app-border pb-3">
              <h3 className="text-base font-bold app-text-main flex items-center gap-2">
                <FiVideo className="w-4 h-4 text-blue-500" />
                <span>Chèn / Chỉnh sửa Media Video</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowMediaModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer text-lg p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="grid grid-cols-12 gap-5 min-h-[220px]">
              {/* Left Tabs */}
              <div className="col-span-3 border-r app-border pr-3 space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => setMediaTab("general")}
                  className={`w-full text-left py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    mediaTab === "general"
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                      : "app-text-muted hover:app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  Thông tin video
                </button>
                <button
                  type="button"
                  onClick={() => setMediaTab("advanced")}
                  className={`w-full text-left py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    mediaTab === "advanced"
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                      : "app-text-muted hover:app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  Nâng cao & Poster
                </button>
              </div>

              {/* Right Form Fields */}
              <div className="col-span-9 space-y-4">
                {mediaTab === "general" ? (
                  <>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold app-text-muted block">Đường dẫn Video (URL)</label>
                        <input
                          type="file"
                          ref={modalVideoInputRef}
                          accept="video/mp4,video/webm"
                          className="hidden"
                          onChange={handleModalVideoUpload}
                        />
                        <button
                          type="button"
                          onClick={() => modalVideoInputRef.current?.click()}
                          disabled={isUploadingImage}
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                        >
                          <FiUploadCloud className="w-3.5 h-3.5" />
                          <span>Tải video (&le; 20MB)</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={mediaSource}
                        onChange={(e) => setMediaSource(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=... hoặc link video MP4"
                        className="w-full app-bg-subnav app-text-main text-xs rounded-xl px-3 py-2 border app-border focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-5 space-y-1">
                        <label className="text-xs font-bold app-text-muted block">Chiều rộng (px)</label>
                        <input
                          type="text"
                          value={mediaWidth}
                          onChange={(e) => handleMediaWidthChange(e.target.value)}
                          placeholder="640"
                          className="w-full app-bg-subnav app-text-main text-xs rounded-xl px-3 py-2 border app-border focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="col-span-5 space-y-1">
                        <label className="text-xs font-bold app-text-muted block">Chiều cao (px)</label>
                        <input
                          type="text"
                          value={mediaHeight}
                          onChange={(e) => handleMediaHeightChange(e.target.value)}
                          placeholder="360"
                          className="w-full app-bg-subnav app-text-main text-xs rounded-xl px-3 py-2 border app-border focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="col-span-2 pb-0.5">
                        <button
                          type="button"
                          onClick={() => setMediaLockRatio(!mediaLockRatio)}
                          className={`w-full py-2 app-bg-subnav border ${mediaLockRatio ? "border-blue-500 text-blue-500" : "app-border app-text-muted"
                            } rounded-xl flex items-center justify-center cursor-pointer transition-colors`}
                          title={mediaLockRatio ? "Đang khóa tỉ lệ 16:9" : "Mở khóa tỉ lệ"}
                        >
                          {mediaLockRatio ? <FiLock className="w-4 h-4" /> : <FiUnlock className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold app-text-muted block">Nguồn video thay thế (Alternative source URL)</label>
                      <input
                        type="text"
                        value={mediaAltSource}
                        onChange={(e) => setMediaAltSource(e.target.value)}
                        placeholder="https://..."
                        className="w-full app-bg-subnav app-text-main text-xs rounded-xl px-3 py-2 border app-border focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold app-text-muted block">Ảnh bìa video (Poster Image URL)</label>
                      <input
                        type="text"
                        value={mediaPoster}
                        onChange={(e) => setMediaPoster(e.target.value)}
                        placeholder="https://... ảnh bìa hiển thị trước khi phát video"
                        className="w-full app-bg-subnav app-text-main text-xs rounded-xl px-3 py-2 border app-border focus:border-blue-500 outline-none"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t app-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowMediaModal(false)}
                className="px-4 py-2 app-bg-subnav app-text-main font-bold text-xs rounded-xl border app-border cursor-pointer transition-all hover:brightness-95"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveMediaModal}
                disabled={!mediaSource.trim()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
              >
                Chèn Media
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* AI Generative Modal */}
      {showAIGenerateModal && createPortal(
        <div className="fixed inset-0 min-h-screen w-screen z-[99999] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-black text-blue-600 dark:text-blue-400 flex items-center gap-2">
                Trợ lý AI Sinh Nội dung
              </h3>
              <button
                type="button"
                onClick={() => setShowAIGenerateModal(false)}
                className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-100 dark:border-blue-800/50">
                <p className="text-xs text-blue-800 dark:text-blue-300 font-medium leading-relaxed">
                  Trợ lý AI sẽ tự động phân tích <strong className="font-bold">Tên Sự Kiện</strong> và các <strong className="font-bold">Ý chính</strong> để tạo ra <strong className="font-bold">Mô tả sự kiện chuẩn SEO</strong> chuyên nghiệp.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                  Nhập các ý chính (Bullet points):
                </label>
                <textarea
                  value={aiBulletPoints}
                  onChange={(e) => setAiBulletPoints(e.target.value)}
                  placeholder="Ví dụ:&#10;- Sự kiện âm nhạc nhẹ nhàng&#10;- Dành cho sinh viên&#10;- Cấm mang đồ ăn bên ngoài&#10;- Quà tặng kèm áo thun"
                  className="w-full h-32 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-800 dark:text-zinc-200 text-sm rounded-xl px-4 py-3 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium resize-none"
                />
              </div>
            </div>
            <div className="p-5 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAIGenerateModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleGenerateDescription}
                disabled={isGenerating}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-70 flex items-center gap-2 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Đang sinh...</span>
                  </>
                ) : (
                  <>
                    <FiCheckCircle className="w-4 h-4" />
                    <span>Bắt đầu Sinh Nội dung</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Next Step Action Button & Save Draft */}
      <div className="flex items-center justify-between pt-4">
        {onSaveDraft && (
          <button
            type="button"
            onClick={onSaveDraft}
            className="px-6 py-3 app-bg-subnav app-text-main font-bold text-sm rounded-xl border app-border hover:border-blue-500 flex items-center gap-2 cursor-pointer transition-all"
          >
            <FiBookmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Lưu bản nháp</span>
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95 ml-auto"
        >
          <span>Tiếp tục: Thời gian & Loại vé</span>
          <FiChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Step1EventInfo;
