import React, { useState, useEffect } from "react";
import type { TicketItem, CustomQuestionItem, Step1Errors, Step2Errors, Step5Errors } from "@/types/organizer";
import CreateEventStepper from "@/features/organizer/components/create-event/CreateEventStepper";
import Step1EventInfo from "@/features/organizer/components/create-event/Step1EventInfo";
import Step2TicketsAndTime from "@/features/organizer/components/create-event/Step2TicketsAndTime";
import Step3Settings from "@/features/organizer/components/create-event/Step3Settings";
import Step4CustomQuestions from "@/features/organizer/components/create-event/Step4CustomQuestions";
import Step5PaymentInfo from "@/features/organizer/components/create-event/Step5PaymentInfo";
import AddTicketModal from "@/features/organizer/components/create-event/AddTicketModal";
import SuccessSubmittedModal from "@/features/organizer/components/create-event/SuccessSubmittedModal";
import { eventApi } from "@/services/eventApi";
import { mediaApi } from "@/services/mediaApi";
import { useParams } from "react-router-dom";
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
  }
  return urlOrData;
}

export const EventEditInfo: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();

  // active stepper step (1 to 5)
  const [currentStep, setCurrentStep] = useState(1);

  // modals state (NoticeModal disabled for inline edit)
  const [showAddTicketModal, setShowAddTicketModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketItem | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // FORM ERRORS
  const [step1Errors, setStep1Errors] = useState<Step1Errors>({});
  const [step2Errors, setStep2Errors] = useState<Step2Errors>({});
  const [step5Errors] = useState<Step5Errors>({});

  // FORM STATE
  // step 1: event info
  const [title, setTitle] = useState("Sự kiện HaloTicket");
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

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Load existing event data if eventId is available
  useEffect(() => {
    if (!eventId) return;
    eventApi.getEventById(eventId).then((ev) => {
      if (!ev) return;
      if (ev.title) setTitle(ev.title);
      if (ev.category) setCategory(ev.category);
      if (ev.locationName) setLocationName(ev.locationName);
      if (ev.city) setCity(ev.city);
      if (ev.ward) setWard(ev.ward);
      if (ev.address) setAddress(ev.address);
      if (ev.posterImage || ev.thumbnailUrl) setPosterImage(ev.posterImage || ev.thumbnailUrl);
      if (ev.bannerUrl || ev.image) setBannerImage(ev.bannerUrl || ev.image);
      if (ev.description) setDescription(ev.description);

      if (ev.startTime) setStartDate(formatDatetimeLocal(ev.startTime));
      if (ev.endTime) setEndDate(formatDatetimeLocal(ev.endTime));

      if (Array.isArray(ev.ticketCategories)) {
        setTickets(
          ev.ticketCategories.map((tc: any) => ({
            id: tc.id || `tc-${Date.now()}`,
            name: tc.name || "Hạng vé",
            price: tc.price || 0,
            isFree: tc.price === 0,
            totalQuantity: tc.totalQuantity || tc.quantity || 100,
            minPerOrder: tc.minPerOrder || 1,
            maxPerOrder: tc.maxPerOrder || 10,
            startSaleDate: tc.startSaleDate || "",
            endSaleDate: tc.endSaleDate || "",
            description: tc.description || ""
          }))
        );
      }
    });
  }, [eventId]);

  const stepTitles = [
    "Thông tin sự kiện",
    "Thời gian & Loại vé",
    "Cài đặt nâng cao",
    ...(enableCustomQuestions ? ["Khảo sát người mua"] : []),
    "Thanh toán & Xác nhận"
  ];

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleStep1Next = () => {
    const errs: Step1Errors = {};
    if (!title.trim()) errs.title = "Vui lòng nhập tên sự kiện";
    if (!address.trim() && locationType === "offline") errs.address = "Vui lòng nhập địa chỉ chi tiết";
    setStep1Errors(errs);
    if (Object.keys(errs).length > 0) return;
    setCurrentStep(2);
  };

  const handleStep2Next = () => {
    const errs: Step2Errors = {};
    if (!startDate) errs.startDate = "Vui lòng chọn thời gian bắt đầu";
    if (!endDate) errs.endDate = "Vui lòng chọn thời gian kết thúc";
    if (tickets.length === 0) errs.tickets = "Vui lòng tạo ít nhất 1 loại vé";
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
      title: "Câu hỏi khảo sát mới",
      description: "",
      type: "text",
      isRequired: false
    };
    setQuestions((prev) => [...prev, newQ]);
  };

  const handleDeleteQuestion = (qId: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== qId));
  };

  const handleSubmitApprovalRequest = async () => {
    setIsSubmitting(true);
    try {
      const uploadedPoster = await ensureS3Url(posterImage, "events/posters");
      const uploadedBanner = await ensureS3Url(bannerImage, "events/banners");
      const uploadedLogo = await ensureS3Url(organizerLogo, "organizers/logos");

      const payload: any = {
        title,
        category,
        locationType,
        locationName,
        city,
        ward,
        address,
        posterImage: uploadedPoster,
        bannerUrl: uploadedBanner,
        description,
        startTime: startDate ? new Date(startDate).toISOString() : null,
        endTime: endDate ? new Date(endDate).toISOString() : null,
        ticketCategories: tickets.map((t) => ({
          name: t.name,
          price: t.price,
          totalQuantity: t.totalQuantity,
          minPerOrder: t.minPerOrder,
          maxPerOrder: t.maxPerOrder,
          description: t.description
        })),
        organizerName,
        organizerInfo,
        organizerLogo: uploadedLogo
      };

      if (eventId && typeof (eventApi as any).updateEvent === "function") {
        await (eventApi as any).updateEvent(eventId, payload);
      }
      setIsSubmitted(true);
    } catch (err) {
      console.error("Failed to update event details:", err);
      showToast("Cập nhật thông tin thất bại, vui lòng thử lại");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-blue-600 text-white px-5 py-3 rounded-xl shadow-2xl font-bold text-xs flex items-center gap-2">
          <span>✓ {toastMsg}</span>
        </div>
      )}

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
          isOrganizerPreFilled={false}
          onSaveDraft={() => showToast("Đã lưu bản nháp!")}
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
          onSaveDraft={() => showToast("Đã lưu bản nháp!")}
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

      {/* Step 5: payment info & VAT invoice */}
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
          onSaveDraft={() => showToast("Đã lưu bản nháp!")}
          onBack={() => setCurrentStep(enableCustomQuestions ? 4 : 3)}
          onSubmit={handleSubmitApprovalRequest}
        />
      )}

      {/* Add or Edit Ticket Modal */}
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

      {/* Success submitted modal */}
      {isSubmitted && <SuccessSubmittedModal title={title} />}
    </div>
  );
};

export default EventEditInfo;
