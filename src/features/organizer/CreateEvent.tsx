import React, { useState, useEffect } from "react";
import type { TicketItem, CustomQuestionItem } from "@/types/organizer";
import CreateEventStepper from "./components/create-event/CreateEventStepper";
import Step1EventInfo from "./components/create-event/Step1EventInfo";
import Step2TicketsAndTime from "./components/create-event/Step2TicketsAndTime";
import Step3Settings from "./components/create-event/Step3Settings";
import Step4CustomQuestions from "./components/create-event/Step4CustomQuestions";
import Step5PaymentInfo from "./components/create-event/Step5PaymentInfo";
import NoticeModal from "./components/create-event/NoticeModal";
import AddTicketModal from "./components/create-event/AddTicketModal";
import SuccessSubmittedModal from "./components/create-event/SuccessSubmittedModal";

export const CreateEvent: React.FC = () => {
  // scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  // modals state
  const [showNoticeModal, setShowNoticeModal] = useState(true);
  const [showAddTicketModal, setShowAddTicketModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // active stepper step (1 to 5)
  const [currentStep, setCurrentStep] = useState(1);

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
  const [description, setDescription] = useState(
    "Giới thiệu sự kiện:\n[Tóm tắt ngắn gọn về sự kiện: Nội dung chính của sự kiện, điểm đặc sắc nhất và lý do khiến người tham gia không nên bỏ lỡ]\n\nChi tiết sự kiện:\n• Chương trình chính: [Liệt kê các tiết mục biểu diễn nổi bật]\n• Khách mời: [Thông tin về các nghệ sĩ, diễn giả nổi tiếng]\n• Trải nghiệm đặc biệt: [Khu vực check-in, photo booth, quà tặng]\n\nĐiều khoản và điều kiện:\n- Không mang chất cấm, vũ khí vào khu vực sự kiện.\n- Vé đã mua không đổi trả trừ trường hợp sự kiện hủy."
  );
  const [organizerName, setOrganizerName] = useState("");
  const [organizerInfo, setOrganizerInfo] = useState("");
  const [organizerLogo, setOrganizerLogo] = useState<string | null>(null);

  // step 2: time & ticket
  const [startDate, setStartDate] = useState("2026-10-15T18:00");
  const [endDate, setEndDate] = useState("2026-10-15T22:00");
  const [tickets, setTickets] = useState<TicketItem[]>([
    {
      id: "1",
      name: "Vé VVIP (Hàng đầu)",
      price: 1500000,
      isFree: false,
      totalQuantity: 100,
      minPerOrder: 1,
      maxPerOrder: 4,
      startSaleDate: "2026-09-10T08:00",
      endSaleDate: "2026-10-15T12:00",
      description: "Bao gồm lối đi riêng, quà lưu niệm độc quyền & vị trí sát sân khấu.",
      image: null
    },
    {
      id: "2",
      name: "Vé Phổ Thông (GA)",
      price: 450000,
      isFree: false,
      totalQuantity: 500,
      minPerOrder: 1,
      maxPerOrder: 10,
      startSaleDate: "2026-09-10T08:00",
      endSaleDate: "2026-10-15T12:00",
      description: "Khu vực đứng/ngồi tự do trải nghiệm không khí âm nhạc bùng nổ.",
      image: null
    }
  ]);

  // step 3: settings
  const [isPrivate, setIsPrivate] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [enableCustomQuestions, setEnableCustomQuestions] = useState(false);

  // step 4: questions (only if enableCustomQuestions = true)
  const [questionScope, setQuestionScope] = useState<"order" | "ticket">("order");
  const [questions, setQuestions] = useState<CustomQuestionItem[]>([
    {
      id: "q1",
      title: "Họ và tên người tham dự",
      description: "Điền đúng tên trên giấy tờ tùy thân để check-in tại cổng",
      type: "text",
      isRequired: true
    },
    {
      id: "q2",
      title: "Số CCCD / CMND / Hộ chiếu",
      description: "Dùng để đối soát danh tính người nhận vé",
      type: "text",
      isRequired: true
    }
  ]);

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
  const handleSubmitApprovalRequest = () => {
    if (!accountHolder.trim() || !accountNumber.trim()) {
      alert("Vui lòng hoàn tất Thông tin ngân hàng nhận tiền bán vé!");
      return;
    }
    setIsSubmitted(true);
  };

  return (
    <div className="w-full min-h-screen app-bg-page transition-colors duration-300 pb-20">
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
            onNext={() => setCurrentStep(2)}
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
            onOpenAddTicketModal={() => setShowAddTicketModal(true)}
            onDeleteTicket={handleDeleteTicket}
            onBack={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(3)}
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
