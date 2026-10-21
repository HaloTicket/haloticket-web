import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { TicketItem, CustomQuestionItem, Step1Errors, Step2Errors, Step5Errors, ShowtimeItem } from "@/types/organizer";
import CreateEventStepper from "@/features/organizer/components/create-event/CreateEventStepper";
import Step1EventInfo from "@/features/organizer/components/create-event/Step1EventInfo";
import Step2TicketsAndTime from "@/features/organizer/components/create-event/Step2TicketsAndTime";
import Step3Settings from "@/features/organizer/components/create-event/Step3Settings";
import Step4CustomQuestions from "@/features/organizer/components/create-event/Step4CustomQuestions";
import Step5PaymentInfo from "@/features/organizer/components/create-event/Step5PaymentInfo";
import AddTicketModal from "@/features/organizer/components/create-event/AddTicketModal";
import SuccessSubmittedModal from "@/features/organizer/components/create-event/SuccessSubmittedModal";
import { eventApi } from "@/services/eventApi";
import { ticketApi } from "@/services/ticketApi";
import { mediaApi } from "@/services/mediaApi";
import { organizerApi } from "@/services/organizerApi";
import { getCachedUserProfile } from "@/services/userApi";
import { useParams } from "react-router-dom";
import { formatDatetimeLocal } from "@/utils/formatters";
import { FiRefreshCw, FiCheckCircle, FiInfo, FiAlertCircle } from "react-icons/fi";

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
  }
  return urlOrData;
}

