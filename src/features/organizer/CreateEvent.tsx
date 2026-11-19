import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useRef } from "react";
import { hasErrors, validateTimeAndTickets } from "./eventFormValidation";
import type { TicketItem, ShowtimeItem, CustomQuestionItem, Step1Errors, Step2Errors, Step5Errors } from "@/types/organizer";
import CreateEventStepper from "./components/create-event/CreateEventStepper";
import Step1EventInfo from "./components/create-event/Step1EventInfo";
import Step2TicketsAndTime from "./components/create-event/Step2TicketsAndTime";
import Step3Settings from "./components/create-event/Step3Settings";
import Step4CustomQuestions from "./components/create-event/Step4CustomQuestions";
import Step5PaymentInfo from "./components/create-event/Step5PaymentInfo";
import NoticeModal from "./components/create-event/NoticeModal";
import AddTicketModal from "./components/create-event/AddTicketModal";
import SuccessSubmittedModal from "./components/create-event/SuccessSubmittedModal";
import EkycRequiredModal from "./components/create-event/EkycRequiredModal";
import { eventApi, type EventApiData } from "@/services/eventApi";
import { organizerApi } from "@/services/organizerApi";
import { mediaApi } from "@/services/mediaApi";
import { getCachedUserProfile } from "@/services/userApi";
import { ekycApi } from "@/services/ekycApi";
import { formatDatetimeLocal } from "@/utils/formatters";
import { Link, useNavigate } from "react-router-dom";
import { normalizeTicketsForSave } from "@/utils/ticketQuantities";
import { eventSaveFailureMessage, parseEventSaveFailure } from "@/utils/eventSaveErrors";
import { PATHS } from "@/routes/paths";

/** Một suất diễn khi đọc lại từ bản nháp đã lưu (trường nào cũng có thể thiếu). */
interface DraftShowtime {
  id?: string;
  name?: string;
  startTime?: string;
  endTime?: string;
  saleStartTime?: string;
  saleEndTime?: string;
}

/** Các trường tài khoản nhận tiền đọc lại từ hồ sơ ban tổ chức hoặc bộ nhớ đệm cục bộ. */
interface PayoutAccountInfo {
  accountHolder?: string;
  accountNumber?: string;
  bankName?: string;
  bankBranch?: string;
  businessType?: "individual" | "company";
  taxName?: string;
  taxAddress?: string;
  taxCode?: string;
}

/** Dữ liệu sự kiện nháp hoặc đang chờ duyệt lấy từ API, gồm cả các trường mở rộng của form tạo sự kiện (một số trường có thể là chuỗi JSON). */
interface DraftEventItem extends Partial<EventApiData> {
  id: string;
  category?: string;
  locationType?: "offline" | "online";
  city?: string;
  ward?: string;
  posterImage?: string;
  descriptionText?: string;
  galleryImages?: string[] | string;
  startDate?: string;
  endDate?: string;
  tickets?: TicketItem[] | string;
  isPrivate?: boolean;
  confirmationMessage?: string;
  enableCustomQuestions?: boolean;
  questionScope?: "order" | "ticket";
  customQuestions?: CustomQuestionItem[] | string;
  questions?: CustomQuestionItem[] | string;
  organizerName?: string;
  organizerInfo?: string;
  organizerLogo?: string;
  organizer?: { name?: string; description?: string; avatar?: string; id?: string };
  accountHolder?: string;
  accountNumber?: string;
  bankName?: string;
  bankBranch?: string;
  businessType?: "individual" | "company";
  taxName?: string;
  taxAddress?: string;
  taxCode?: string;
  eventApprovalStatus?: string;
}

/**
 * Đảm bảo ảnh có địa chỉ http(s) trên S3: ảnh {@code blob:} hoặc {@code data:image/} sẽ được tải lên qua {@code mediaApi}.
 * Nếu tải lên lỗi thì ghi log và trả về giá trị gốc.
 * @param urlOrData - đường dẫn ảnh, blob URL hoặc dữ liệu base64
 * @param folder - thư mục đích trên S3
 * @returns địa chỉ ảnh sau xử lý, hoặc {@code null} khi không có ảnh
 */
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

