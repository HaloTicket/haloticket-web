import React, { useState, useEffect, useRef } from "react";
import type { TicketItem, CustomQuestionItem, Step1Errors, Step2Errors, Step5Errors } from "@/types/organizer";
import CreateEventStepper from "./components/create-event/CreateEventStepper";
import Step1EventInfo from "./components/create-event/Step1EventInfo";
import Step2TicketsAndTime from "./components/create-event/Step2TicketsAndTime";
import Step3Settings from "./components/create-event/Step3Settings";
import Step4CustomQuestions from "./components/create-event/Step4CustomQuestions";
import Step5PaymentInfo from "./components/create-event/Step5PaymentInfo";
import NoticeModal from "./components/create-event/NoticeModal";
import AddTicketModal from "./components/create-event/AddTicketModal";
import SuccessSubmittedModal from "./components/create-event/SuccessSubmittedModal";
import { eventApi } from "@/services/eventApi";
import { mediaApi } from "@/services/mediaApi";
import { getCachedUserProfile } from "@/services/userApi";
import { formatDatetimeLocal } from "@/utils/formatters";

async function ensureS3Url(urlOrData: string | null | undefined, folder: string): Promise<string | null> {
  if (!urlOrData) return null;
  if ((urlOrData.startsWith("http://") || urlOrData.startsWith("https://")) && !urlOrData.startsWith("blob:")) {
    return urlOrData;
  }
  if (urlOrData.startsWith("blob:")) {
    try {
      const resp = await fetch(urlOrData);
      const blob = await resp.blob();
      const file = new File([blob], `img_${Date.now()}.png`, { type: blob.type || "image/png" });
      const res = await mediaApi.uploadImage(file, folder);
      if (res?.imageUrl) return res.imageUrl;
    } catch (e) {
      console.error(`Failed to upload blob image to S3 (${folder}):`, e);
    }
  } else if (urlOrData.startsWith("data:image/")) {
    try {
      const res = await mediaApi.uploadBase64Image(urlOrData, folder);
      if (res?.imageUrl) return res.imageUrl;
    } catch (e) {
      console.error(`Failed to upload base64 image to S3 (${folder}):`, e);
    }
  }
  return urlOrData;
}