export const EventEditInfo: React.FC = () => {
  const { t } = useTranslation();
  const { eventId } = useParams<{ eventId: string }>();

  // active stepper step (1 to 5)
  const [currentStep, setCurrentStep] = useState(1);

  // modals & loading state
  const [showAddTicketModal, setShowAddTicketModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketItem | null>(null);
  const [isSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast notification state
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "info" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "info" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // FORM ERRORS
  const [step1Errors, setStep1Errors] = useState<Step1Errors>({});
  const [step2Errors, setStep2Errors] = useState<Step2Errors>({});
  const [step5Errors] = useState<Step5Errors>({});

  // EVENT STATUS & INITIAL SNAPSHOT (For change detection)
  const [eventStatus, setEventStatus] = useState<string>("PENDING");
  const [initialSnapshot, setInitialSnapshot] = useState<string>("");
  const [rejectionReasonText, setRejectionReasonText] = useState<string>("");
  const [rejectionNotesText, setRejectionNotesText] = useState<string>("");
  const [rejectedFields, setRejectedFields] = useState<string[]>([]);

  // FORM STATE
  // step 1: event info
  const [title, setTitle] = useState(t("Sự kiện HaloTicket"));
  const [category, setCategory] = useState(t("Nhạc sống"));
  const [locationType, setLocationType] = useState<"offline" | "online">("offline");
  const [locationName, setLocationName] = useState("");
  const [city, setCity] = useState("TP. Hồ Chí Minh");
  const [ward, setWard] = useState("Phường Bến Nghé");
  const [address, setAddress] = useState("");
  const [posterImage, setPosterImage] = useState<string | null>(null);
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [organizerName, setOrganizerName] = useState("Halo Media Group");
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

  // step 4: questions
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
  const [showtimes, setShowtimes] = useState<ShowtimeItem[]>([]);

  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start <= end) {
        const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        const newShowtimes: ShowtimeItem[] = [];
        
        if (diffHours >= 24) {
          const startHour = start.getHours() + start.getMinutes() / 60 + start.getSeconds() / 3600;
          const endHour = end.getHours() + end.getMinutes() / 60 + end.getSeconds() / 3600;
          
          let dailyDurationMs = 0;
          if (startHour <= endHour) {
             dailyDurationMs = (end.getTime() % 86400000) - (start.getTime() % 86400000);
             if (dailyDurationMs < 0) dailyDurationMs += 86400000;
          } else {
             // overnight showtime
             dailyDurationMs = ((24 - startHour) + endHour) * 3600000;
          }
          
          // fallback if calculated duration is 0, make it at least 1 hour
          if (dailyDurationMs === 0) dailyDurationMs = 3600000;

          let currentDate = new Date(start);
          currentDate.setHours(0, 0, 0, 0);
          
          let tempEnd = new Date(end);
          if (startHour > endHour) {
            // if overnight, the last showtime starts on the day before tempEnd
            tempEnd.setDate(tempEnd.getDate() - 1);
          }
          tempEnd.setHours(0, 0, 0, 0);
          
          let dayCount = 1;
          while (currentDate <= tempEnd) {
            const displayStr = currentDate.toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' });
            
            const dayStart = new Date(currentDate);
            dayStart.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), 0);
            
            const dayEnd = new Date(dayStart.getTime() + dailyDurationMs);
            
            const stStr = formatDatetimeLocal(dayStart.toISOString()) || "";
            const etStr = formatDatetimeLocal(dayEnd.toISOString()) || "";

            newShowtimes.push({
              id: Date.now().toString() + Math.random().toString(),
              name: `${t("Suất")} ${dayCount}: ${t("Ngày")} ${displayStr}`,
              startTime: stStr,
              endTime: etStr,
              saleStartTime: "",
              saleEndTime: ""
            });
            currentDate.setDate(currentDate.getDate() + 1);
            dayCount++;
          }
        } else {
          const startStr = startDate.length === 16 ? startDate + ":00" : startDate;
          const endStr = endDate.length === 16 ? endDate + ":00" : endDate;
          
          newShowtimes.push({
            id: Date.now().toString(),
            name: t("Suất 1"),
            startTime: startStr,
            endTime: endStr,
            saleStartTime: "",
            saleEndTime: ""
          });
        }
        
        setShowtimes(prev => newShowtimes.map(ns => {
           const existing = prev.find(p => p.name === ns.name);
           if (existing) {
             return { ...ns, saleStartTime: existing.saleStartTime, saleEndTime: existing.saleEndTime, id: existing.id };
           }
           return ns;
        }));
      }
    } else {
      setShowtimes([]);
    }
  }, [startDate, endDate]);

  // auto-clamp currentStep if enableCustomQuestions changes
  const totalSteps = enableCustomQuestions ? 5 : 4;
  useEffect(() => {
    if (!enableCustomQuestions && currentStep > 4) {
      setCurrentStep(4);
    }
  }, [enableCustomQuestions, currentStep]);

  const getFormSnapshotString = (
    overrides?: Partial<Record<string, unknown>>
  ) => {
    return JSON.stringify({
      title: overrides?.title ?? title,
      category: overrides?.category ?? category,
      locationType: overrides?.locationType ?? locationType,
      locationName: overrides?.locationName ?? locationName,
      city: overrides?.city ?? city,
      ward: overrides?.ward ?? ward,
      address: overrides?.address ?? address,
      posterImage: overrides?.posterImage ?? posterImage,
      bannerImage: overrides?.bannerImage ?? bannerImage,
      description: overrides?.description ?? description,
      galleryImages: overrides?.galleryImages ?? galleryImages,
      organizerName: overrides?.organizerName ?? organizerName,
      organizerInfo: overrides?.organizerInfo ?? organizerInfo,
      organizerLogo: overrides?.organizerLogo ?? organizerLogo,
      startDate: overrides?.startDate ?? startDate,
      endDate: overrides?.endDate ?? endDate,
      showtimes: overrides?.showtimes ?? showtimes,
      tickets: overrides?.tickets ?? tickets,
      isPrivate: overrides?.isPrivate ?? isPrivate,
      confirmationMessage: overrides?.confirmationMessage ?? confirmationMessage,
      enableCustomQuestions: overrides?.enableCustomQuestions ?? enableCustomQuestions,
      questionScope: overrides?.questionScope ?? questionScope,
      questions: overrides?.questions ?? questions,
      accountHolder: overrides?.accountHolder ?? accountHolder,
      accountNumber: overrides?.accountNumber ?? accountNumber,
      bankName: overrides?.bankName ?? bankName,
      bankBranch: overrides?.bankBranch ?? bankBranch,
      businessType: overrides?.businessType ?? businessType,
      taxName: overrides?.taxName ?? taxName,
      taxAddress: overrides?.taxAddress ?? taxAddress,
      taxCode: overrides?.taxCode ?? taxCode,
    });
  };

  // load ALL existing event data if eventId is available
  // fetches payout account from payment-service (/api/payments/organizer-payout-account) and event details from event-service
  useEffect(() => {
    if (!eventId) return;
    let isMounted = true;

    const loadAllEventDetails = async () => {
      try {
        const cachedUser = getCachedUserProfile();
        const currentUserId = cachedUser?.id || cachedUser?.keycloakId;

        // 1. fetch real payout account from payment-service via organizerApi
        let payoutAccount: any = null;
        let orgProfile: any = null;
        if (currentUserId) {
          try {
            const [pRes, oRes] = await Promise.all([
              organizerApi.getPayoutAccount(currentUserId).catch(() => null),
              organizerApi.getOrganizerProfile(currentUserId).catch(() => null)
            ]);
            payoutAccount = pRes;
            orgProfile = oRes;
          } catch (e) {
            console.warn("Could not fetch payout profile from payment-service:", e);
          }
        }

        // 2. fetch event details from event-service via eventApi
        const ev: any = await eventApi.getEventById(eventId);
        if (!isMounted || !ev) return;

        // step 1 fields
        const loadedTitle = ev.title || t("Sự kiện HaloTicket");
        const loadedCategory = ev.categoryName || ev.category || t("Nhạc sống");
        const loadedLocType = (ev.locationType as "offline" | "online") || "offline";
        const loadedLocName = ev.locationName || "";
        const loadedCity = ev.city || "TP. Hồ Chí Minh";
        const loadedWard = ev.ward || "Phường Bến Nghé";
        const loadedAddress = ev.address || "";
        const loadedPoster = ev.thumbnailUrl || ev.posterImage || ev.image || null;
        const loadedBanner = ev.bannerUrl || ev.posterImage || ev.image || null;
        const loadedDesc = ev.descriptionText || ev.description || "";

        let loadedGallery: string[] = [];
        if (Array.isArray(ev.galleryImages)) {
          loadedGallery = ev.galleryImages;
        } else if (typeof ev.galleryImages === "string") {
          try {
            loadedGallery = JSON.parse(ev.galleryImages);
          } catch {
            // ignore
          }
        }

        // organizer fields (with fallback from organizerApi profile or cached user)
        const loadedOrgName = ev.organizerName || ev.organizer?.name || orgProfile?.name || orgProfile?.organizerName || cachedUser?.fullName || "";
        const loadedOrgInfo = ev.organizerInfo || ev.organizer?.description || orgProfile?.description || "";
        const loadedOrgLogo = ev.organizerLogo || ev.organizer?.avatar || orgProfile?.avatar || orgProfile?.organizerLogo || null;

        // step 2: dates & tickets
        const loadedStart = ev.startTime || ev.startDate ? formatDatetimeLocal((ev.startTime || ev.startDate) as string) : "";
        const loadedEnd = ev.endTime || ev.endDate ? formatDatetimeLocal((ev.endTime || ev.endDate) as string) : "";

        if (Array.isArray(ev.showtimes) && ev.showtimes.length > 0) {
          const mappedShowtimes = ev.showtimes.map((st: any) => ({
            id: st.id || Date.now().toString(),
            name: st.name || t("Suất diễn"),
            startTime: st.startTime ? formatDatetimeLocal(st.startTime) : "",
            endTime: st.endTime ? formatDatetimeLocal(st.endTime) : "",
            saleStartTime: st.saleStartTime ? formatDatetimeLocal(st.saleStartTime) : "",
            saleEndTime: st.saleEndTime ? formatDatetimeLocal(st.saleEndTime) : ""
          }));
          setShowtimes(mappedShowtimes);
        }

        let loadedTickets: TicketItem[] = [];
        const rawT = ev.ticketCategories || ev.tickets;
        let parsedRawT: any[] = [];
        if (typeof rawT === "string") {
          try {
            const parsed = JSON.parse(rawT);
            if (Array.isArray(parsed)) parsedRawT = parsed;
          } catch {
            // ignore
          }
        } else if (Array.isArray(rawT)) {
          parsedRawT = rawT;
        }

        // filter out accidental showtime objects mistakenly serialized as tickets
        const showtimeNames = (ev.showtimes || []).map((s: any) => (s.name || "").trim().toLowerCase());
        const cleanedRawT = parsedRawT.filter((tc: any) => {
          const tcName = (tc.name || "").trim().toLowerCase();
          const looksLikeShowtime = tc.startTime && !tc.price && !tc.minPerOrder;
          const matchesShowtime = showtimeNames.length > 0 && showtimeNames.includes(tcName) && !tc.minPerOrder && !tc.description;
          return !looksLikeShowtime && !matchesShowtime;
        });

        const targetList = cleanedRawT;
        if (targetList.length > 0) {
          const uniqueRawT = targetList.filter((tc: any, index: number, self: any[]) =>
            index === self.findIndex((t: any) => (t.name || "").trim().toLowerCase() === (tc.name || "").trim().toLowerCase())
          );
          loadedTickets = uniqueRawT.map((tc: any, i: number) => ({
            id: String(tc.id || `tc_${i}_${Date.now()}`),
            name: tc.name || t("Hạng vé"),
            price: typeof tc.price === "number" ? tc.price : (parseFloat(String(tc.price).replace(/[^0-9]/g, "")) || 0),
            isFree: tc.price === 0 || tc.price === "0" || tc.isFree,
            totalQuantity: tc.totalQuantity ?? tc.quantity ?? 100,
            minPerOrder: tc.minPerOrder ?? 1,
            maxPerOrder: tc.maxPerOrder ?? 5,
            description: tc.description || "",
          }));
        }

        // fallback: fetch from ticket-service if empty
        if (loadedTickets.length === 0) {
          try {
            const fetchedTypes = await ticketApi.getTicketTypesByEventId(eventId);
            if (Array.isArray(fetchedTypes) && fetchedTypes.length > 0) {
              loadedTickets = fetchedTypes
                .filter((tt: any) => tt.status !== "HIDDEN")
                .map((tt: any, i: number) => ({
                  id: String(tt.id || `tc_${i}_${Date.now()}`),
                  name: tt.name || t("Hạng vé"),
                  price: typeof tt.price === "number" ? tt.price : (parseFloat(String(tt.price).replace(/[^0-9]/g, "")) || 0),
                  isFree: tt.isFree ?? (tt.price === 0 || tt.price === "0"),
                  totalQuantity: tt.totalQuantity ?? tt.quantity ?? 100,
                  minPerOrder: tt.minPerOrder ?? 1,
                  maxPerOrder: tt.maxPerOrder ?? 5,
                  description: tt.description || "",
                }));
            }
          } catch (e) {
            console.warn("Could not fetch ticket types from ticket-service:", e);
          }
        }

        // step 3: Settings
        const loadedIsPrivate = typeof ev.isPrivate === "boolean" ? ev.isPrivate : false;
        const loadedConfMsg = ev.confirmationMessage || "";
        const loadedEnableQuestions = typeof ev.enableCustomQuestions === "boolean" ? ev.enableCustomQuestions : false;

        // step 4: Questions
        const loadedQScope = ev.questionScope || "order";
        let loadedQuestions: CustomQuestionItem[] = [];
        const rawQ = ev.customQuestions || ev.questions;
        if (typeof rawQ === "string") {
          try {
            const parsed = JSON.parse(rawQ);
            if (Array.isArray(parsed)) loadedQuestions = parsed;
          } catch {
            // ignore
          }
        } else if (Array.isArray(rawQ)) {
          loadedQuestions = rawQ;
        }

        // step 5: Real Payment & VAT Invoice fields loaded directly from event-service & payment-service
        const loadedAccHolder =
          ev.accountHolder ||
          ev.bankAccountHolder ||
          ev.paymentInfo?.accountHolder ||
          payoutAccount?.accountHolder ||
          payoutAccount?.bankAccountHolder ||
          orgProfile?.bankAccountHolder ||
          orgProfile?.accountHolder ||
          "";

        const loadedAccNum =
          ev.accountNumber ||
          ev.bankAccountNumber ||
          ev.paymentInfo?.accountNumber ||
          payoutAccount?.accountNumber ||
          payoutAccount?.bankAccountNumber ||
          orgProfile?.bankAccountNumber ||
          orgProfile?.accountNumber ||
          "";

        const loadedBankName =
          ev.bankName ||
          ev.paymentInfo?.bankName ||
          payoutAccount?.bankName ||
          orgProfile?.bankName ||
          "Vietcombank";

        const loadedBankBranch =
          ev.bankBranch ||
          ev.paymentInfo?.bankBranch ||
          payoutAccount?.bankBranch ||
          orgProfile?.bankBranch ||
          "";

        const loadedBizType: "individual" | "company" =
          (ev.businessType || ev.paymentInfo?.businessType || payoutAccount?.businessType || orgProfile?.businessType) === "company"
            ? "company"
            : "individual";

        const loadedTaxName =
          ev.taxName ||
          ev.paymentInfo?.taxName ||
          payoutAccount?.taxName ||
          orgProfile?.taxName ||
          "";

        const loadedTaxAddress =
          ev.taxAddress ||
          ev.paymentInfo?.taxAddress ||
          payoutAccount?.taxAddress ||
          orgProfile?.businessAddress ||
          orgProfile?.taxAddress ||
          "";

        const loadedTaxCode =
          ev.taxCode ||
          ev.paymentInfo?.taxCode ||
          payoutAccount?.taxCode ||
          orgProfile?.taxCode ||
          "";

        const loadedStatus = (ev.status || ev.approvalStatus || ev.eventApprovalStatus || "PENDING").toUpperCase();
        setEventStatus(loadedStatus);

        const loadedReason = ev.rejectionReason || "";
        const loadedNotesRaw = ev.rejectionNotes || "";
        let loadedRejectedFields: string[] = [];
        let noteTextParsed = loadedNotesRaw;

        if (loadedNotesRaw && loadedNotesRaw.trim().startsWith("{")) {
          try {
            const parsed = JSON.parse(loadedNotesRaw);
            if (Array.isArray(parsed.flaggedFields)) {
              loadedRejectedFields = parsed.flaggedFields;
            }
            if (parsed.noteText) {
              noteTextParsed = parsed.noteText;
            }
          } catch {
            // ignore
          }
        }

        setRejectionReasonText(loadedReason);
        setRejectionNotesText(noteTextParsed);
        setRejectedFields(loadedRejectedFields);

        // update React Form States with authentic data from backend services
        setTitle(loadedTitle);
        setCategory(loadedCategory);
        setLocationType(loadedLocType);
        setLocationName(loadedLocName);
        setCity(loadedCity);
        setWard(loadedWard);
        setAddress(loadedAddress);
        setPosterImage(loadedPoster);
        setBannerImage(loadedBanner);
        setDescription(loadedDesc);
        setGalleryImages(loadedGallery);
        setOrganizerName(loadedOrgName);
        setOrganizerInfo(loadedOrgInfo);
        setOrganizerLogo(loadedOrgLogo);

        setStartDate(loadedStart);
        setEndDate(loadedEnd);
        setTickets(loadedTickets);

        setIsPrivate(loadedIsPrivate);
        setConfirmationMessage(loadedConfMsg);
        setEnableCustomQuestions(loadedEnableQuestions);

        setQuestionScope(loadedQScope);
        setQuestions(loadedQuestions);

        setAccountHolder(loadedAccHolder);
        setAccountNumber(loadedAccNum);
        setBankName(loadedBankName);
        setBankBranch(loadedBankBranch);
        setBusinessType(loadedBizType);
        setTaxName(loadedTaxName);
        setTaxAddress(loadedTaxAddress);
        setTaxCode(loadedTaxCode);

        // build initial snapshot
        const snap = JSON.stringify({
          title: loadedTitle,
          category: loadedCategory,
          locationType: loadedLocType,
          locationName: loadedLocName,
          city: loadedCity,
          ward: loadedWard,
          address: loadedAddress,
          posterImage: loadedPoster,
          bannerImage: loadedBanner,
          description: loadedDesc,
          galleryImages: loadedGallery,
          organizerName: loadedOrgName,
          organizerInfo: loadedOrgInfo,
          organizerLogo: loadedOrgLogo,
          startDate: loadedStart,
          endDate: loadedEnd,
          tickets: loadedTickets,
          isPrivate: loadedIsPrivate,
          confirmationMessage: loadedConfMsg,
          enableCustomQuestions: loadedEnableQuestions,
          questionScope: loadedQScope,
          questions: loadedQuestions,
          accountHolder: loadedAccHolder,
          accountNumber: loadedAccNum,
          bankName: loadedBankName,
          bankBranch: loadedBankBranch,
          businessType: loadedBizType,
          taxName: loadedTaxName,
          taxAddress: loadedTaxAddress,
          taxCode: loadedTaxCode,
        });
        setInitialSnapshot(snap);
      } catch (err) {
        console.error("Failed to load event details for edit:", err);
      }
    };

    loadAllEventDetails();
    return () => {
      isMounted = false;
    };
  }, [eventId]);

  // dynamic step titles based on enableCustomQuestions
  const stepTitles = enableCustomQuestions
    ? [
        t("1. Thông tin sự kiện"),
        t("2. Thời gian & Loại vé"),
        t("3. Cài đặt"),
        t("4. Thông tin đăng ký"),
        t("5. Thông tin thanh toán"),
      ]
    : [
        t("1. Thông tin sự kiện"),
        t("2. Thời gian & Loại vé"),
        t("3. Cài đặt"),
        t("4. Thông tin thanh toán"),
      ];

  const handleStep1Next = () => {
    const errs: Step1Errors = {};
    if (!title.trim()) errs.title = t("Vui lòng nhập tên sự kiện");
    if (!address.trim() && locationType === "offline") errs.address = t("Vui lòng nhập địa chỉ chi tiết");
    setStep1Errors(errs);
    if (Object.keys(errs).length > 0) return;
    setCurrentStep(2);
  };

  const handleStep2Next = () => {
    const errs: Step2Errors = {};
    if (!startDate) errs.startDate = t("Vui lòng chọn thời gian bắt đầu");
    if (!endDate) errs.endDate = t("Vui lòng chọn thời gian kết thúc");
    if (tickets.length === 0) errs.tickets = t("Vui lòng tạo ít nhất 1 loại vé");
    setStep2Errors(errs);
    if (Object.keys(errs).length > 0) return;
    setCurrentStep(3);
  };

  const handleOpenEditTicketModal = (ticket: TicketItem) => {
    setEditingTicket(ticket);
    setShowAddTicketModal(true);
  };

  const handleDeleteTicket = (ticketId: string) => {
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
  };

  const handleSaveTicket = (ticketData: TicketItem) => {
    if (editingTicket) {
      setTickets((prev) => prev.map((t) => (t.id === editingTicket.id ? ticketData : t)));
    } else {
      setTickets((prev) => [...prev, ticketData]);
    }
    setShowAddTicketModal(false);
    setEditingTicket(null);
  };

  const handleAddQuestion = () => {
    const newQ: CustomQuestionItem = {
      id: `q-${Date.now()}`,
      title: t("Câu hỏi khảo sát mới"),
      description: "",
      type: "text",
      isRequired: false,
    };
    setQuestions((prev) => [...prev, newQ]);
  };

  const handleDeleteQuestion = (qId: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== qId));
  };

  // update event info handler (only saves & notifies admin if data actually changed!)
  const handleUpdateEvent = async () => {
    const currentSnap = getFormSnapshotString();

    if (initialSnapshot && currentSnap === initialSnapshot) {
      showToast(t("ℹKhông có thông tin nào thay đổi. Hệ thống không lưu dữ liệu."), "info");
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedPoster = await ensureS3Url(posterImage, "events/posters");
      const uploadedBanner = await ensureS3Url(bannerImage, "events/banners");
      const uploadedLogo = await ensureS3Url(organizerLogo, "organizers/logos");

      const payload: Record<string, unknown> = {
        eventId,
        title,
        categoryName: category,
        category,
        locationType,
        locationName,
        city,
        ward,
        address,
        thumbnailUrl: uploadedPoster,
        posterImage: uploadedPoster,
        bannerUrl: uploadedBanner,
        description,
        galleryImages,
        organizerName,
        organizerInfo,
        organizerLogo: uploadedLogo,
        startTime: startDate ? (startDate.length === 16 ? startDate + ":00" : startDate) : undefined,
        endTime: endDate ? (endDate.length === 16 ? endDate + ":00" : endDate) : undefined,
        showtimes: showtimes.length > 0 ? showtimes.map(st => ({
          ...st,
          tickets: tickets.length > 0 ? tickets : (st as any).tickets
        })) : undefined,
        ticketCategories: tickets,
        tickets,
        isPrivate,
        confirmationMessage,
        enableCustomQuestions,
        questionScope,
        customQuestions: questions,
        questions,
        accountHolder,
        accountNumber,
        bankName,
        bankBranch,
        businessType,
        taxName,
        taxAddress,
        taxCode,
        status: eventStatus,
      };

      // 1. update event details in event-service
      const eventApiWithUpdate = eventApi as unknown as { updateEvent?: (id: string, p: unknown) => Promise<unknown> };
      if (eventId && typeof eventApiWithUpdate.updateEvent === "function") {
        await eventApiWithUpdate.updateEvent(eventId, payload);
      } else {
        await eventApi.createEventApprovalRequest(payload);
      }

      // 2. save/sync payout account in payment-service directly
      const cachedUser = getCachedUserProfile();
      const currentUserId = cachedUser?.id || cachedUser?.keycloakId;
      if (accountHolder && accountNumber) {
        await organizerApi.savePayoutAccount({
          organizerUserId: currentUserId,
          accountHolder,
          accountNumber,
          bankName,
          bankBranch,
          businessType,
          taxName,
          taxCode,
          taxAddress,
        });
      }

      // 3. update initial snapshot to match current state
      setInitialSnapshot(currentSnap);

      // 4. show success toast for organizer
      showToast(t("Cập nhật thông tin sự kiện thành công! Đã gửi thông báo đến Admin."), "success");
    } catch (err) {
      console.error("Failed to update event details:", err);
      showToast(t("Cập nhật thông tin thất bại, vui lòng thử lại."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLastStep = currentStep >= totalSteps;
  const isQuestionStep = enableCustomQuestions && currentStep === 4;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Success / Info / Error Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-20 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl font-bold text-xs md:text-sm flex items-center gap-3 border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            toastMsg.type === "success"
              ? "bg-emerald-900/90 text-emerald-100 border-emerald-700 shadow-emerald-950/40"
              : toastMsg.type === "info"
              ? "bg-blue-900/90 text-blue-100 border-blue-700 shadow-blue-950/40"
              : "bg-rose-900/90 text-rose-100 border-rose-700 shadow-rose-950/40"
          }`}
        >
          {toastMsg.type === "success" && <FiCheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toastMsg.type === "info" && <FiInfo className="w-5 h-5 text-blue-400 shrink-0" />}
          {toastMsg.type === "error" && <FiAlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top Header & Status Control Bar */}
      <div className="app-bg-card border app-border rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base md:text-lg font-black app-text-main">{title}</h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-mono border ${
                eventStatus === "PENDING"
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                  : eventStatus === "APPROVED"
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : eventStatus === "UPDATE_PENDING"
                  ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                  : eventStatus === "REJECTED"
                  ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                  : "bg-slate-500/10 text-slate-400 border-slate-500/20"
              }`}
            >
              {eventStatus === "PENDING"
                ? t("Chờ duyệt (PENDING)")
                : eventStatus === "UPDATE_PENDING"
                ? t("Chờ duyệt cập nhật (UPDATE PENDING)")
                : eventStatus === "APPROVED"
                ? t("Đã duyệt (APPROVED)")
                : eventStatus === "REJECTED"
                ? t("Bị từ chối (REJECTED)")
                : eventStatus}
            </span>
          </div>
          <p className="text-xs app-text-muted">
            {t("Chỉnh sửa thông tin chi tiết sự kiện và đồng bộ dữ liệu với hệ thống quản trị")}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {/* Always available Update Button */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleUpdateEvent}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${isSubmitting ? "animate-spin" : ""}`} />
            <span>{t("Cập nhật thông tin")}</span>
          </button>
        </div>
      </div>

      {/* Prominent Rejection Alert Callout Banner if Event Status is REJECTED */}
      {eventStatus === "REJECTED" && (
        <div className="p-5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/40 text-rose-600 dark:text-rose-400 space-y-2.5 animate-in fade-in">
          <div className="flex items-center gap-2 font-extrabold text-sm md:text-base">
            <FiAlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{t("Sự kiện đã bị từ chối phê duyệt!")}</span>
          </div>
          {rejectionReasonText && (
            <p className="text-xs font-semibold">
              <strong>{t("Lý do chính từ chối")}:</strong> {rejectionReasonText}
            </p>
          )}
          {rejectionNotesText && (
            <p className="text-xs">
              <strong>{t("Ghi chú hướng dẫn từ Admin")}:</strong> {rejectionNotesText}
            </p>
          )}
          {rejectedFields.length > 0 && (
            <div className="pt-2 border-t border-rose-500/20 text-xs font-bold flex items-center gap-2 flex-wrap">
              <span>{t("Các mục bị Admin đánh dấu lỗi (cần chỉnh sửa)")}:</span>
              {rejectedFields.map((f) => (
                <span key={f} className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] uppercase font-mono shadow-xs">
                  {f === "posterImage" ? t("Poster & Banner") : f === "title" ? t("Tên & Mô tả") : f === "dates" ? t("Thời gian") : f === "tickets" ? t("Danh sách Hạng vé") : f === "location" ? t("Địa điểm") : t("Thanh toán")}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stepper Navigation Bar */}
      <CreateEventStepper
        stepTitles={stepTitles}
        currentStep={currentStep}
        onStepClick={(stepNum) => setCurrentStep(stepNum)}
      />

      {/* Step 1: Event info (Includes Organizer Name, Info, Logo) */}
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
          isOrganizerPreFilled={false}
          onSaveDraft={handleUpdateEvent}
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
          showtimes={showtimes}
          setShowtimes={setShowtimes}
          errors={step2Errors}
          onOpenAddTicketModal={() => {
            setEditingTicket(null);
            setShowAddTicketModal(true);
          }}
          onEditTicket={handleOpenEditTicketModal}
          onDeleteTicket={handleDeleteTicket}
          onSaveDraft={handleUpdateEvent}
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
      {isQuestionStep && (
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

      {/* Step 5 (or Step 4 if questions disabled): Payment Info & VAT Invoice */}
      {isLastStep && (
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
          onSaveDraft={handleUpdateEvent}
          onBack={() => setCurrentStep(enableCustomQuestions ? 4 : 3)}
          onSubmit={handleUpdateEvent}
        />
      )}

      {/* Add or Edit Ticket Modal */}
      {showAddTicketModal && (
        <AddTicketModal
          initialTicket={editingTicket}
          onClose={() => {
            setShowAddTicketModal(false);
            setEditingTicket(null);
          }}
          onSave={handleSaveTicket}
        />
      )}

      {/* Success submitted modal */}
      {isSubmitted && <SuccessSubmittedModal title={title} />}
    </div>
  );
};

export default EventEditInfo;