/**
 * Trang tạo sự kiện của ban tổ chức: form nhiều bước (thông tin, thời gian và vé, cài đặt, câu hỏi tùy chọn, thanh toán).
 * Kiểm tra eKYC khi vào trang, khôi phục bản nháp, tự động lưu nháp sau mỗi thay đổi và gửi yêu cầu duyệt ở bước cuối.
 */
export const CreateEvent: React.FC = () => {
  const { t: translate } = useTranslation();
  // cuộn lên đầu trang khi vào màn hình
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  const navigate = useNavigate();

  // trạng thái các hộp thoại
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [showEkycModal, setShowEkycModal] = useState(false);
  const [showAddTicketModal, setShowAddTicketModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedEventIdForSync, setSavedEventIdForSync] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // kiểm tra điều kiện eKYC khi vào trang
  useEffect(() => {
    let active = true;
    ekycApi.getOrganizerEligibility()
      .then((res) => {
        if (active) {
          if (!res.eligible) {
            setShowEkycModal(true);
          } else {
            setShowNoticeModal(true);
          }
        }
      })
      .catch(() => {
        // dịch vụ không phản hồi, lỗi hoặc bị từ chối 403
        if (active) {
          setShowEkycModal(true);
        }
      });
    return () => { active = false; };
  }, []);

  // bước hiện tại của thanh các bước (1 đến 5)
  const [currentStep, setCurrentStep] = useState(1);

  // LỖI FORM VÀ TRẠNG THÁI NHÁP
  const [step1Errors, setStep1Errors] = useState<Step1Errors>({});
  const [step2Errors, setStep2Errors] = useState<Step2Errors>({});
  const [step5Errors, setStep5Errors] = useState<Step5Errors>({});
  const [isOrganizerPreFilled, setIsOrganizerPreFilled] = useState(false);
  const [draftSavedToast, setDraftSavedToast] = useState<string | null>(null);

  // DỮ LIỆU FORM
  // bước 1: thông tin sự kiện
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

  // bước 2: thời gian và vé
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tickets, setTickets] = useState<TicketItem[]>([]);
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
          
          let dailyDurationMs: number;
          if (startHour <= endHour) {
             dailyDurationMs = (end.getTime() % 86400000) - (start.getTime() % 86400000);
             if (dailyDurationMs < 0) dailyDurationMs += 86400000;
          } else {
             // suất diễn qua đêm
             dailyDurationMs = ((24 - startHour) + endHour) * 3600000;
          }
          
          // nếu thời lượng tính ra bằng 0 thì lấy tối thiểu 1 giờ
          if (dailyDurationMs === 0) dailyDurationMs = 3600000;

          const currentDate = new Date(start);
          currentDate.setHours(0, 0, 0, 0);
          
          const tempEnd = new Date(end);
          if (startHour > endHour) {
            // nếu qua đêm, suất cuối bắt đầu từ ngày trước ngày của tempEnd
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
              name: `${translate("Suất")} ${dayCount}: ${translate("Ngày")} ${displayStr}`,
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
            name: translate("Suất 1"),
            startTime: startStr,
            endTime: endStr,
            saleStartTime: "",
            saleEndTime: ""
          });
        }
        
        // danh sách suất diễn được suy ra từ hai mốc ngày và giữ lại thời gian mở bán mà ban tổ chức đã nhập,
        // nên được đặt tại đây, trong effect theo dõi các mốc ngày
        // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // bước 3: cài đặt
  const [isPrivate, setIsPrivate] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [enableCustomQuestions, setEnableCustomQuestions] = useState(false);

  // bước 4: câu hỏi (chỉ khi enableCustomQuestions = true)
  const [questionScope, setQuestionScope] = useState<"order" | "ticket">("order");
  const [questions, setQuestions] = useState<CustomQuestionItem[]>([]);

  // bước 5: thông tin thanh toán và hóa đơn VAT
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("Vietcombank");
  const [bankBranch, setBankBranch] = useState("");
  const [businessType, setBusinessType] = useState<"individual" | "company">("individual");
  const [taxName, setTaxName] = useState("");
  const [taxAddress, setTaxAddress] = useState("");
  const [taxCode, setTaxCode] = useState("");

  const [, setCurrentEventId] = useState<string | null>(null);
  const currentEventIdRef = useRef<string | null>(null);
  // khóa chống hai lần lưu chạy chồng nhau (khi chưa có id sự kiện, hai lần tạo cùng lúc sẽ ra hai bản nháp)
  const saveInFlightRef = useRef<boolean>(false);
  const resaveAfterFlightRef = useRef<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [autoSaveTick, setAutoSaveTick] = useState<number>(0);
  const isInitialLoadingRef = useRef<boolean>(true);

  /** Cập nhật id sự kiện hiện tại: ghi vào ref (để các hàm bất đồng bộ đọc được giá trị mới nhất) và vào state. */
  const updateCurrentEventId = (id: string | null) => {
    currentEventIdRef.current = id;
    setCurrentEventId(id);
  };

  const [eventStatus, setEventStatus] = useState<"DRAFT" | "PENDING">("DRAFT");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saving" | "saved" | "error" | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // khôi phục sự kiện nháp hoặc đang chờ duyệt
  useEffect(() => {
    let isMounted = true;

    /** Nạp hồ sơ ban tổ chức để điền sẵn, rồi nạp sự kiện nháp (theo tham số {@code id} trên URL hoặc bản nháp DRAFT của người dùng) và đổ vào các state của form. */
    const loadOrganizerAndDbDraft = async () => {
      isInitialLoadingRef.current = true;
      try {
        const cachedUser = getCachedUserProfile();
        const currentUserId = cachedUser?.id || cachedUser?.keycloakId;

        // lấy hồ sơ ban tổ chức
        if (currentUserId) {
          try {
            const orgProfile = await organizerApi.getOrganizerProfile(currentUserId);
            if (isMounted && orgProfile && orgProfile.name) {
              setOrganizerName(orgProfile.name);
              if (orgProfile.description) setOrganizerInfo(orgProfile.description);
              if (orgProfile.avatar) setOrganizerLogo(orgProfile.avatar);
              setIsOrganizerPreFilled(true);
            }
          } catch {
            // dự kiến lỗi 403 nếu người dùng chưa xác thực eKYC
            console.log("Organizer profile not found or forbidden, falling back to empty.");
          }
        }

        // lấy id sự kiện từ URL hoặc tìm bản nháp trong DB
        const urlParams = new URLSearchParams(window.location.search);
        const draftIdParam = urlParams.get("id");
        if (draftIdParam) {
          updateCurrentEventId(draftIdParam);
        }

        let draftEventData: DraftEventItem | null = null;
        if (draftIdParam) {
          draftEventData = (await eventApi.getEventById(draftIdParam)) as unknown as DraftEventItem;
        } else {
          // tìm sự kiện đang ở trạng thái DRAFT
          // danh sách công khai không còn có bản nháp; bản nháp của mình nằm trong danh sách "sự kiện của tôi"
          const allEvents = await eventApi.getMyEvents();
          if (Array.isArray(allEvents)) {
            draftEventData = (allEvents.find(
              (ev: EventApiData & { eventApprovalStatus?: string; organizer?: { id?: string } }) =>
                (ev.eventApprovalStatus === "DRAFT" || ev.eventStatus === "DRAFT") &&
                (!ev.organizer?.id || ev.organizer?.id === currentUserId)
            ) as unknown as DraftEventItem) || null;
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
          const cat = draftEventData.categoryName || draftEventData.category;
          if (cat) setCategory(cat);
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
            try {
              galleryList = JSON.parse(draftEventData.galleryImages);
            } catch {
              // bỏ qua lỗi phân tích JSON
            }
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
          if (start) setStartDate(formatDatetimeLocal(start as string));
          const end = draftEventData.endTime || draftEventData.endDate;
          if (end) setEndDate(formatDatetimeLocal(end as string));

          if (draftEventData.showtimes) {
            let parsedShowtimes = draftEventData.showtimes;
            if (typeof parsedShowtimes === "string") {
              try { parsedShowtimes = JSON.parse(parsedShowtimes); } catch { /* giữ nguyên giá trị gốc; phía dưới sẽ bỏ qua nếu không phải mảng */ }
            }
            if (Array.isArray(parsedShowtimes) && parsedShowtimes.length > 0) {
              const mappedShowtimes = parsedShowtimes.map((st: DraftShowtime) => ({
                id: st.id || String(Date.now() + Math.random()),
                name: st.name || "",
                startTime: formatDatetimeLocal(st.startTime) || "",
                endTime: formatDatetimeLocal(st.endTime) || "",
                saleStartTime: st.saleStartTime ? formatDatetimeLocal(st.saleStartTime) : "",
                saleEndTime: st.saleEndTime ? formatDatetimeLocal(st.saleEndTime) : ""
              }));
              setShowtimes(mappedShowtimes);
            }
          }

          if (draftEventData.tickets) {
            let parsedTickets = draftEventData.tickets;
            if (typeof parsedTickets === "string") {
              try {
                parsedTickets = JSON.parse(parsedTickets);
              } catch {
                // bỏ qua lỗi phân tích JSON
              }
            }
            if (Array.isArray(parsedTickets)) {
              type RawTicket = Partial<TicketItem>;
              const mappedTickets: TicketItem[] = [];
              const seenNames = new Set<string>();
              (parsedTickets as RawTicket[]).forEach((t, idx: number) => {
                const name = t.name || "";
                if (!seenNames.has(name)) {
                  seenNames.add(name);
                  mappedTickets.push({
                    id: String(t.id || `ticket_${idx}_${Date.now()}`),
                    name: name,
                    price: t.price ?? 0,
                    isFree: t.isFree ?? (t.price === 0),
                    totalQuantity: t.totalQuantity ?? 100,
                    minPerOrder: t.minPerOrder ?? 1,
                    maxPerOrder: t.maxPerOrder ?? 5,
                    status: t.status || "ACTIVE",
                    showtimeId: t.showtimeId || undefined,
                    description: t.description || "",
                    image: t.image || null
                  });
                }
              });
              setTickets(mappedTickets);
            }
          }

          if (typeof draftEventData.isPrivate === "boolean") setIsPrivate(draftEventData.isPrivate);
          if (draftEventData.confirmationMessage) setConfirmationMessage(draftEventData.confirmationMessage as string);
          if (typeof draftEventData.enableCustomQuestions === "boolean") setEnableCustomQuestions(draftEventData.enableCustomQuestions);
          if (draftEventData.questionScope) setQuestionScope(draftEventData.questionScope as "order" | "ticket");

          const rawQList = draftEventData.customQuestions || draftEventData.questions;
          if (rawQList) {
            let parsedQList = rawQList;
            if (typeof parsedQList === "string") {
              try {
                parsedQList = JSON.parse(parsedQList);
              } catch {
                // bỏ qua lỗi phân tích JSON
              }
            }
            if (Array.isArray(parsedQList)) setQuestions(parsedQList as CustomQuestionItem[]);
          }

          const orgName = draftEventData.organizerName || draftEventData.organizer?.name;
          if (orgName) setOrganizerName(orgName);
          const orgInfo = draftEventData.organizerInfo || draftEventData.organizer?.description;
          if (orgInfo) setOrganizerInfo(orgInfo);
          const orgLogo = draftEventData.organizerLogo || draftEventData.organizer?.avatar;
          if (orgLogo) setOrganizerLogo(orgLogo);

          if (currentUserId) {
            try {
              const payoutInfo = await organizerApi.getPayoutAccount(currentUserId);
              if (payoutInfo) {
                const info = payoutInfo as PayoutAccountInfo;
                if (info.accountHolder) setAccountHolder(info.accountHolder);
                if (info.accountNumber) setAccountNumber(info.accountNumber);
                if (info.bankName) setBankName(info.bankName);
                if (info.bankBranch) setBankBranch(info.bankBranch);
                if (info.businessType) setBusinessType(info.businessType);
                if (info.taxName) setTaxName(info.taxName);
                if (info.taxAddress) setTaxAddress(info.taxAddress);
                if (info.taxCode) setTaxCode(info.taxCode);
              }
            } catch (err) {
              console.error("Failed to load payout account info for step 5", err);
            }
          } else {
            if (draftEventData.accountHolder) setAccountHolder(draftEventData.accountHolder);
            if (draftEventData.accountNumber) setAccountNumber(draftEventData.accountNumber);
            if (draftEventData.bankName) setBankName(draftEventData.bankName);
            if (draftEventData.bankBranch) setBankBranch(draftEventData.bankBranch);
            if (draftEventData.businessType) setBusinessType(draftEventData.businessType);
            if (draftEventData.taxName) setTaxName(draftEventData.taxName);
            if (draftEventData.taxAddress) setTaxAddress(draftEventData.taxAddress);
            if (draftEventData.taxCode) setTaxCode(draftEventData.taxCode);
          }

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

  // xóa nháp và đặt lại form
  /** Xóa trạng thái nháp trong form (không xóa bản ghi trên server), quay về bước 1 và hiện thông báo trong 3 giây. */
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
    setDraftSavedToast(translate("Đã xóa nháp và làm mới trang tạo sự kiện."));
    setTimeout(() => setDraftSavedToast(null), 3000);
  };

  /**
   * Tải ảnh poster, banner, logo và thư viện ảnh lên S3 song song, đồng thời cập nhật state sang địa chỉ mới.
   * @returns các địa chỉ ảnh đã tải lên; thư viện đã loại bỏ ảnh lỗi
   */
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

  // cảnh báo khi đóng tab lúc dữ liệu chưa lưu được (đang lưu hoặc lưu lỗi)
  useEffect(() => {
    if (autoSaveStatus !== "saving" && autoSaveStatus !== "error") return;
    /** Yêu cầu trình duyệt xác nhận trước khi rời trang. */
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [autoSaveStatus]);

  // tự động lưu theo thời gian thực
  useEffect(() => {
    if (isSubmitted || isSubmitting || isInitialLoadingRef.current) return;

    const hasContent = Boolean(
      title.trim() || locationName.trim() || description.trim() || posterImage || bannerImage || startDate || tickets.length > 0
    );

    if (!hasContent) return;

    const timer = setTimeout(async () => {
      // đang có một lần lưu chạy thì đợi nó xong rồi lưu lại bản mới nhất
      if (saveInFlightRef.current) {
        resaveAfterFlightRef.current = true;
        return;
      }
      saveInFlightRef.current = true;
      setAutoSaveStatus("saving");
      try {
        const cachedUser = getCachedUserProfile();
        const currentUserId = cachedUser?.id || cachedUser?.keycloakId || undefined;

        const activeEventId = currentEventIdRef.current;

        const showtimesPayload = showtimes.map(st => ({
          ...st,
          tickets: tickets.length > 0 ? normalizeTicketsForSave(tickets) : st.tickets
        }));

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
          startTime: startDate ? (startDate.length === 16 ? startDate + ":00" : startDate) : undefined,
          endTime: endDate ? (endDate.length === 16 ? endDate + ":00" : endDate) : undefined,
          tickets: normalizeTicketsForSave(tickets),
          showtimes: showtimesPayload.length > 0 ? showtimesPayload : undefined,
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

        const res = (await eventApi.createEventApprovalRequest(draftPayload)) as Record<string, unknown> | null;
        if (res && typeof res.id === "string") {
          updateCurrentEventId(res.id);
        }

        const timeStr = new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        });
        setAutoSaveStatus("saved");
        setLastSavedAt(timeStr);
        setSaveError(null);
      } catch (err) {
        console.error("Failed to auto-save draft to database", err);
        // không để trạng thái kẹt ở "đang lưu": báo lỗi và cho thử lại
        setAutoSaveStatus("error");
        setSaveError(translate("Không lưu được bản nháp. Dữ liệu vừa nhập có thể chưa được lưu."));
      } finally {
        saveInFlightRef.current = false;
        if (resaveAfterFlightRef.current) {
          resaveAfterFlightRef.current = false;
          setAutoSaveTick((tick) => tick + 1);
        }
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
    galleryImages,
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
    isSubmitting,
    autoSaveTick
  ]);

  // lưu nháp thủ công
  /** Lưu nháp ngay theo yêu cầu của người dùng: tải ảnh lên, gửi dữ liệu form với trạng thái DRAFT (hoặc PENDING nếu đang chờ duyệt) và hiện thông báo. */
  const handleSaveDraft = async () => {
    if (saveInFlightRef.current) {
      setSaveError(translate("Đang lưu, vui lòng đợi trong giây lát."));
      return;
    }
    saveInFlightRef.current = true;
    setAutoSaveStatus("saving");
    try {
      const cachedUser = getCachedUserProfile();
      const currentUserId = cachedUser?.id || cachedUser?.keycloakId || undefined;

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
        tickets: normalizeTicketsForSave(tickets),
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

      const res = (await eventApi.createEventApprovalRequest(draftPayload)) as Record<string, unknown> | null;
      if (res && typeof res.id === "string") {
        updateCurrentEventId(res.id);
      }

      const timeStr = new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      setAutoSaveStatus("saved");
      setLastSavedAt(timeStr);
      setSaveError(null);
      setDraftSavedToast(
        eventStatus === "PENDING"
          ? translate("Đã lưu cập nhật sự kiện chờ duyệt (PENDING) thành công!")
          : translate("Đã lưu bản nháp sự kiện (DRAFT) vào Database thành công!")
      );
      setTimeout(() => setDraftSavedToast(null), 4000);
    } catch (err) {
      console.error("Failed to manually save draft to DB", err);
      setAutoSaveStatus("error");
      setSaveError(translate("Không lưu được bản nháp. Vui lòng kiểm tra kết nối và thử lại."));
    } finally {
      saveInFlightRef.current = false;
    }
  };



  // tiêu đề các bước thay đổi theo việc có bật câu hỏi tùy chỉnh hay không
  const stepTitles = enableCustomQuestions
    ? [
      translate("1. Thông tin sự kiện"),
      translate("2. Thời gian & Loại vé"),
      translate("3. Cài đặt"),
      translate("4. Thông tin đăng ký"),
      translate("5. Thông tin thanh toán")
    ]
    : [
      translate("1. Thông tin sự kiện"),
      translate("2. Thời gian & Loại vé"),
      translate("3. Cài đặt"),
      translate("4. Thông tin thanh toán")
    ];

  // kiểm tra dữ liệu từng bước
  /** Kiểm tra bước 1 (tên sự kiện, địa điểm, mô tả, ban tổ chức); hợp lệ thì chuyển sang bước 2. */
  const handleStep1Next = () => {
    const errs: Step1Errors = {};
    if (!title.trim()) errs.title = translate("Vui lòng nhập tên sự kiện!");
    if (locationType === "offline") {
      if (!locationName.trim()) errs.locationName = translate("Vui lòng nhập tên địa điểm tổ chức!");
      if (!address.trim()) errs.address = translate("Vui lòng nhập địa điểm (số nhà, tên đường)!");
    }
    if (!description.trim()) errs.description = translate("Vui lòng nhập mô tả chi tiết sự kiện!");
    if (!organizerName.trim()) errs.organizerName = translate("Vui lòng nhập tên ban tổ chức!");

    setStep1Errors(errs);
    if (Object.keys(errs).length === 0) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /** Kiểm tra bước 2 (thời gian bắt đầu và kết thúc, ít nhất một hạng vé); hợp lệ thì chuyển sang bước 3. */
  const handleStep2Next = () => {
    // thời gian, vé (giá, số lượng, giới hạn mua) và thời gian bán vé của từng suất, dùng chung quy tắc với bước gửi duyệt
    const errs: Step2Errors = validateTimeAndTickets({ startDate, endDate, showtimes, tickets, requireFutureStart: true }, translate);

    setStep2Errors(errs);
    if (!hasErrors(errs)) {
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const [editingTicket, setEditingTicket] = useState<TicketItem | null>(null);

  // thêm mới hoặc sửa hạng vé
  /** Lưu hạng vé từ hộp thoại: cập nhật nếu id đã có, ngược lại thêm mới, rồi đóng hộp thoại. */
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

  /** Mở hộp thoại sửa với hạng vé được chọn. */
  const handleOpenEditTicketModal = (ticket: TicketItem) => {
    setEditingTicket(ticket);
    setShowAddTicketModal(true);
  };

  // xóa hạng vé
  /** Xóa hạng vé theo id khỏi danh sách. */
  const handleDeleteTicket = (id: string) => {
    setTickets(tickets.filter((t) => t.id !== id));
  };

  // thêm câu hỏi
  /** Thêm một câu hỏi dạng văn bản mặc định, không bắt buộc, vào cuối danh sách câu hỏi. */
  const handleAddQuestion = () => {
    const newQ: CustomQuestionItem = {
      id: `q_${Date.now()}`,
      title: translate("Câu hỏi dạng văn bản mới"),
      description: translate("Nhập mô tả cho câu hỏi này"),
      type: "text",
      isRequired: false
    };
    setQuestions([...questions, newQ]);
  };

  // xóa câu hỏi
  /** Xóa câu hỏi theo id khỏi danh sách. */
  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  // gửi yêu cầu duyệt sự kiện ở bước cuối
  /** Kiểm tra thông tin thanh toán bắt buộc, tải ảnh lên rồi gửi yêu cầu duyệt (trạng thái PENDING). Khi lỗi thì hiện thông báo và giữ nguyên dữ liệu form. */
  const handleSubmitApprovalRequest = async () => {
    const errs: Step5Errors = {};
    if (!accountHolder.trim()) errs.accountHolder = translate("Vui lòng nhập tên chủ tài khoản!");
    if (!accountNumber.trim()) errs.accountNumber = translate("Vui lòng nhập số tài khoản ngân hàng!");
    if (!bankName.trim()) errs.bankName = translate("Vui lòng chọn ngân hàng!");

    setStep5Errors(errs);
    if (Object.keys(errs).length > 0) return;

    // kiểm tra lại thời gian và vé trước khi gửi, phòng khi dữ liệu bước 2 đã bị sửa hoặc bước này được mở trực tiếp
    const timeAndTicketErrors = validateTimeAndTickets({ startDate, endDate, showtimes, tickets, requireFutureStart: true }, translate);
    if (hasErrors(timeAndTicketErrors)) {
      setStep2Errors(timeAndTicketErrors);
      setCurrentStep(2);
      setSubmitError(translate("Thông tin thời gian hoặc vé chưa hợp lệ. Vui lòng kiểm tra lại bước 2."));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const { uploadedPoster, uploadedBanner, uploadedLogo, uploadedGallery } =
        await processAllImagesToS3(posterImage, bannerImage, organizerLogo, galleryImages);

      // dựng dữ liệu yêu cầu tạo sự kiện
      const cachedUser = getCachedUserProfile();
      const currentUserId = cachedUser?.id || cachedUser?.keycloakId || undefined;

      const activeEventId = currentEventIdRef.current;

      const showtimesPayload = showtimes.map(st => ({
        ...st,
        tickets: tickets.length > 0 ? normalizeTicketsForSave(tickets) : st.tickets
      }));

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
        startTime: startDate ? (startDate.length === 16 ? startDate + ":00" : startDate) : undefined,
        endTime: endDate ? (endDate.length === 16 ? endDate + ":00" : endDate) : undefined,
        tickets: normalizeTicketsForSave(tickets),
        showtimes: showtimesPayload.length > 0 ? showtimesPayload : undefined,
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

      // gửi yêu cầu duyệt sự kiện qua api-gateway
      const res = (await eventApi.createEventApprovalRequest(payload)) as Record<string, unknown> | null;
      if (res && typeof res.id === "string") {
        updateCurrentEventId(res.id);
      }
      setEventStatus("PENDING");

      // lưu hồ sơ ban tổ chức vào bộ nhớ cục bộ để tự điền sẵn lần sau
      localStorage.setItem(
        "halo_organizer_profile",
        JSON.stringify({
          name: organizerName,
          info: organizerInfo,
          logo: uploadedLogo
        })
      );

      // xóa bản nháp cục bộ sau khi gửi thành công
      localStorage.removeItem("halo_draft_event");

      setIsSubmitted(true);
    } catch (error) {
      console.error("Failed to submit event approval request", error);
      const failure = parseEventSaveFailure(error);
      if (failure) {
        // lỗi thật, không phải thành công; form giữ nguyên dữ liệu. Nếu sự kiện đã được lưu thì nhớ id để lần thử lại sẽ cập nhật
        if (failure.kind === "ticketsSyncFailed" && failure.eventId) {
          updateCurrentEventId(failure.eventId);
          setSavedEventIdForSync(failure.eventId);
        }
        setSubmitError(eventSaveFailureMessage(failure, translate));
      } else {
        setSubmitError(translate("Không thể gửi yêu cầu duyệt sự kiện. Vui lòng thử lại."));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen app-bg-page transition-colors duration-300 pb-20">
      {/* Banner thông báo đã lưu nháp */}
      {draftSavedToast && (
        <div className="fixed top-20 right-6 z-50 bg-blue-600 text-white px-5 py-3 rounded-xl shadow-2xl font-bold text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top duration-300">
          <span>{translate(draftSavedToast)}</span>
        </div>
      )}

      {/* Khung chứa chính */}
      <div className="w-full max-w-[1340px] mx-auto px-6 md:px-12 lg:px-16 pt-6">
        {submitError && (
          <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
            <span className="min-w-0 flex-1">{submitError}</span>
            {savedEventIdForSync && <Link to={PATHS.EVENT_MANAGE(savedEventIdForSync)} className="min-h-11 inline-flex items-center rounded-lg bg-rose-600 px-4 text-xs font-bold text-white">{translate("Mở trang quản lý sự kiện")}</Link>}
          </div>
        )}
        {/* Banner trạng thái tự động lưu */}
        <div className="flex flex-wrap items-center justify-between gap-3 app-bg-card border app-border rounded-xl px-4 py-2.5 mb-4 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold">
            {autoSaveStatus === "error" ? (
              <span role="alert" className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-extrabold">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>{saveError || translate("Không lưu được bản nháp.")}</span>
                <button
                  type="button"
                  onClick={() => setAutoSaveTick((tick) => tick + 1)}
                  className="underline cursor-pointer"
                >
                  {translate("Thử lại")}
                </button>
              </span>
            ) : autoSaveStatus === "saving" ? (
              <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-extrabold">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>{translate("Đang tự động lưu bản nháp...")}</span>
              </span>
            ) : lastSavedAt ? (
              <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{translate("Đã tự động lưu nháp DRAFT lúc")} {lastSavedAt}</span>
              </span>
            ) : (
              <span className="flex items-center gap-2 app-text-muted">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>{translate("Tự động lưu nháp (Auto-Save ON)")}</span>
              </span>
            )}
          </div>

          {lastSavedAt && (
            <button
              type="button"
              onClick={handleClearDraft}
              className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
            >
              {translate("Xóa nháp & Làm mới từ đầu")}
            </button>
          )}
        </div>

        {/* Thanh các bước */}
        <CreateEventStepper
          stepTitles={stepTitles}
          currentStep={currentStep}
          onStepClick={(stepNum) => setCurrentStep(stepNum)}
        />

        {/* Bước 1: thông tin sự kiện */}
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

        {/* Bước 2: thời gian và vé */}
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
            onSaveDraft={handleSaveDraft}
            onBack={() => setCurrentStep(1)}
            onNext={handleStep2Next}
          />
        )}

        {/* Bước 3: cài đặt */}
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

        {/* Bước 4: câu hỏi (chỉ hiển thị khi bật câu hỏi khảo sát) */}
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

        {/* Bước 5: thông tin thanh toán và hóa đơn VAT (là bước 4 khi tắt khảo sát, bước 5 khi bật) */}
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

      {/* Hộp thoại 1: thông báo */}
      {showNoticeModal && <NoticeModal onClose={() => setShowNoticeModal(false)} />}

      {/* Hộp thoại yêu cầu eKYC */}
      <EkycRequiredModal 
        isOpen={showEkycModal} 
        onClose={() => {
          if (window.history.length > 2) {
            navigate(-1);
          } else {
            navigate(PATHS.HOME);
          }
        }} 
      />

      {/* Hộp thoại 2: tạo hoặc sửa vé */}
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

      {/* Hộp thoại 3: đã gửi thành công */}
      {isSubmitted && <SuccessSubmittedModal title={title} />}
    </div>
  );
};

export default CreateEvent;