export const CreateEvent: React.FC = () => {
  // scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  // modals state
  const [showNoticeModal, setShowNoticeModal] = useState(true);
  const [showAddTicketModal, setShowAddTicketModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // active stepper step (1 to 5)
  const [currentStep, setCurrentStep] = useState(1);

  // FORM ERRORS & DRAFT STATE
  const [step1Errors, setStep1Errors] = useState<Step1Errors>({});
  const [step2Errors, setStep2Errors] = useState<Step2Errors>({});
  const [step5Errors, setStep5Errors] = useState<Step5Errors>({});
  const [isOrganizerPreFilled, setIsOrganizerPreFilled] = useState(false);
  const [draftSavedToast, setDraftSavedToast] = useState<string | null>(null);

  // FORM STATE
  // step 1: event info
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Nhạc sống");
  const [locationType, setLocationType] = useState<"offline" | "online">("offline");
  const [locationName, setLocationName] = useState("");
  const [city, setCity] = useState("TP. Hồ Chí Minh");
  const [ward, setWard] = useState("Phường Bến Nghé");
  const [address, setAddress] = useState("");
  const [posterImage, setPosterImage] = useState<string | null>(null);
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [organizerName, setOrganizerName] = useState("");
  const [organizerInfo, setOrganizerInfo] = useState("");
  const [organizerLogo, setOrganizerLogo] = useState<string | null>(null);

  // step 2: time & ticket
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tickets, setTickets] = useState<TicketItem[]>([]);

  // step 3: settings
  const [isPrivate, setIsPrivate] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [enableCustomQuestions, setEnableCustomQuestions] = useState(false);

  // step 4: questions (only if enableCustomQuestions = true)
  const [questionScope, setQuestionScope] = useState<"order" | "ticket">("order");
  const [questions, setQuestions] = useState<CustomQuestionItem[]>([]);

  // step 5: payment info & VAT invoice
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("Vietcombank");
  const [bankBranch, setBankBranch] = useState("");
  const [businessType, setBusinessType] = useState<"individual" | "company">("individual");
  const [taxName, setTaxName] = useState("");
  const [taxAddress, setTaxAddress] = useState("");
  const [taxCode, setTaxCode] = useState("");

  const [_currentEventId, setCurrentEventId] = useState<string | null>(null);
  const currentEventIdRef = useRef<string | null>(null);
  const isInitialLoadingRef = useRef<boolean>(true);

  const updateCurrentEventId = (id: string | null) => {
    currentEventIdRef.current = id;
    setCurrentEventId(id);
  };

  const [eventStatus, setEventStatus] = useState<"DRAFT" | "PENDING">("DRAFT");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saving" | "saved" | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // restore draft/pending event 
  useEffect(() => {
    let isMounted = true;

    const loadOrganizerAndDbDraft = async () => {
      isInitialLoadingRef.current = true;
      try {
        const cachedUser = getCachedUserProfile();
        const currentUserId = cachedUser?.id || cachedUser?.keycloakId;

        // fetch organizer profile
        if (currentUserId) {
          const orgProfile = await eventApi.getOrganizerProfile(currentUserId);
          if (isMounted && orgProfile && orgProfile.name) {
            setOrganizerName(orgProfile.name);
            if (orgProfile.description) setOrganizerInfo(orgProfile.description);
            if (orgProfile.avatar) setOrganizerLogo(orgProfile.avatar);
            setIsOrganizerPreFilled(true);
          }
        }

        // check URL for event id or query DB for draft
        const urlParams = new URLSearchParams(window.location.search);
        const draftIdParam = urlParams.get("id");

        let draftEventData: any = null;
        if (draftIdParam) {
          draftEventData = await eventApi.getEventById(draftIdParam);
        } else {
          // find existing DRAFT status event
          const allEvents = await eventApi.getAllEvents();
          if (Array.isArray(allEvents)) {
            draftEventData = allEvents.find(
              (ev: any) =>
                (ev.eventApprovalStatus === "DRAFT" || ev.eventStatus === "DRAFT") &&
                (!ev.organizer?.id || ev.organizer?.id === currentUserId)
            );
          }
        }

        if (isMounted && draftEventData) {
          updateCurrentEventId(draftEventData.id);
          const rawStatus = (draftEventData.eventApprovalStatus || draftEventData.eventStatus || "").toUpperCase();
          if (rawStatus === "PENDING") {
            setEventStatus("PENDING");
          } else {
            setEventStatus("DRAFT");
          }

          if (draftEventData.title) setTitle(draftEventData.title);
          if (draftEventData.categoryName || draftEventData.category) setCategory(draftEventData.categoryName || draftEventData.category);
          if (draftEventData.locationType) setLocationType(draftEventData.locationType);
          if (draftEventData.locationName) setLocationName(draftEventData.locationName);
          if (draftEventData.city) setCity(draftEventData.city);
          if (draftEventData.ward) setWard(draftEventData.ward);
          if (draftEventData.address) setAddress(draftEventData.address);

          const poster = draftEventData.thumbnailUrl || draftEventData.posterImage || draftEventData.image;
          if (poster) setPosterImage(poster);
          const banner = draftEventData.bannerUrl || draftEventData.posterImage || draftEventData.image;
          if (banner) setBannerImage(banner);

          const desc = draftEventData.descriptionText || draftEventData.description;
          if (desc) setDescription(desc);

          let galleryList: string[] = [];
          if (Array.isArray(draftEventData.galleryImages)) {
            galleryList = draftEventData.galleryImages;
          } else if (typeof draftEventData.galleryImages === "string") {
            try { galleryList = JSON.parse(draftEventData.galleryImages); } catch (e) { }
          }
          if (galleryList.length === 0 && desc) {
            const imgMatches = desc.match(/src=["']([^"']+)["']/g);
            if (imgMatches) {
              const extracted = imgMatches.map((m: string) => m.replace(/^src=["']|["']$/g, ""));
              galleryList = Array.from(new Set(extracted));
            }
          }
          setGalleryImages(galleryList);

          const start = draftEventData.startTime || draftEventData.startDate;
          if (start) setStartDate(formatDatetimeLocal(start));
          const end = draftEventData.endTime || draftEventData.endDate;
          if (end) setEndDate(formatDatetimeLocal(end));

          if (draftEventData.tickets) {
            let parsedTickets = draftEventData.tickets;
            if (typeof parsedTickets === "string") {
              try { parsedTickets = JSON.parse(parsedTickets); } catch (e) { }
            }
            if (Array.isArray(parsedTickets)) {
              const mappedTickets: TicketItem[] = parsedTickets.map((t: any, idx: number) => ({
                id: String(t.id || `ticket_${idx}_${Date.now()}`),
                name: t.name || "",
                price: t.price ?? 0,
                isFree: t.isFree ?? (t.price === 0),
                totalQuantity: t.totalQuantity ?? 100,
                minPerOrder: t.minPerOrder ?? 1,
                maxPerOrder: t.maxPerOrder ?? 5,
                startSaleDate: t.startSaleDate || t.start_sale_date || "",
                endSaleDate: t.endSaleDate || t.end_sale_date || "",
                description: t.description || "",
                image: t.image || null
              }));
              setTickets(mappedTickets);
            }
          }

          if (typeof draftEventData.isPrivate === "boolean") setIsPrivate(draftEventData.isPrivate);
          if (draftEventData.confirmationMessage) setConfirmationMessage(draftEventData.confirmationMessage);
          if (typeof draftEventData.enableCustomQuestions === "boolean") setEnableCustomQuestions(draftEventData.enableCustomQuestions);
          if (draftEventData.questionScope) setQuestionScope(draftEventData.questionScope);

          const rawQList = draftEventData.customQuestions || draftEventData.questions;
          if (rawQList) {
            let parsedQList = rawQList;
            if (typeof parsedQList === "string") {
              try { parsedQList = JSON.parse(parsedQList); } catch (e) { }
            }
            if (Array.isArray(parsedQList)) setQuestions(parsedQList);
          }

          if (draftEventData.organizerName || draftEventData.organizer?.name) {
            setOrganizerName(draftEventData.organizerName || draftEventData.organizer?.name);
          }
          if (draftEventData.organizerInfo || draftEventData.organizer?.description) {
            setOrganizerInfo(draftEventData.organizerInfo || draftEventData.organizer?.description);
          }
          if (draftEventData.organizerLogo || draftEventData.organizer?.avatar) {
            setOrganizerLogo(draftEventData.organizerLogo || draftEventData.organizer?.avatar);
          }

          if (draftEventData.accountHolder) setAccountHolder(draftEventData.accountHolder);
          if (draftEventData.accountNumber) setAccountNumber(draftEventData.accountNumber);
          if (draftEventData.bankName) setBankName(draftEventData.bankName);
          if (draftEventData.bankBranch) setBankBranch(draftEventData.bankBranch);
          if (draftEventData.businessType) setBusinessType(draftEventData.businessType);
          if (draftEventData.taxName) setTaxName(draftEventData.taxName);
          if (draftEventData.taxAddress) setTaxAddress(draftEventData.taxAddress);
          if (draftEventData.taxCode) setTaxCode(draftEventData.taxCode);

          setAutoSaveStatus("saved");
          setLastSavedAt(
            new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
          );
        }
      } catch (e) {
        console.error("Failed to load draft from database", e);
      } finally {
        isInitialLoadingRef.current = false;
      }
    };

    loadOrganizerAndDbDraft();

    return () => {
      isMounted = false;
    };
  }, []);

  // clear draft & reset form
  const handleClearDraft = () => {
    updateCurrentEventId(null);
    setEventStatus("DRAFT");
    setTitle("");
    setCategory("Nhạc sống");
    setLocationType("offline");
    setLocationName("");
    setCity("TP. Hồ Chí Minh");
    setWard("Phường Bến Nghé");
    setAddress("");
    setPosterImage(null);
    setBannerImage(null);
    setDescription("");
    setGalleryImages([]);
    setStartDate("");
    setEndDate("");
    setTickets([]);
    setIsPrivate(false);
    setConfirmationMessage("");
    setEnableCustomQuestions(false);
    setQuestions([]);
    setAccountHolder("");
    setAccountNumber("");
    setBankName("");
    setBankBranch("");
    setTaxName("");
    setTaxCode("");
    setTaxAddress("");
    setCurrentStep(1);
    setAutoSaveStatus(null);
    setLastSavedAt(null);
    setDraftSavedToast("Đã xóa nháp và làm mới trang tạo sự kiện.");
    setTimeout(() => setDraftSavedToast(null), 3000);
  };

  const processAllImagesToS3 = async (
    poster: string | null,
    banner: string | null,
    logo: string | null,
    gallery: string[]
  ) => {
    const [uploadedPoster, uploadedBanner, uploadedLogo, ...uploadedGallery] = await Promise.all([
      ensureS3Url(poster, "posters"),
      ensureS3Url(banner, "banners"),
      ensureS3Url(logo, "logos"),
      ...gallery.map((img) => ensureS3Url(img, "gallery"))
    ]);

    const validGallery = uploadedGallery.filter((url): url is string => Boolean(url));

    if (uploadedPoster && uploadedPoster !== poster) setPosterImage(uploadedPoster);
    if (uploadedBanner && uploadedBanner !== banner) setBannerImage(uploadedBanner);
    if (uploadedLogo && uploadedLogo !== logo) setOrganizerLogo(uploadedLogo);
    if (JSON.stringify(validGallery) !== JSON.stringify(gallery)) setGalleryImages(validGallery);

    return {
      uploadedPoster: uploadedPoster || null,
      uploadedBanner: uploadedBanner || null,
      uploadedLogo: uploadedLogo || null,
      uploadedGallery: validGallery
    };
  };

  // real-time auto-save
  useEffect(() => {
    if (isSubmitted || isSubmitting || isInitialLoadingRef.current) return;

    const hasContent = Boolean(
      title.trim() || locationName.trim() || description.trim() || posterImage || bannerImage || startDate || tickets.length > 0
    );

    if (!hasContent) return;

    setAutoSaveStatus("saving");

    const timer = setTimeout(async () => {
      try {
        const cachedUser = getCachedUserProfile();
        const currentUserId = cachedUser?.id || cachedUser?.keycloakId || "user_default_id";

        const activeEventId = currentEventIdRef.current;

        const { uploadedPoster, uploadedBanner, uploadedLogo, uploadedGallery } =
          await processAllImagesToS3(posterImage, bannerImage, organizerLogo, galleryImages);

        const draftPayload = {
          eventId: activeEventId,
          userId: currentUserId,
          title,
          categoryName: category,
          locationType,
          locationName,
          city,
          ward,
          address,
          thumbnailUrl: uploadedPoster,
          bannerUrl: uploadedBanner,
          description,
          galleryImages: uploadedGallery,
          organizerName,
          organizerInfo,
          organizerLogo: uploadedLogo,
          startTime: startDate,
          endTime: endDate,
          tickets,
          isPrivate,
          confirmationMessage,
          enableCustomQuestions,
          questionScope,
          customQuestions: questions,
          accountHolder,
          accountNumber,
          bankName,
          bankBranch,
          businessType,
          taxName,
          taxAddress,
          taxCode,
          status: eventStatus === "PENDING" ? "PENDING" : "DRAFT"
        };

        const res = await eventApi.createEventApprovalRequest(draftPayload);
        if (res && res.id) {
          updateCurrentEventId(res.id);
        }

        const timeStr = new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        });
        setAutoSaveStatus("saved");
        setLastSavedAt(timeStr);
      } catch (err) {
        console.error("Failed to auto-save draft to database", err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    title,
    category,
    locationType,
    locationName,
    city,
    ward,
    address,
    posterImage,
    bannerImage,
    description,
    organizerName,
    organizerInfo,
    organizerLogo,
    startDate,
    endDate,
    tickets,
    isPrivate,
    confirmationMessage,
    enableCustomQuestions,
    questionScope,
    questions,
    accountHolder,
    accountNumber,
    bankName,
    bankBranch,
    businessType,
    taxName,
    taxAddress,
    taxCode,
    eventStatus,
    isSubmitted,
    isSubmitting
  ]);

  // save draft function manually
  const handleSaveDraft = async () => {
    try {
      const cachedUser = getCachedUserProfile();
      const currentUserId = cachedUser?.id || cachedUser?.keycloakId || "user_default_id";

      const activeEventId = currentEventIdRef.current;

      const { uploadedPoster, uploadedBanner, uploadedLogo, uploadedGallery } =
        await processAllImagesToS3(posterImage, bannerImage, organizerLogo, galleryImages);

      const draftPayload = {
        eventId: activeEventId,
        userId: currentUserId,
        title,
        categoryName: category,
        locationType,
        locationName,
        city,
        ward,
        address,
        thumbnailUrl: uploadedPoster,
        bannerUrl: uploadedBanner,
        description,
        galleryImages: uploadedGallery,
        organizerName,
        organizerInfo,
        organizerLogo: uploadedLogo,
        startTime: startDate,
        endTime: endDate,
        tickets,
        isPrivate,
        confirmationMessage,
        enableCustomQuestions,
        questionScope,
        customQuestions: questions,
        accountHolder,
        accountNumber,
        bankName,
        bankBranch,
        businessType,
        taxName,
        taxAddress,
        taxCode,
        status: eventStatus === "PENDING" ? "PENDING" : "DRAFT"
      };

      const res = await eventApi.createEventApprovalRequest(draftPayload);
      if (res && res.id) {
        updateCurrentEventId(res.id);
      }

      const timeStr = new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      setAutoSaveStatus("saved");
      setLastSavedAt(timeStr);
      setDraftSavedToast(
        eventStatus === "PENDING"
          ? "Đã lưu cập nhật sự kiện chờ duyệt (PENDING) thành công!"
          : "Đã lưu bản nháp sự kiện (DRAFT) vào Database thành công!"
      );
      setTimeout(() => setDraftSavedToast(null), 4000);
    } catch (err) {
      console.error("Failed to manually save draft to DB", err);
    }
  };



  // dynamic step titles
  const stepTitles = enableCustomQuestions
    ? [
      "1. Thông tin sự kiện",
      "2. Thời gian & Loại vé",
      "3. Cài đặt",
      "4. Thông tin đăng ký",
      "5. Thông tin thanh toán"
    ]
    : [
      "1. Thông tin sự kiện",
      "2. Thời gian & Loại vé",
      "3. Cài đặt",
      "4. Thông tin thanh toán"
    ];

  // step validations
  const handleStep1Next = () => {
    const errs: Step1Errors = {};
    if (!title.trim()) errs.title = "Vui lòng nhập tên sự kiện!";
    if (locationType === "offline") {
      if (!locationName.trim()) errs.locationName = "Vui lòng nhập tên địa điểm tổ chức!";
      if (!address.trim()) errs.address = "Vui lòng nhập địa điểm (số nhà, tên đường)!";
    }
    if (!description.trim()) errs.description = "Vui lòng nhập mô tả chi tiết sự kiện!";
    if (!organizerName.trim()) errs.organizerName = "Vui lòng nhập tên ban tổ chức!";

    setStep1Errors(errs);
    if (Object.keys(errs).length === 0) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleStep2Next = () => {
    const errs: Step2Errors = {};
    if (!startDate) errs.startDate = "Vui lòng chọn thời gian bắt đầu sự kiện!";
    if (!endDate) errs.endDate = "Vui lòng chọn thời gian kết thúc sự kiện!";
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      errs.endDate = "Thời gian kết thúc sự kiện phải diễn ra sau thời gian bắt đầu!";
    }
    if (tickets.length === 0) {
      errs.tickets = "Vui lòng tạo ít nhất một hạng vé!";
    }

    if (startDate && endDate) {
      const evtStart = new Date(startDate);
      const evtEnd = new Date(endDate);
      for (const t of tickets) {
        if (t.startSaleDate && t.endSaleDate) {
          if (new Date(t.endSaleDate) <= new Date(t.startSaleDate)) {
            errs.tickets = `Loại vé "${t.name}": Thời gian kết thúc bán vé phải diễn ra sau thời gian bắt đầu bán vé!`;
            break;
          }
        }
        if (t.startSaleDate && new Date(t.startSaleDate) >= evtStart) {
          errs.tickets = `Loại vé "${t.name}": Thời gian bắt đầu bán vé phải diễn ra trước thời gian bắt đầu sự kiện!`;
          break;
        }
        if (t.endSaleDate && new Date(t.endSaleDate) > evtEnd) {
          errs.tickets = `Loại vé "${t.name}": Thời gian kết thúc bán vé không thể diễn ra sau thời gian kết thúc sự kiện!`;
          break;
        }
      }
    }

    setStep2Errors(errs);
    if (Object.keys(errs).length === 0) {
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const [editingTicket, setEditingTicket] = useState<TicketItem | null>(null);

  // handle add or edit ticket
  const handleSaveTicket = (savedTicket: TicketItem) => {
    const exists = tickets.some((t) => t.id === savedTicket.id);
    if (exists) {
      setTickets(tickets.map((t) => (t.id === savedTicket.id ? savedTicket : t)));
    } else {
      setTickets([...tickets, savedTicket]);
    }
    setShowAddTicketModal(false);
    setEditingTicket(null);
  };

  const handleOpenEditTicketModal = (ticket: TicketItem) => {
    setEditingTicket(ticket);
    setShowAddTicketModal(true);
  };

  // delete ticket
  const handleDeleteTicket = (id: string) => {
    setTickets(tickets.filter((t) => t.id !== id));
  };

  // handle add question
  const handleAddQuestion = () => {
    const newQ: CustomQuestionItem = {
      id: `q_${Date.now()}`,
      title: "Câu hỏi dạng văn bản mới",
      description: "Nhập mô tả cho câu hỏi này",
      type: "text",
      isRequired: false
    };
    setQuestions([...questions, newQ]);
  };

  // handle delete question
  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  // final submit event request
  const handleSubmitApprovalRequest = async () => {
    const errs: Step5Errors = {};
    if (!accountHolder.trim()) errs.accountHolder = "Vui lòng nhập tên chủ tài khoản!";
    if (!accountNumber.trim()) errs.accountNumber = "Vui lòng nhập số tài khoản ngân hàng!";
    if (!bankName.trim()) errs.bankName = "Vui lòng chọn ngân hàng!";

    setStep5Errors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSubmitting(true);

    try {
      const { uploadedPoster, uploadedBanner, uploadedLogo, uploadedGallery } =
        await processAllImagesToS3(posterImage, bannerImage, organizerLogo, galleryImages);

      // build event creation request payload
      const cachedUser = getCachedUserProfile();
      const currentUserId = cachedUser?.id || cachedUser?.keycloakId || "user_default_id";

      const activeEventId = currentEventIdRef.current;

      const payload = {
        eventId: activeEventId,
        userId: currentUserId,
        status: "PENDING",
        title,
        categoryName: category,
        locationType,
        locationName,
        city,
        ward,
        address,
        thumbnailUrl: uploadedPoster,
        bannerUrl: uploadedBanner,
        description,
        galleryImages: uploadedGallery,
        organizerName,
        organizerInfo,
        organizerLogo: uploadedLogo,
        startTime: startDate,
        endTime: endDate,
        tickets,
        isPrivate,
        confirmationMessage,
        enableCustomQuestions,
        questionScope,
        customQuestions: questions,
        accountHolder,
        accountNumber,
        bankName,
        bankBranch,
        businessType,
        taxName,
        taxCode,
        taxAddress
      };

      // send event approval request via api-gateway
      const res = await eventApi.createEventApprovalRequest(payload);
      if (res && res.id) {
        updateCurrentEventId(res.id);
      }
      setEventStatus("PENDING");

      // save organizer profile to storage for future auto pre-fill
      localStorage.setItem(
        "halo_organizer_profile",
        JSON.stringify({
          name: organizerName,
          info: organizerInfo,
          logo: uploadedLogo
        })
      );

      // Clear draft after successful submission
      localStorage.removeItem("halo_draft_event");

      setIsSubmitted(true);
    } catch (error) {
      console.error("Failed to submit event approval request", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen app-bg-page transition-colors duration-300 pb-20">
      {/* Toast Notification Banner for Draft Save */}
      {draftSavedToast && (
        <div className="fixed top-20 right-6 z-50 bg-blue-600 text-white px-5 py-3 rounded-xl shadow-2xl font-bold text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top duration-300">
          <span>✓ {draftSavedToast}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="w-full max-w-[1340px] mx-auto px-6 md:px-12 lg:px-16 pt-6">
        {/* Real-time Auto-Save Status Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 app-bg-card border app-border rounded-xl px-4 py-2.5 mb-4 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold">
            {autoSaveStatus === "saving" ? (
              <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-extrabold">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>Đang tự động lưu bản nháp...</span>
              </span>
            ) : lastSavedAt ? (
              <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Đã tự động lưu nháp DRAFT lúc {lastSavedAt}</span>
              </span>
            ) : (
              <span className="flex items-center gap-2 app-text-muted">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Tự động lưu nháp (Auto-Save ON)</span>
              </span>
            )}
          </div>

          {lastSavedAt && (
            <button
              type="button"
              onClick={handleClearDraft}
              className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
            >
              Xóa nháp & Làm mới từ đầu
            </button>
          )}
        </div>

        {/* Stepper Navigation Bar */}
        <CreateEventStepper
          stepTitles={stepTitles}
          currentStep={currentStep}
          onStepClick={(stepNum) => setCurrentStep(stepNum)}
        />

        {/* Step 1: Event info */}
        {currentStep === 1 && (
          <Step1EventInfo
            title={title}
            setTitle={setTitle}
            category={category}
            setCategory={setCategory}
            locationType={locationType}
            setLocationType={setLocationType}
            locationName={locationName}
            setLocationName={setLocationName}
            city={city}
            setCity={setCity}
            ward={ward}
            setWard={setWard}
            address={address}
            setAddress={setAddress}
            posterImage={posterImage}
            setPosterImage={setPosterImage}
            bannerImage={bannerImage}
            setBannerImage={setBannerImage}
            description={description}
            setDescription={setDescription}
            galleryImages={galleryImages}
            setGalleryImages={setGalleryImages}
            organizerName={organizerName}
            setOrganizerName={setOrganizerName}
            organizerInfo={organizerInfo}
            setOrganizerInfo={setOrganizerInfo}
            organizerLogo={organizerLogo}
            setOrganizerLogo={setOrganizerLogo}
            errors={step1Errors}
            isOrganizerPreFilled={isOrganizerPreFilled}
            onSaveDraft={handleSaveDraft}
            onNext={handleStep1Next}
          />
        )}

        {/* Step 2: time & ticket */}
        {currentStep === 2 && (
          <Step2TicketsAndTime
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            tickets={tickets}
            errors={step2Errors}
            onOpenAddTicketModal={() => {
              setEditingTicket(null);
              setShowAddTicketModal(true);
            }}
            onEditTicket={handleOpenEditTicketModal}
            onDeleteTicket={handleDeleteTicket}
            onSaveDraft={handleSaveDraft}
            onBack={() => setCurrentStep(1)}
            onNext={handleStep2Next}
          />
        )}

        {/* Step 3: settings */}
        {currentStep === 3 && (
          <Step3Settings
            isPrivate={isPrivate}
            setIsPrivate={setIsPrivate}
            confirmationMessage={confirmationMessage}
            setConfirmationMessage={setConfirmationMessage}
            enableCustomQuestions={enableCustomQuestions}
            setEnableCustomQuestions={setEnableCustomQuestions}
            onBack={() => setCurrentStep(2)}
            onNext={() => setCurrentStep(4)}
          />
        )}

        {/* Step 4: questions (Only rendered when survey questions toggle is ENABLED) */}
        {enableCustomQuestions && currentStep === 4 && (
          <Step4CustomQuestions
            enableCustomQuestions={enableCustomQuestions}
            setEnableCustomQuestions={setEnableCustomQuestions}
            questionScope={questionScope}
            setQuestionScope={setQuestionScope}
            questions={questions}
            setQuestions={setQuestions}
            onAddQuestion={handleAddQuestion}
            onDeleteQuestion={handleDeleteQuestion}
            onBack={() => setCurrentStep(3)}
            onNext={() => setCurrentStep(5)}
          />
        )}

        {/* Step 5: payment info & VAT invoice (Step 4 when survey disabled, Step 5 when enabled) */}
        {((!enableCustomQuestions && currentStep === 4) || (enableCustomQuestions && currentStep === 5)) && (
          <Step5PaymentInfo
            accountHolder={accountHolder}
            setAccountHolder={setAccountHolder}
            accountNumber={accountNumber}
            setAccountNumber={setAccountNumber}
            bankName={bankName}
            setBankName={setBankName}
            bankBranch={bankBranch}
            setBankBranch={setBankBranch}
            businessType={businessType}
            setBusinessType={setBusinessType}
            taxName={taxName}
            setTaxName={setTaxName}
            taxAddress={taxAddress}
            setTaxAddress={setTaxAddress}
            taxCode={taxCode}
            setTaxCode={setTaxCode}
            errors={step5Errors}
            isSubmitting={isSubmitting}
            onSaveDraft={handleSaveDraft}
            onBack={() => setCurrentStep(enableCustomQuestions ? 4 : 3)}
            onSubmit={handleSubmitApprovalRequest}
          />
        )}
      </div>

      {/* Modal 1: notice */}
      {showNoticeModal && <NoticeModal onClose={() => setShowNoticeModal(false)} />}

      {/* Modal 2: create or edit ticket */}
      {showAddTicketModal && (
        <AddTicketModal
          initialTicket={editingTicket}
          eventStartDate={startDate}
          eventEndDate={endDate}
          onClose={() => {
            setShowAddTicketModal(false);
            setEditingTicket(null);
          }}
          onSave={handleSaveTicket}
        />
      )}

      {/* Modal 3: success submitted */}
      {isSubmitted && <SuccessSubmittedModal title={title} />}
    </div>
  );
};

export default CreateEvent;

