import React, { useState, useEffect } from "react";
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
  const [organizerName, setOrganizerName] = useState("");
  const [organizerInfo, setOrganizerInfo] = useState("");
  const [organizerLogo, setOrganizerLogo] = useState<string | null>(null);

  // Auto pre-fill organizer info and restore draft if present
  useEffect(() => {
    const savedProfileStr = localStorage.getItem("halo_organizer_profile");
    if (savedProfileStr) {
      try {
        const profile = JSON.parse(savedProfileStr);
        if (profile.name) {
          setOrganizerName(profile.name);
          setOrganizerInfo(profile.info || "");
          setOrganizerLogo(profile.logo || null);
          setIsOrganizerPreFilled(true);
        }
      } catch (e) {
        console.error("Failed to parse organizer profile", e);
      }
    }

    const savedDraftStr = localStorage.getItem("halo_draft_event");
    if (savedDraftStr) {
      try {
        const draft = JSON.parse(savedDraftStr);
        if (draft.title) setTitle(draft.title);
        if (draft.category) setCategory(draft.category);
        if (draft.locationType) setLocationType(draft.locationType);
        if (draft.locationName) setLocationName(draft.locationName);
        if (draft.city) setCity(draft.city);
        if (draft.ward) setWard(draft.ward);
        if (draft.address) setAddress(draft.address);
        if (draft.posterImage) setPosterImage(draft.posterImage);
        if (draft.bannerImage) setBannerImage(draft.bannerImage);
        if (draft.description) setDescription(draft.description);
        if (draft.startDate) setStartDate(draft.startDate);
        if (draft.endDate) setEndDate(draft.endDate);
        if (draft.tickets && draft.tickets.length > 0) setTickets(draft.tickets);
        if (draft.accountHolder) setAccountHolder(draft.accountHolder);
        if (draft.accountNumber) setAccountNumber(draft.accountNumber);
        if (draft.bankName) setBankName(draft.bankName);
        if (draft.bankBranch) setBankBranch(draft.bankBranch);
        if (draft.taxName) setTaxName(draft.taxName);
        if (draft.taxCode) setTaxCode(draft.taxCode);
        if (draft.taxAddress) setTaxAddress(draft.taxAddress);
      } catch (e) {
        console.error("Failed to restore draft", e);
      }
    }
  }, []);

  // Save Event Draft function
  const handleSaveDraft = () => {
    const draftPayload = {
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
      accountHolder,
      accountNumber,
      bankName,
      bankBranch,
      businessType,
      taxName,
      taxAddress,
      taxCode,
      status: "DRAFT",
      savedAt: new Date().toISOString()
    };

    localStorage.setItem("halo_draft_event", JSON.stringify(draftPayload));
    setDraftSavedToast("Đã lưu bản nháp sự kiện (DRAFT) thành công!");
    setTimeout(() => setDraftSavedToast(null), 4000);
  };

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

  // STEP VALIDATIONS
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
    if (!startDate) errs.startDate = "Vui lòng chọn thời gian bắt đầu!";
    if (!endDate) errs.endDate = "Vui lòng chọn thời gian kết thúc!";
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      errs.endDate = "Thời gian kết thúc phải sau thời gian bắt đầu!";
    }
    if (tickets.length === 0) {
      errs.tickets = "Vui lòng tạo ít nhất một hạng vé!";
    }

    setStep2Errors(errs);
    if (Object.keys(errs).length === 0) {
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // handle add ticket
  const handleSaveTicket = (newTicket: TicketItem) => {
    setTickets([...tickets, newTicket]);
    setShowAddTicketModal(false);
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
      // 1. Upload images to S3 via media-service if they are Base64 strings
      let uploadedPoster = posterImage;
      if (posterImage && posterImage.startsWith("data:image/")) {
        const res = await mediaApi.uploadBase64Image(posterImage, "posters");
        if (res?.imageUrl) uploadedPoster = res.imageUrl;
      }

      let uploadedBanner = bannerImage;
      if (bannerImage && bannerImage.startsWith("data:image/")) {
        const res = await mediaApi.uploadBase64Image(bannerImage, "banners");
        if (res?.imageUrl) uploadedBanner = res.imageUrl;
      }

      let uploadedLogo = organizerLogo;
      if (organizerLogo && organizerLogo.startsWith("data:image/")) {
        const res = await mediaApi.uploadBase64Image(organizerLogo, "logos");
        if (res?.imageUrl) uploadedLogo = res.imageUrl;
      }

      // 2. Build Event Creation Request Payload
      const payload = {
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

      // 3. Send API POST /api/events via api-gateway
      await eventApi.createEventApprovalRequest(payload);

      // Save organizer profile to local storage for future auto pre-fill
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
            onOpenAddTicketModal={() => setShowAddTicketModal(true)}
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
            onNext={() => setCurrentStep(enableCustomQuestions ? 4 : 5)}
          />
        )}

        {/* Step 4: questions (only if enableCustomQuestions = true) */}
        {currentStep === 4 && enableCustomQuestions && (
          <Step4CustomQuestions
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
        {currentStep === 5 && (
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

      {/* Modal 2: create new ticket */}
      {showAddTicketModal && (
        <AddTicketModal
          onClose={() => setShowAddTicketModal(false)}
          onSave={handleSaveTicket}
        />
      )}

      {/* Modal 3: success submitted */}
      {isSubmitted && <SuccessSubmittedModal title={title} />}
    </div>
  );
};

export default CreateEvent;

