import React, { useState, useEffect } from "react";
import { FiX, FiCheck, FiCalendar, FiPercent, FiDollarSign, FiLayers, FiAlertCircle } from "react-icons/fi";
import type { VoucherItem, VoucherCreateData } from "@/types";

interface EventShowtimeOption {
  id: string;
  label: string;
}

interface FormErrors {
  title?: string;
  code?: string;
  codePrefix?: string;
  bulkCount?: string;
  startDate?: string;
  endDate?: string;
  discountValue?: string;
  ticketLimitCount?: string;
  maxOrdersPerBuyer?: string;
  minTicketsPerOrder?: string;
  maxTicketsPerOrder?: string;
  selectedShowtimes?: string;
}

interface CreateVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (voucherData: VoucherCreateData) => Promise<void>;
  onUpdate?: (voucherId: string, voucherData: Partial<VoucherCreateData>) => Promise<void>;
  initialVoucher?: VoucherItem | null;
  availableShowtimes?: EventShowtimeOption[];
}

const DEFAULT_SHOWTIMES: EventShowtimeOption[] = [
  { id: "st-1", label: "Suất 1: 19:00 - Ngày 15/09/2026" },
  { id: "st-2", label: "Suất 2: 19:00 - Ngày 16/09/2026" },
  { id: "st-3", label: "Suất 3: 20:00 - Ngày 17/09/2026" },
];

/**
 * converts various datetime string formats (dd/MM/yyyy HH:mm, yyyy-MM-dd HH:mm, ISO)
 * into standard HTML <input type="datetime-local"> format: YYYY-MM-DDTHH:mm
 */
