import axiosClient from "./axiosClient";
import type {
  EventSettlement,
  FinanceSummary,
  OrganizerFinanceAnalytics,
  AdminAdvancePolicy,
  AdminPayoutDetail,
  AdminPayoutRow,
  AdminFinanceSummary,
  AdminPolicyAuditEntry,
  AdminPolicyOverride,
  AdminReconciliationRequest,
  AdminReconciliationResponse,
  AdminReconciliationQueueItem,
  PayoutDetail,
  PayoutPage,
  PayoutQuote,
  PayoutResponse,
  PayoutAccountSnapshot,
  PayoutType,
} from "@/types";

/** Bộ lọc danh sách yêu cầu rút tiền: từ khóa, trạng thái, khoảng ngày, phân trang và sự kiện. */
export interface PayoutListFilters {
  search?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
  eventId?: string;
}

/** Dựng chuỗi query từ bộ lọc, bỏ qua các giá trị rỗng hoặc `undefined`; trả về chuỗi rỗng nếu không có tham số. */
const queryString = (filters: PayoutListFilters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : "";
};

/** DTO tổng quan tài chính của người tổ chức do backend trả về (các số tiền là chuỗi số nguyên VND). */
interface OrganizerFinanceDto {
  grossCollected?: string;
  platformFees?: string;
  refunds?: string;
  heldAmount?: string;
  availableAmount?: string;
  processingAmount?: string;
  paidAmount?: string;
  updatedAt?: string;
  items?: OrganizerEventDto[];
}
/** DTO số liệu đối soát của một sự kiện do backend trả về cho người tổ chức. */
interface OrganizerEventDto {
  eventId: string;
  title: string;
  imageUrl?: string;
  endAt?: string;
  grossCollected?: string;
  platformFees?: string;
  refunds?: string;
  heldAmount?: string;
  availableAmount?: string;
  paidAmount?: string;
  reconciliationStatus?: string;
  eligibility?: { eligible?: boolean; reasonCodes?: string[] };
  eligibilityByType?: Partial<Record<PayoutType, { eligible?: boolean; reasonCodes?: string[] }>>;
  maximumAdvanceAmount?: string;
}
/** Kiểm tra giá trị tiền là chuỗi số nguyên (có thể âm); ném lỗi nếu thiếu hoặc sai định dạng. */
const moneyValue = (value: string | undefined, field: string): string => {
  if (value === undefined || !/^-?\d+$/.test(value)) throw new Error(`Invalid finance amount received for ${field}`);
  return value;
};
/** Chuyển DTO sự kiện của backend sang `EventSettlement`: tính tổng khấu trừ (phí nền tảng cộng hoàn tiền) và chuẩn hóa điều kiện rút tiền theo từng loại. */
const toEventSettlement = (dto: OrganizerEventDto): EventSettlement => ({
  eventId: dto.eventId,
  eventName: dto.title,
  imageUrl: dto.imageUrl,
  eventEndAt: dto.endAt,
  grossAmount: moneyValue(dto.grossCollected, "grossCollected"),
  deductions: String(BigInt(moneyValue(dto.platformFees, "platformFees")) + BigInt(moneyValue(dto.refunds, "refunds"))),
  platformFees: moneyValue(dto.platformFees, "platformFees"),
  refunds: moneyValue(dto.refunds, "refunds"),
  paidAmount: moneyValue(dto.paidAmount, "paidAmount"),
  heldAmount: moneyValue(dto.heldAmount, "heldAmount"),
  availableAmount: moneyValue(dto.availableAmount, "availableAmount"),
  settlementStatus: dto.reconciliationStatus || "UNKNOWN",
  eligible: dto.eligibility?.eligible === true,
  reasonCodes: dto.eligibility?.reasonCodes || [],
  eligibilityByType: dto.eligibilityByType ? Object.fromEntries(
    Object.entries(dto.eligibilityByType).map(([type, eligibility]) => [type, {
      eligible: eligibility?.eligible === true,
      reasonCodes: eligibility?.reasonCodes || [],
    }]),
  ) as EventSettlement["eligibilityByType"] : undefined,
  maximumAdvanceAmount: dto.maximumAdvanceAmount,
});

/** DTO một mốc trong dòng thời gian của yêu cầu rút tiền (backend có thể dùng `occurredAt` hoặc `at`). */
interface OrganizerPayoutTimelineDto {
  status?: string;
  occurredAt?: string;
  at?: string;
  publicMessage?: string;
  reason?: string;
}
/** DTO chi tiết yêu cầu rút tiền của người tổ chức; thông tin tài khoản có thể nằm ở nhiều trường khác nhau tùy phiên bản backend. */
interface OrganizerPayoutDetailDto extends Omit<PayoutResponse, "timeline" | "accountSnapshot"> {
  timeline?: OrganizerPayoutTimelineDto[];
  accountSnapshot?: PayoutAccountSnapshot;
  account?: Partial<PayoutAccountSnapshot>;
  bankName?: string;
  accountNumberMasked?: string;
  accountHolder?: string;
  receiptUrl?: string;
}

export const payoutApi = {
  /** Lấy số liệu phân tích tài chính theo khoảng ngày (và sự kiện tùy chọn); kiểm tra các số tiền trong chuỗi dữ liệu là số nguyên. */
  getOrganizerAnalytics: async (from: string, to: string, eventId?: string): Promise<OrganizerFinanceAnalytics> => {
        const raw = await axiosClient.get(`/payouts/organizer/analytics${queryString({ from, to, eventId })}`) as unknown as OrganizerFinanceAnalytics & { refundDateNote?: string };
    if (!raw || !Array.isArray(raw.series)) throw new Error("Invalid organizer finance analytics response");
    return {
      ...raw,
        refundDataNote: raw.refundDataNote || raw.refundDateNote,
      series: raw.series.map((item) => {
        if (!item || !/^\d+$/.test(String(item.grossAmount)) || !/^\d+$/.test(String(item.refundAmount))) {
          throw new Error("Invalid organizer finance analytics amount");
        }
        return { ...item, grossAmount: String(item.grossAmount), refundAmount: String(item.refundAmount) };
      }),
    };
  },

  /** Lấy tổng quan tài chính của người tổ chức, kiểm tra từng số tiền là chuỗi số nguyên. */
  getOrganizerSummary: async (): Promise<FinanceSummary> => {
    const dto = (await axiosClient.get("/payouts/organizer/summary")) as unknown as OrganizerFinanceDto;
    return {
      collectedRevenue: moneyValue(dto.grossCollected, "grossCollected"),
      availableAmount: moneyValue(dto.availableAmount, "availableAmount"),
      processingAmount: moneyValue(dto.processingAmount, "processingAmount"),
      paidAmount: moneyValue(dto.paidAmount, "paidAmount"),
      updatedAt: dto.updatedAt || "",
    };
  },

  /** Lấy danh sách đối soát theo sự kiện của người tổ chức; backend trả về mảng nên được bọc thành một trang duy nhất. */
  getOrganizerEvents: async (filters: PayoutListFilters = {}): Promise<PayoutPage<EventSettlement>> => {
    const response = await axiosClient.get(`/payouts/organizer/events${queryString(filters)}`);
    if (!Array.isArray(response)) throw new Error("Invalid event settlement response");
    const content = (response as unknown as OrganizerEventDto[]).map(toEventSettlement);
    return { content, page: 0, size: content.length, totalElements: content.length, totalPages: 1 };
  },

  /** Lấy các sự kiện của người tổ chức có thể yêu cầu rút tiền. */
  getEligibleEvents: async (): Promise<EventSettlement[]> => {
    const response = await axiosClient.get("/payouts/organizer/eligible-events");
    if (!Array.isArray(response)) throw new Error("Invalid eligible events response");
    return (response as unknown as OrganizerEventDto[]).map(toEventSettlement);
  },

  /** Lấy danh sách yêu cầu rút tiền của người tổ chức; chấp nhận cả phản hồi dạng mảng lẫn dạng phân trang. */
  getOrganizerPayouts: async (filters: PayoutListFilters = {}): Promise<PayoutPage<PayoutResponse> | PayoutResponse[]> => {
    const response = await axiosClient.get(`/payouts/organizer${queryString(filters)}`);
    if (Array.isArray(response)) return response as unknown as PayoutResponse[];
    return response as unknown as PayoutPage<PayoutResponse>;
  },

  /** Lấy chi tiết một yêu cầu rút tiền của người tổ chức, chuẩn hóa dòng thời gian, thông tin tài khoản (đã che số) và các hành động được phép. */
  getOrganizerPayout: async (id: string): Promise<PayoutDetail> => {
    const response = (await axiosClient.get(`/payouts/organizer/${encodeURIComponent(id)}`)) as unknown as OrganizerPayoutDetailDto;
    const timeline = (response.timeline || []).map((entry) => ({
      status: entry.status || "",
      occurredAt: entry.occurredAt || entry.at || "",
      publicMessage: entry.publicMessage || entry.reason,
    })).filter((entry) => !Number.isNaN(Date.parse(entry.occurredAt)));
    const rawAccount = response.accountSnapshot || response.account;
    const accountSnapshot = rawAccount || (response.bankNameSnapshot || response.bankName || response.maskedAccountNumber || response.accountNumberMasked ? {
      bankName: response.bankNameSnapshot || response.bankName || "",
      accountNumberMasked: response.maskedAccountNumber || response.accountNumberMasked || "••••",
      accountHolder: response.accountHolderSnapshot || response.accountHolder || "",
    } : undefined);
    return {
      ...response,
      accountSnapshot: accountSnapshot ? {
        bankName: accountSnapshot.bankName || "",
        accountNumberMasked: accountSnapshot.accountNumberMasked || "••••",
        accountHolder: accountSnapshot.accountHolder || "",
      } : undefined,
      allowedActions: response.allowedActions || (response.canCancel ? ["CANCEL"] : []),
      timeline,
      transactionReference: response.transferReference,
      receiptUrl: response.receiptUrl,
    };
  },

  /** Yêu cầu báo giá rút tiền cho sự kiện theo loại và số tiền mong muốn; đổi tên trường số tài khoản che cho khớp kiểu phía giao diện. */
  getPayoutQuote: async (eventId: string, type: PayoutType, requestedAmount?: string): Promise<PayoutQuote> => {
    const response = (await axiosClient.post("/payouts/organizer/quote", { eventId, type, requestedAmount })) as unknown as PayoutQuote & { account?: { accountHolder: string; maskedAccountNumber: string; bankName: string } };
    return {
      ...response,
      account: response.account ? { accountHolder: response.account.accountHolder, accountNumberMasked: response.account.maskedAccountNumber, bankName: response.account.bankName } : undefined,
    };
  },

  /** Gửi yêu cầu rút tiền dựa trên báo giá và phiên bản tài khoản; header `Idempotency-Key` giúp tránh tạo trùng khi gửi lại. */
  requestPayout: async (eventId: string, type: PayoutType, quoteId: string, accountVersion: string | number, requestAmount: string, idempotencyKey: string): Promise<PayoutResponse> => {
    const response = await axiosClient.post(
      "/payouts/organizer/request",
      { eventId, type, quoteId, accountVersion, requestedAmount: requestAmount },
      { headers: { "Idempotency-Key": idempotencyKey } },
    );
    return response as unknown as PayoutResponse;
  },

  /** Tra cứu yêu cầu rút tiền đã tạo theo khóa idempotency (dùng để khôi phục khi mất phản hồi). */
  lookupPayoutByKey: async (idempotencyKey: string): Promise<PayoutResponse | null> => {
    const response = await axiosClient.get(`/payouts/organizer/requests/by-key/${encodeURIComponent(idempotencyKey)}`);
    return response as unknown as PayoutResponse;
  },

  /** Hủy yêu cầu rút tiền của người tổ chức. */
  cancelPayout: async (id: string): Promise<PayoutResponse> =>
    (await axiosClient.post(`/payouts/organizer/${encodeURIComponent(id)}/cancel`)) as unknown as PayoutResponse,

  // Các endpoint admin có sẵn. Giữ kiểu phản hồi dùng chung trong lúc màn hình admin đang được chuyển đổi.
  /** Lấy các yêu cầu rút tiền đang chờ admin duyệt (trả về mảng rỗng nếu phản hồi không phải mảng). */
  getPendingPayouts: async (): Promise<PayoutResponse[]> => {
    const response = await axiosClient.get("/payouts/admin/pending");
    return Array.isArray(response) ? (response as unknown as PayoutResponse[]) : [];
  },
  /** Lấy toàn bộ yêu cầu rút tiền cho admin (mảng rỗng nếu phản hồi không phải mảng). */
  getAllAdminPayouts: async (): Promise<PayoutResponse[]> => {
    const response = await axiosClient.get("/payouts/admin/all");
    return Array.isArray(response) ? (response as unknown as PayoutResponse[]) : [];
  },
  /** Admin duyệt một yêu cầu rút tiền. */
  approvePayout: async (payoutId: string): Promise<PayoutResponse> =>
    (await axiosClient.post(`/payouts/admin/${payoutId}/approve`)) as unknown as PayoutResponse,
  /** Admin chuyển yêu cầu rút tiền sang trạng thái tranh chấp, kèm lý do tùy chọn. */
  disputePayout: async (payoutId: string, reason?: string): Promise<PayoutResponse> =>
    (await axiosClient.post(`/payouts/admin/${payoutId}/dispute`, { reason })) as unknown as PayoutResponse,
  /** Admin mở lại yêu cầu rút tiền đã bị tranh chấp hoặc từ chối. */
  reopenPayout: async (payoutId: string): Promise<PayoutResponse> =>
    (await axiosClient.post(`/payouts/admin/${payoutId}/reopen`)) as unknown as PayoutResponse,
  /** Admin từ chối yêu cầu rút tiền (bản không kèm lý do). */
  rejectPayout: async (payoutId: string): Promise<PayoutResponse> =>
    (await axiosClient.post(`/payouts/admin/${payoutId}/reject`)) as unknown as PayoutResponse,

  /** Lấy chi tiết yêu cầu rút tiền cho admin; gộp các tên trường khác nhau và che số tài khoản (chỉ giữ 4 số cuối) trước khi trả về. */
  getAdminPayout: async (payoutId: string): Promise<AdminPayoutDetail> => {
    const raw = await axiosClient.get(`/payouts/admin/${encodeURIComponent(payoutId)}`) as unknown as Record<string, unknown>;
    const payout = raw.payout && typeof raw.payout === "object" ? raw.payout as Record<string, unknown> : raw;
    const rawAccount = payout.accountSnapshot && typeof payout.accountSnapshot === "object" ? payout.accountSnapshot as Record<string, unknown> : payout;
    const accountNumber = String(rawAccount.maskedAccountNumber || rawAccount.accountNumber || payout.maskedAccountNumber || payout.accountNumber || "");
    const maskedNumber = accountNumber.includes("*") || accountNumber.includes("•") ? accountNumber : accountNumber ? `•••• ${accountNumber.slice(-4)}` : "";
    const safePayout = { ...payout };
    delete safePayout.accountNumber;
    delete safePayout.accountSnapshot;
    return {
      ...safePayout,
      eventName: String(raw.eventName || payout.eventName || ""),
      requestType: payout.requestType as string | undefined,
      transferReference: payout.transferReference || payout.transactionReference,
      receiptUrl: payout.receiptUrl || payout.transferReceiptUrl,
      payoutAccountVerified: Boolean(payout.accountVerified ?? payout.payoutAccountVerified),
      accountSnapshot: {
        bankName: String(rawAccount.bankNameSnapshot || rawAccount.bankName || payout.bankNameSnapshot || payout.bankName || ""),
        accountHolder: String(rawAccount.accountHolderSnapshot || rawAccount.accountHolder || payout.accountHolderSnapshot || payout.accountHolder || ""),
        accountNumberMasked: maskedNumber,
      },
    } as unknown as AdminPayoutDetail;
  },
  /** Lấy hàng đợi yêu cầu rút tiền của admin (mảng rỗng nếu phản hồi không phải mảng). */
  getAdminPayoutQueue: async (): Promise<AdminPayoutRow[]> => {
    const response = await axiosClient.get("/payouts/admin/all");
    return Array.isArray(response) ? response as unknown as AdminPayoutRow[] : [];
  },
  /** Lấy tổng quan tài chính toàn nền tảng cho admin. */
  getAdminFinanceSummary: async (): Promise<AdminFinanceSummary> =>
    (await axiosClient.get("/payouts/admin/summary")) as unknown as AdminFinanceSummary,
  /** Admin từ chối yêu cầu rút tiền và bắt buộc nêu lý do. */
  rejectAdminPayout: async (payoutId: string, reason: string): Promise<AdminPayoutDetail> =>
    (await axiosClient.post(`/payouts/admin/${encodeURIComponent(payoutId)}/reject`, { reason })) as unknown as AdminPayoutDetail,
  /** Admin bắt đầu quá trình giải ngân cho yêu cầu rút tiền. */
  startAdminDisbursement: async (payoutId: string): Promise<AdminPayoutDetail> =>
    (await axiosClient.post(`/payouts/admin/${encodeURIComponent(payoutId)}/start`)) as unknown as AdminPayoutDetail,
  /** Admin ghi nhận đã giải ngân xong: mã giao dịch, thời điểm chuyển và biên lai tùy chọn. */
  recordAdminDisbursement: async (payoutId: string, data: { reference: string; transferredAt: string; receiptUrl?: string }): Promise<AdminPayoutDetail> =>
    (await axiosClient.post(`/payouts/admin/${encodeURIComponent(payoutId)}/complete`, data)) as unknown as AdminPayoutDetail,
  /** Lấy chính sách ứng trước tiền hiện hành. */
  getAdminAdvancePolicy: async (): Promise<AdminAdvancePolicy> =>
    (await axiosClient.get("/payouts/admin/policy")) as unknown as AdminAdvancePolicy,
  /** Lưu chính sách ứng trước tiền; cần `version` hiện tại (kiểm soát ghi đồng thời) và lý do thay đổi. */
  saveAdminAdvancePolicy: async (data: { advanceRate: number; enabled: boolean; processingTime?: string; version: number; reason: string }): Promise<AdminAdvancePolicy> =>
    (await axiosClient.put("/payouts/admin/policy", data)) as unknown as AdminAdvancePolicy,
  /** Lấy danh sách các ngoại lệ chính sách ứng trước theo tổ chức hoặc sự kiện. */
  getAdminPolicyOverrides: async (): Promise<AdminPolicyOverride[]> =>
    (await axiosClient.get("/payouts/admin/policy/overrides")) as unknown as AdminPolicyOverride[],
  /** Lấy ngoại lệ chính sách ứng trước của một tổ chức hoặc một sự kiện. */
  getAdminPolicyOverride: async (scope: "ORGANIZER" | "EVENT", targetId: string): Promise<AdminPolicyOverride> =>
    (await axiosClient.get(`/payouts/admin/policy/overrides/${scope}/${encodeURIComponent(targetId)}`)) as unknown as AdminPolicyOverride,
  /** Lưu ngoại lệ chính sách ứng trước cho một tổ chức hoặc sự kiện; cần `version` và lý do. */
  saveAdminPolicyOverride: async (scope: "ORGANIZER" | "EVENT", targetId: string, data: { advanceRate: number; enabled: boolean; version: number; reason: string }): Promise<AdminPolicyOverride> =>
    (await axiosClient.put(`/payouts/admin/policy/overrides/${scope}/${encodeURIComponent(targetId)}`, data)) as unknown as AdminPolicyOverride,
  /** Xóa ngoại lệ chính sách ứng trước của một tổ chức hoặc sự kiện, kèm lý do. */
  deleteAdminPolicyOverride: async (scope: "ORGANIZER" | "EVENT", targetId: string, reason: string): Promise<void> =>
    await axiosClient.delete(`/payouts/admin/policy/overrides/${scope}/${encodeURIComponent(targetId)}?reason=${encodeURIComponent(reason)}`),
  /** Lấy nhật ký kiểm toán các thay đổi chính sách ứng trước. */
  getAdminPolicyAudit: async (): Promise<AdminPolicyAuditEntry[]> =>
    (await axiosClient.get("/payouts/admin/policy/audit")) as unknown as AdminPolicyAuditEntry[],
  /** Admin xác nhận đối soát cho một sự kiện. */
  confirmAdminReconciliation: async (eventId: string, data: AdminReconciliationRequest): Promise<AdminReconciliationResponse> =>
    (await axiosClient.put(`/payouts/admin/events/${encodeURIComponent(eventId)}/reconciliation`, data)) as unknown as AdminReconciliationResponse,
  /** Lấy hàng đợi sự kiện cần đối soát; nếu thiếu `reconciliationStatus` thì dùng `status`, mặc định `NEEDS_RECONCILIATION`. */
  getAdminReconciliationQueue: async (): Promise<AdminReconciliationQueueItem[]> => {
    const response = await axiosClient.get("/payouts/admin/events/reconciliation");
    return Array.isArray(response) ? (response as unknown as (AdminReconciliationQueueItem & { status?: string })[]).map((item) => ({
      ...item,
      reconciliationStatus: item.reconciliationStatus || item.status || "NEEDS_RECONCILIATION",
    })) : [];
  },
  /** Admin xác minh tài khoản nhận tiền của một người tổ chức bằng mã tham chiếu xác minh. */
  verifyAdminPayoutAccount: async (organizerId: string, verificationReference: string): Promise<void> => {
    await axiosClient.put(`/payouts/admin/organizers/${encodeURIComponent(organizerId)}/payout-account/verify`, { verificationReference });
  },
};