function toDatetimeLocalInput(dateStr: string | undefined | null): string {
  if (!dateStr) return "";

  const trimmed = dateStr.trim();

  // if format is dd/MM/yyyy HH:mm
  if (trimmed.includes("/")) {
    const parts = trimmed.split(" ");
    const datePart = parts[0];
    const timePart = parts[1] || "00:00";
    if (datePart) {
      const [d, m, y] = datePart.split("/");
      if (d && m && y) {
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${timePart.slice(0, 5)}`;
      }
    }
  }

  // if format is yyyy-MM-dd HH:mm or yyyy-MM-ddTHH:mm
  if (trimmed.includes("-")) {
    return trimmed.replace(" ", "T").slice(0, 16);
  }

  return trimmed;
}

export const CreateVoucherModal: React.FC<CreateVoucherModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  initialVoucher,
  availableShowtimes = DEFAULT_SHOWTIMES,
}) => {
  const isEditMode = Boolean(initialVoucher);

  const [creationMode, setCreationMode] = useState<"SINGLE" | "BULK">("SINGLE");
  const [bulkCount, setBulkCount] = useState<number>(5);
  const [codePrefix, setCodePrefix] = useState<string>("HALO");

  // section 1: basic information
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [startDate, setStartDate] = useState("2026-09-15T00:00");
  const [endDate, setEndDate] = useState("2026-10-15T23:59");
  const [terms, setTerms] = useState("");

  // section 2: discount & limit settings
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [applyTicketLimitType, setApplyTicketLimitType] = useState<"LIMITED" | "UNLIMITED">("LIMITED");
  const [ticketLimitCount, setTicketLimitCount] = useState<number>(100);
  const [maxOrdersPerBuyer, setMaxOrdersPerBuyer] = useState<number>(1);
  const [minTicketsPerOrder, setMinTicketsPerOrder] = useState<number>(1);
  const [maxTicketsPerOrder, setMaxTicketsPerOrder] = useState<number>(5);

  // section 3: apply scope & showtimes
  const [applyScope, setApplyScope] = useState<"ALL" | "LIMITED_SHOWTIMES">("ALL");
  const [selectedShowtimes, setSelectedShowtimes] = useState<string[]>([]);
  const [showShowtimePicker, setShowShowtimePicker] = useState<boolean>(false);

  // validation errors state
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // populate ALL form fields when initialVoucher is provided (Edit Mode)
  useEffect(() => {
    setErrors({});
    if (initialVoucher) {
      setTitle(initialVoucher.title || "");
      setCode(initialVoucher.code || "");
      setDiscountType(initialVoucher.discountType || initialVoucher.type || "PERCENTAGE");
      setDiscountValue(initialVoucher.discountValue ?? initialVoucher.value ?? 10);
      setApplyTicketLimitType(initialVoucher.applyTicketLimitType || "LIMITED");
      setTicketLimitCount(initialVoucher.ticketLimitCount ?? 100);
      setMaxOrdersPerBuyer(initialVoucher.maxOrdersPerBuyer ?? 1);
      setMinTicketsPerOrder(initialVoucher.minTicketsPerOrder ?? 1);
      setMaxTicketsPerOrder(initialVoucher.maxTicketsPerOrder ?? 5);
      
      const scope = initialVoucher.applyScope || "ALL";
      setApplyScope(scope);
      setShowShowtimePicker(scope === "LIMITED_SHOWTIMES");
      setSelectedShowtimes(initialVoucher.applicableShowtimes || []);
      setTerms(initialVoucher.terms || "");

      if (initialVoucher.startDate) {
        setStartDate(toDatetimeLocalInput(initialVoucher.startDate));
      }
      if (initialVoucher.endDate) {
        setEndDate(toDatetimeLocalInput(initialVoucher.endDate));
      }
    } else {
      // reset defaults for create mode
      setTitle("");
      setCode("");
      setDiscountType("PERCENTAGE");
      setDiscountValue(10);
      setApplyTicketLimitType("LIMITED");
      setTicketLimitCount(100);
      setMaxOrdersPerBuyer(1);
      setMinTicketsPerOrder(1);
      setMaxTicketsPerOrder(5);
      setApplyScope("ALL");
      setSelectedShowtimes([]);
      setTerms("");
      setShowShowtimePicker(false);
    }
  }, [initialVoucher, isOpen]);

  if (!isOpen) return null;

  const toggleShowtimeSelection = (showtimeLabel: string) => {
    setSelectedShowtimes((prev) => {
      const updated = prev.includes(showtimeLabel)
        ? prev.filter((s) => s !== showtimeLabel)
        : [...prev, showtimeLabel];
      if (errors.selectedShowtimes && updated.length > 0) {
        setErrors((e) => ({ ...e, selectedShowtimes: undefined }));
      }
      return updated;
    });
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // name promotion
    if (!title.trim()) {
      newErrors.title = "Vui lòng nhập tên chương trình khuyến mãi!";
    } else if (title.trim().length > 80) {
      newErrors.title = "Tên chương trình khuyến mãi không vượt quá 80 ký tự!";
    }

    // voucher code / bnulk settings
    if (!isEditMode && creationMode === "BULK") {
      if (!codePrefix.trim()) {
        newErrors.codePrefix = "Vui lòng nhập tiền tố mã!";
      } else if (codePrefix.trim().length > 6) {
        newErrors.codePrefix = "Tiền tố tối đa 6 ký tự!";
      } else if (!/^[A-Z0-9]+$/i.test(codePrefix)) {
        newErrors.codePrefix = "Tiền tố chỉ gồm chữ cái (A-Z) và chữ số (0-9)!";
      }

      if (!bulkCount || bulkCount < 1 || bulkCount > 100) {
        newErrors.bulkCount = "Số lượng mã tạo hàng loạt phải từ 1 đến 100!";
      }
    } else {
      if (!code.trim()) {
        newErrors.code = "Vui lòng nhập mã voucher!";
      } else if (code.trim().length < 4 || code.trim().length > 12) {
        newErrors.code = "Mã voucher phải từ 4 đến 12 ký tự!";
      } else if (!/^[A-Z0-9]+$/i.test(code)) {
        newErrors.code = "Mã voucher chỉ được chứa chữ cái không dấu (A-Z) và chữ số (0-9)!";
      }
    }

    // start & end date
    if (!startDate) {
      newErrors.startDate = "Vui lòng chọn thời gian bắt đầu áp dụng!";
    }
    if (!endDate) {
      newErrors.endDate = "Vui lòng chọn thời gian kết thúc áp dụng!";
    }
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end <= start) {
        newErrors.endDate = "Thời gian kết thúc phải sau thời gian bắt đầu!";
      }
    }

    // discount
    if (discountValue === undefined || discountValue === null || isNaN(discountValue) || discountValue <= 0) {
      newErrors.discountValue = "Vui lòng nhập giá trị mức giảm lớn hơn 0!";
    } else if (discountType === "PERCENTAGE" && discountValue > 100) {
      newErrors.discountValue = "Mức giảm phần trăm không vượt quá 100%!";
    } else if (discountType === "FIXED_AMOUNT" && discountValue < 1000) {
      newErrors.discountValue = "Mức giảm cố định tối thiểu là 1.000 VNĐ!";
    }

    // quantity limited
    if (applyTicketLimitType === "LIMITED") {
      if (!ticketLimitCount || ticketLimitCount < 1) {
        newErrors.ticketLimitCount = "Số lượng vé tối đa phải lớn hơn 0!";
      }
    }

    // advanced limited
    if (!maxOrdersPerBuyer || maxOrdersPerBuyer < 1) {
      newErrors.maxOrdersPerBuyer = "Số đơn tối đa/người mua phải lớn hơn 0!";
    }
    if (!minTicketsPerOrder || minTicketsPerOrder < 1) {
      newErrors.minTicketsPerOrder = "Số vé tối thiểu/đơn phải lớn hơn 0!";
    }
    if (!maxTicketsPerOrder || maxTicketsPerOrder < 1) {
      newErrors.maxTicketsPerOrder = "Số vé tối đa/đơn phải lớn hơn 0!";
    } else if (minTicketsPerOrder && maxTicketsPerOrder < minTicketsPerOrder) {
      newErrors.maxTicketsPerOrder = "Số vé tối đa/đơn phải lớn hơn hoặc bằng số vé tối thiểu!";
    }

    // apply scope showtime
    if (applyScope === "LIMITED_SHOWTIMES" && selectedShowtimes.length === 0) {
      newErrors.selectedShowtimes = "Vui lòng chọn ít nhất 1 suất diễn áp dụng!";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload: VoucherCreateData = {
        creationMode,
        title: title.trim(),
        code: code.toUpperCase().trim(),
        codePrefix: codePrefix.toUpperCase().trim(),
        bulkCount: Number(bulkCount),
        terms: terms.trim(),
        discountType,
        discountValue: Number(discountValue),
        applyTicketLimitType,
        ticketLimitCount: applyTicketLimitType === "LIMITED" ? Number(ticketLimitCount) : 99999,
        maxOrdersPerBuyer: Number(maxOrdersPerBuyer),
        minTicketsPerOrder: Number(minTicketsPerOrder),
        maxTicketsPerOrder: Number(maxTicketsPerOrder),
        applyScope,
        applicableShowtimes: applyScope === "LIMITED_SHOWTIMES" ? selectedShowtimes : [],
        startDate: startDate.replace("T", " "),
        endDate: endDate.replace("T", " "),
      };

      if (isEditMode && initialVoucher && onUpdate) {
        await onUpdate(initialVoucher.id, payload);
      } else {
        await onSave(payload);
      }

      onClose();
    } catch (err) {
      console.error("Error submitting voucher:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showtimeList = availableShowtimes.length > 0 ? availableShowtimes : DEFAULT_SHOWTIMES;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl app-bg-card border app-border rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 border-b app-border flex items-center justify-between app-bg-subnav">
          <h2 className="text-base font-black app-text-main flex items-center gap-2">
            <FiLayers className="w-5 h-5 text-blue-500" />
            <span>{isEditMode ? "Chỉnh sửa voucher" : "Tạo voucher mới"}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg app-text-muted hover:app-text-main hover:bg-slate-500/10 transition-colors cursor-pointer"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-8 max-h-[80vh] overflow-y-auto no-scrollbar">
          {/* Mode Selector (Only displayed in Create Mode) */}
          {!isEditMode && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => setCreationMode("SINGLE")}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  creationMode === "SINGLE"
                    ? "border-blue-600 bg-blue-600/10 dark:bg-blue-950/40 shadow-sm"
                    : "app-border app-bg-main hover:border-slate-400"
                }`}
              >
                <div>
                  <h3 className="font-extrabold app-text-main text-sm flex items-center gap-2">
                    <span>Tạo 1 mã</span>
                    {creationMode === "SINGLE" && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block animate-pulse" />
                    )}
                  </h3>
                  <p className="text-xs app-text-muted mt-1">
                    Tạo một mã voucher duy nhất tùy chỉnh cho sự kiện của bạn
                  </p>
                </div>
                <div className="pt-2 flex justify-end">
                  <span
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      creationMode === "SINGLE"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "app-bg-card border app-border app-text-muted"
                    }`}
                  >
                    {creationMode === "SINGLE" ? "Đã chọn" : "Chọn"}
                  </span>
                </div>
              </div>

              <div
                onClick={() => setCreationMode("BULK")}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  creationMode === "BULK"
                    ? "border-blue-600 bg-blue-600/10 dark:bg-blue-950/40 shadow-sm"
                    : "app-border app-bg-main hover:border-slate-400"
                }`}
              >
                <div>
                  <h3 className="font-extrabold app-text-main text-sm flex items-center gap-2">
                    <span>Tạo nhiều mã (Hàng loạt)</span>
                    {creationMode === "BULK" && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block animate-pulse" />
                    )}
                  </h3>
                  <p className="text-xs app-text-muted mt-1">
                    Tự động tạo ngẫu nhiên danh sách mã voucher hàng loạt cùng áp dụng các thiết lập bên dưới
                  </p>
                </div>
                <div className="pt-2 flex justify-end">
                  <span
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      creationMode === "BULK"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "app-bg-card border app-border app-text-muted"
                    }`}
                  >
                    {creationMode === "BULK" ? "Đã chọn" : "Chọn"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Thông tin cơ bản */}
          <div className="space-y-4 pt-2 border-t app-border">
            <h3 className="text-xs font-black app-text-main uppercase tracking-wider text-blue-600 dark:text-blue-400">
              1. Thông tin cơ bản
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold app-text-main">
                    Tên chương trình khuyến mãi <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] app-text-muted font-mono">{title.length} / 80</span>
                </div>
                <input
                  type="text"
                  maxLength={80}
                  placeholder="Nhập tên chương trình khuyến mãi"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl app-bg-main border text-xs focus:outline-none font-medium transition-all ${
                    errors.title ? "border-rose-500 text-rose-600 focus:border-rose-500" : "app-border app-text-main focus:border-blue-500"
                  }`}
                />
                {errors.title ? (
                  <p className="text-[11px] text-rose-500 font-bold mt-1 flex items-center gap-1">
                    <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.title}</span>
                  </p>
                ) : (
                  <p className="text-[11px] app-text-muted mt-1">Tên chương trình giúp quản lý voucher nội bộ dễ dàng</p>
                )}
              </div>

              {/* Code settings for SINGLE vs BULK */}
              {creationMode === "SINGLE" || isEditMode ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold app-text-main">
                      Mã voucher <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] app-text-muted font-mono">{code.length} / 12</span>
                  </div>
                  <input
                    type="text"
                    maxLength={12}
                    placeholder="VD: HALO2026"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      if (errors.code) setErrors((prev) => ({ ...prev, code: undefined }));
                    }}
                    className={`w-full px-4 py-2.5 rounded-xl app-bg-main border text-xs font-mono uppercase focus:outline-none font-bold tracking-wider transition-all ${
                      errors.code ? "border-rose-500 text-rose-600 focus:border-rose-500" : "app-border app-text-main focus:border-blue-500"
                    }`}
                  />
                  {errors.code ? (
                    <p className="text-[11px] text-rose-500 font-bold mt-1 flex items-center gap-1">
                      <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.code}</span>
                    </p>
                  ) : (
                    <p className="text-[11px] app-text-muted mt-1">
                      Cho phép chữ cái (A-Z) và chữ số (0-9), tối thiểu 4 và tối đa 12 ký tự
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold app-text-main mb-1.5">
                      Tiền tố mã (Prefix): <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="VD: PROMO"
                      value={codePrefix}
                      onChange={(e) => {
                        setCodePrefix(e.target.value.toUpperCase());
                        if (errors.codePrefix) setErrors((prev) => ({ ...prev, codePrefix: undefined }));
                      }}
                      className={`w-full px-4 py-2.5 rounded-xl app-bg-main border text-xs font-mono uppercase focus:outline-none font-bold transition-all ${
                        errors.codePrefix ? "border-rose-500 text-rose-600 focus:border-rose-500" : "app-border app-text-main focus:border-blue-500"
                      }`}
                    />
                    {errors.codePrefix ? (
                      <p className="text-[11px] text-rose-500 font-bold mt-1 flex items-center gap-1">
                        <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.codePrefix}</span>
                      </p>
                    ) : (
                      <p className="text-[11px] app-text-muted mt-1">Tiền tố đứng trước đoạn mã sinh ngẫu nhiên</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold app-text-main mb-1.5">
                      Số lượng mã tạo hàng loạt: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={bulkCount}
                      onChange={(e) => {
                        setBulkCount(Number(e.target.value));
                        if (errors.bulkCount) setErrors((prev) => ({ ...prev, bulkCount: undefined }));
                      }}
                      className={`w-full px-4 py-2.5 rounded-xl app-bg-main border text-xs focus:outline-none font-bold transition-all ${
                        errors.bulkCount ? "border-rose-500 text-rose-600 focus:border-rose-500" : "app-border app-text-main focus:border-blue-500"
                      }`}
                    />
                    {errors.bulkCount ? (
                      <p className="text-[11px] text-rose-500 font-bold mt-1 flex items-center gap-1">
                        <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.bulkCount}</span>
                      </p>
                    ) : (
                      <p className="text-[11px] app-text-muted mt-1">Số lượng voucher ngẫu nhiên sẽ được sinh tự động</p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold app-text-main mb-1.5">
                    Thời gian bắt đầu áp dụng: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (errors.startDate) setErrors((prev) => ({ ...prev, startDate: undefined }));
                    }}
                    className={`w-full px-4 py-2.5 rounded-xl app-bg-main border text-xs focus:outline-none font-medium transition-all ${
                      errors.startDate ? "border-rose-500 text-rose-600 focus:border-rose-500" : "app-border app-text-main focus:border-blue-500"
                    }`}
                  />
                  {errors.startDate && (
                    <p className="text-[11px] text-rose-500 font-bold mt-1 flex items-center gap-1">
                      <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.startDate}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold app-text-main mb-1.5">
                    Thời gian kết thúc: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      if (errors.endDate) setErrors((prev) => ({ ...prev, endDate: undefined }));
                    }}
                    className={`w-full px-4 py-2.5 rounded-xl app-bg-main border text-xs focus:outline-none font-medium transition-all ${
                      errors.endDate ? "border-rose-500 text-rose-600 focus:border-rose-500" : "app-border app-text-main focus:border-blue-500"
                    }`}
                  />
                  {errors.endDate && (
                    <p className="text-[11px] text-rose-500 font-bold mt-1 flex items-center gap-1">
                      <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.endDate}</span>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold app-text-main mb-1.5">
                  Điều khoản & Quy định sử dụng:
                </label>
                <textarea
                  rows={2}
                  placeholder="Nhập ghi chú hoặc điều khoản áp dụng voucher..."
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main text-xs focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Thiết lập mã voucher */}
          <div className="space-y-4 pt-4 border-t app-border">
            <h3 className="text-xs font-black app-text-main uppercase tracking-wider text-blue-600 dark:text-blue-400">
              2. Thiết lập mức giảm & giới hạn
            </h3>

            <div className="space-y-5">
              {/* Restyled Promotion Type Radio Cards */}
              <div className="space-y-2">
                <label className="text-xs font-bold app-text-main block">Loại khuyến mãi & Mức giảm: <span className="text-rose-500">*</span></label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => {
                      setDiscountType("PERCENTAGE");
                      if (errors.discountValue) setErrors((prev) => ({ ...prev, discountValue: undefined }));
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      discountType === "PERCENTAGE"
                        ? "border-blue-600 bg-blue-600/10 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold shadow-xs"
                        : "app-border app-bg-main hover:border-slate-400 app-text-main font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${discountType === "PERCENTAGE" ? "bg-blue-600 text-white" : "app-bg-card app-text-muted"}`}>
                        <FiPercent className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs">Theo phần trăm (%)</div>
                        <div className="text-[10px] opacity-70">Giảm giá theo % giá trị đơn hàng</div>
                      </div>
                    </div>
                    {discountType === "PERCENTAGE" && <FiCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                  </div>

                  <div
                    onClick={() => {
                      setDiscountType("FIXED_AMOUNT");
                      if (errors.discountValue) setErrors((prev) => ({ ...prev, discountValue: undefined }));
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      discountType === "FIXED_AMOUNT"
                        ? "border-blue-600 bg-blue-600/10 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold shadow-xs"
                        : "app-border app-bg-main hover:border-slate-400 app-text-main font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${discountType === "FIXED_AMOUNT" ? "bg-blue-600 text-white" : "app-bg-card app-text-muted"}`}>
                        <FiDollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs">Theo số tiền (VNĐ)</div>
                        <div className="text-[10px] opacity-70">Giảm trực tiếp số tiền cố định</div>
                      </div>
                    </div>
                    {discountType === "FIXED_AMOUNT" && <FiCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                  </div>
                </div>

                <div className="pt-2 relative max-w-sm">
                  <input
                    type="number"
                    min={1}
                    value={discountValue}
                    onChange={(e) => {
                      setDiscountValue(Number(e.target.value));
                      if (errors.discountValue) setErrors((prev) => ({ ...prev, discountValue: undefined }));
                    }}
                    className={`w-full px-4 py-2.5 rounded-xl app-bg-main border text-xs focus:outline-none font-bold pr-12 transition-all ${
                      errors.discountValue ? "border-rose-500 text-rose-600 focus:border-rose-500" : "app-border app-text-main focus:border-blue-500"
                    }`}
                    placeholder="Nhập giá trị giảm"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-blue-600 dark:text-blue-400 font-mono">
                    {discountType === "PERCENTAGE" ? "%" : "VNĐ"}
                  </span>
                </div>
                {errors.discountValue && (
                  <p className="text-[11px] text-rose-500 font-bold mt-1 flex items-center gap-1">
                    <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.discountValue}</span>
                  </p>
                )}
              </div>

              {/* Total ticket usage limit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start pt-2">
                <label className="text-xs font-bold app-text-main pt-2">Tổng số vé được áp dụng:</label>
                <div className="sm:col-span-2 space-y-2">
                  <div className="flex items-center gap-6 text-xs app-text-main font-bold">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="ticketLimit"
                        checked={applyTicketLimitType === "LIMITED"}
                        onChange={() => {
                          setApplyTicketLimitType("LIMITED");
                          if (errors.ticketLimitCount) setErrors((prev) => ({ ...prev, ticketLimitCount: undefined }));
                        }}
                        className="accent-blue-600 w-4 h-4"
                      />
                      <span>Giới hạn</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="ticketLimit"
                        checked={applyTicketLimitType === "UNLIMITED"}
                        onChange={() => {
                          setApplyTicketLimitType("UNLIMITED");
                          if (errors.ticketLimitCount) setErrors((prev) => ({ ...prev, ticketLimitCount: undefined }));
                        }}
                        className="accent-blue-600 w-4 h-4"
                      />
                      <span>Không giới hạn</span>
                    </label>
                  </div>

                  {applyTicketLimitType === "LIMITED" && (
                    <div>
                      <input
                        type="number"
                        min={1}
                        value={ticketLimitCount}
                        onChange={(e) => {
                          setTicketLimitCount(Number(e.target.value));
                          if (errors.ticketLimitCount) setErrors((prev) => ({ ...prev, ticketLimitCount: undefined }));
                        }}
                        className={`w-full px-4 py-2.5 rounded-xl app-bg-main border text-xs focus:outline-none font-bold transition-all ${
                          errors.ticketLimitCount ? "border-rose-500 text-rose-600 focus:border-rose-500" : "app-border app-text-main focus:border-blue-500"
                        }`}
                        placeholder="Nhập số lượng vé tối đa"
                      />
                      {errors.ticketLimitCount && (
                        <p className="text-[11px] text-rose-500 font-bold mt-1 flex items-center gap-1">
                          <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{errors.ticketLimitCount}</span>
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-[11px] app-text-muted">Tổng số lượt áp dụng tối đa của mã voucher này</p>
                </div>
              </div>

              {/* Advanced limits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold app-text-main mb-1.5">Số đơn tối đa/Người mua:</label>
                  <input
                    type="number"
                    min={1}
                    value={maxOrdersPerBuyer}
                    onChange={(e) => {
                      setMaxOrdersPerBuyer(Number(e.target.value));
                      if (errors.maxOrdersPerBuyer) setErrors((prev) => ({ ...prev, maxOrdersPerBuyer: undefined }));
                    }}
                    className={`w-full px-4 py-2 rounded-xl app-bg-main border text-xs focus:outline-none font-medium transition-all ${
                      errors.maxOrdersPerBuyer ? "border-rose-500 text-rose-600 focus:border-rose-500" : "app-border app-text-main focus:border-blue-500"
                    }`}
                  />
                  {errors.maxOrdersPerBuyer && (
                    <p className="text-[11px] text-rose-500 font-bold mt-1 flex items-center gap-1">
                      <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.maxOrdersPerBuyer}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold app-text-main mb-1.5">Số vé tối thiểu/Đơn:</label>
                  <input
                    type="number"
                    min={1}
                    value={minTicketsPerOrder}
                    onChange={(e) => {
                      setMinTicketsPerOrder(Number(e.target.value));
                      if (errors.minTicketsPerOrder) setErrors((prev) => ({ ...prev, minTicketsPerOrder: undefined }));
                    }}
                    className={`w-full px-4 py-2 rounded-xl app-bg-main border text-xs focus:outline-none font-medium transition-all ${
                      errors.minTicketsPerOrder ? "border-rose-500 text-rose-600 focus:border-rose-500" : "app-border app-text-main focus:border-blue-500"
                    }`}
                  />
                  {errors.minTicketsPerOrder && (
                    <p className="text-[11px] text-rose-500 font-bold mt-1 flex items-center gap-1">
                      <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.minTicketsPerOrder}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold app-text-main mb-1.5">Số vé tối đa/Đơn:</label>
                  <input
                    type="number"
                    min={1}
                    value={maxTicketsPerOrder}
                    onChange={(e) => {
                      setMaxTicketsPerOrder(Number(e.target.value));
                      if (errors.maxTicketsPerOrder) setErrors((prev) => ({ ...prev, maxTicketsPerOrder: undefined }));
                    }}
                    className={`w-full px-4 py-2 rounded-xl app-bg-main border text-xs focus:outline-none font-medium transition-all ${
                      errors.maxTicketsPerOrder ? "border-rose-500 text-rose-600 focus:border-rose-500" : "app-border app-text-main focus:border-blue-500"
                    }`}
                  />
                  {errors.maxTicketsPerOrder && (
                    <p className="text-[11px] text-rose-500 font-bold mt-1 flex items-center gap-1">
                      <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.maxTicketsPerOrder}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Phạm vi áp dụng (Showtimes selection) */}
          <div className="space-y-4 pt-4 border-t app-border">
            <h3 className="text-xs font-black app-text-main uppercase tracking-wider text-blue-600 dark:text-blue-400">
              3. Phạm vi áp dụng theo suất diễn
            </h3>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-6 text-xs app-text-main font-bold">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scope"
                      checked={applyScope === "ALL"}
                      onChange={() => {
                        setApplyScope("ALL");
                        setShowShowtimePicker(false);
                        if (errors.selectedShowtimes) setErrors((prev) => ({ ...prev, selectedShowtimes: undefined }));
                      }}
                      className="accent-blue-600 w-4 h-4"
                    />
                    <span>Toàn bộ suất diễn (Tất cả các ngày)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scope"
                      checked={applyScope === "LIMITED_SHOWTIMES"}
                      onChange={() => {
                        setApplyScope("LIMITED_SHOWTIMES");
                        setShowShowtimePicker(true);
                      }}
                      className="accent-blue-600 w-4 h-4"
                    />
                    <span>Giới hạn suất diễn</span>
                  </label>
                </div>

                {applyScope === "LIMITED_SHOWTIMES" && (
                  <button
                    type="button"
                    onClick={() => setShowShowtimePicker(!showShowtimePicker)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <FiCalendar className="w-4 h-4" />
                    <span>{showShowtimePicker ? "Đóng danh sách suất" : "Chọn suất diễn"}</span>
                  </button>
                )}
              </div>

              {/* Showtimes picker panel */}
              {applyScope === "LIMITED_SHOWTIMES" && (
                <div className="p-4 rounded-2xl app-bg-main border app-border space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold app-text-main">
                      Chọn các suất diễn áp dụng mã ({selectedShowtimes.length} đã chọn):
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedShowtimes(
                          selectedShowtimes.length === showtimeList.length
                            ? []
                            : showtimeList.map((s) => s.label)
                        )
                      }
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {selectedShowtimes.length === showtimeList.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {showtimeList.map((st) => {
                      const isSelected = selectedShowtimes.includes(st.label);
                      return (
                        <div
                          key={st.id}
                          onClick={() => toggleShowtimeSelection(st.label)}
                          className={`p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? "border-blue-600 bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold"
                              : "app-border app-bg-card app-text-main hover:border-slate-400"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <FiCalendar className="w-4 h-4 app-text-muted" />
                            <span>{st.label}</span>
                          </div>
                          {isSelected && <FiCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>

                  {errors.selectedShowtimes && (
                    <p className="text-[11px] text-rose-500 font-bold mt-1 flex items-center gap-1">
                      <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.selectedShowtimes}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-6 border-t app-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold app-text-muted hover:app-text-main app-bg-main border app-border transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting
                ? "Đang xử lý..."
                : isEditMode
                ? "Lưu thay đổi"
                : creationMode === "BULK"
                ? `Tạo ${bulkCount} voucher`
                : "Tạo voucher"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateVoucherModal;
