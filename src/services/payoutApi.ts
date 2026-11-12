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

export interface PayoutListFilters {
  search?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
  eventId?: string;
}

const queryString = (filters: PayoutListFilters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : "";
};

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
const moneyValue = (value: string | undefined, field: string): string => {
  if (value === undefined || !/^-?\d+$/.test(value)) throw new Error(`Invalid finance amount received for ${field}`);
  return value;
};
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

interface OrganizerPayoutTimelineDto {
  status?: string;
  occurredAt?: string;
  at?: string;
  publicMessage?: string;
  reason?: string;
}
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

  getOrganizerEvents: async (filters: PayoutListFilters = {}): Promise<PayoutPage<EventSettlement>> => {
    const response = await axiosClient.get(`/payouts/organizer/events${queryString(filters)}`);
    if (!Array.isArray(response)) throw new Error("Invalid event settlement response");
    const content = (response as unknown as OrganizerEventDto[]).map(toEventSettlement);
    return { content, page: 0, size: content.length, totalElements: content.length, totalPages: 1 };
  },

  getEligibleEvents: async (): Promise<EventSettlement[]> => {
    const response = await axiosClient.get("/payouts/organizer/eligible-events");
    if (!Array.isArray(response)) throw new Error("Invalid eligible events response");
    return (response as unknown as OrganizerEventDto[]).map(toEventSettlement);
  },

  getOrganizerPayouts: async (filters: PayoutListFilters = {}): Promise<PayoutPage<PayoutResponse> | PayoutResponse[]> => {
    const response = await axiosClient.get(`/payouts/organizer${queryString(filters)}`);
    if (Array.isArray(response)) return response as unknown as PayoutResponse[];
    return response as unknown as PayoutPage<PayoutResponse>;
  },

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

  getPayoutQuote: async (eventId: string, type: PayoutType, requestedAmount?: string): Promise<PayoutQuote> => {
    const response = (await axiosClient.post("/payouts/organizer/quote", { eventId, type, requestedAmount })) as unknown as PayoutQuote & { account?: { accountHolder: string; maskedAccountNumber: string; bankName: string } };
    return {
      ...response,
      account: response.account ? { accountHolder: response.account.accountHolder, accountNumberMasked: response.account.maskedAccountNumber, bankName: response.account.bankName } : undefined,
    };
  },

  requestPayout: async (eventId: string, type: PayoutType, quoteId: string, accountVersion: string | number, requestAmount: string, idempotencyKey: string): Promise<PayoutResponse> => {
    const response = await axiosClient.post(
      "/payouts/organizer/request",
      { eventId, type, quoteId, accountVersion, requestedAmount: requestAmount },
      { headers: { "Idempotency-Key": idempotencyKey } },
    );
    return response as unknown as PayoutResponse;
  },

  lookupPayoutByKey: async (idempotencyKey: string): Promise<PayoutResponse | null> => {
    const response = await axiosClient.get(`/payouts/organizer/requests/by-key/${encodeURIComponent(idempotencyKey)}`);
    return response as unknown as PayoutResponse;
  },

  cancelPayout: async (id: string): Promise<PayoutResponse> =>
    (await axiosClient.post(`/payouts/organizer/${encodeURIComponent(id)}/cancel`)) as unknown as PayoutResponse,

  // Existing admin endpoints. Keep them typed to the shared response while the admin screen migrates.
  getPendingPayouts: async (): Promise<PayoutResponse[]> => {
    const response = await axiosClient.get("/payouts/admin/pending");
    return Array.isArray(response) ? (response as unknown as PayoutResponse[]) : [];
  },
  getAllAdminPayouts: async (): Promise<PayoutResponse[]> => {
    const response = await axiosClient.get("/payouts/admin/all");
    return Array.isArray(response) ? (response as unknown as PayoutResponse[]) : [];
  },
  approvePayout: async (payoutId: string): Promise<PayoutResponse> =>
    (await axiosClient.post(`/payouts/admin/${payoutId}/approve`)) as unknown as PayoutResponse,
  disputePayout: async (payoutId: string, reason?: string): Promise<PayoutResponse> =>
    (await axiosClient.post(`/payouts/admin/${payoutId}/dispute`, { reason })) as unknown as PayoutResponse,
  reopenPayout: async (payoutId: string): Promise<PayoutResponse> =>
    (await axiosClient.post(`/payouts/admin/${payoutId}/reopen`)) as unknown as PayoutResponse,
  rejectPayout: async (payoutId: string): Promise<PayoutResponse> =>
    (await axiosClient.post(`/payouts/admin/${payoutId}/reject`)) as unknown as PayoutResponse,

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
  getAdminPayoutQueue: async (): Promise<AdminPayoutRow[]> => {
    const response = await axiosClient.get("/payouts/admin/all");
    return Array.isArray(response) ? response as unknown as AdminPayoutRow[] : [];
  },
  getAdminFinanceSummary: async (): Promise<AdminFinanceSummary> =>
    (await axiosClient.get("/payouts/admin/summary")) as unknown as AdminFinanceSummary,
  rejectAdminPayout: async (payoutId: string, reason: string): Promise<AdminPayoutDetail> =>
    (await axiosClient.post(`/payouts/admin/${encodeURIComponent(payoutId)}/reject`, { reason })) as unknown as AdminPayoutDetail,
  startAdminDisbursement: async (payoutId: string): Promise<AdminPayoutDetail> =>
    (await axiosClient.post(`/payouts/admin/${encodeURIComponent(payoutId)}/start`)) as unknown as AdminPayoutDetail,
  recordAdminDisbursement: async (payoutId: string, data: { reference: string; transferredAt: string; receiptUrl?: string }): Promise<AdminPayoutDetail> =>
    (await axiosClient.post(`/payouts/admin/${encodeURIComponent(payoutId)}/complete`, data)) as unknown as AdminPayoutDetail,
  getAdminAdvancePolicy: async (): Promise<AdminAdvancePolicy> =>
    (await axiosClient.get("/payouts/admin/policy")) as unknown as AdminAdvancePolicy,
  saveAdminAdvancePolicy: async (data: { advanceRate: number; enabled: boolean; processingTime?: string; version: number; reason: string }): Promise<AdminAdvancePolicy> =>
    (await axiosClient.put("/payouts/admin/policy", data)) as unknown as AdminAdvancePolicy,
  getAdminPolicyOverrides: async (): Promise<AdminPolicyOverride[]> =>
    (await axiosClient.get("/payouts/admin/policy/overrides")) as unknown as AdminPolicyOverride[],
  getAdminPolicyOverride: async (scope: "ORGANIZER" | "EVENT", targetId: string): Promise<AdminPolicyOverride> =>
    (await axiosClient.get(`/payouts/admin/policy/overrides/${scope}/${encodeURIComponent(targetId)}`)) as unknown as AdminPolicyOverride,
  saveAdminPolicyOverride: async (scope: "ORGANIZER" | "EVENT", targetId: string, data: { advanceRate: number; enabled: boolean; version: number; reason: string }): Promise<AdminPolicyOverride> =>
    (await axiosClient.put(`/payouts/admin/policy/overrides/${scope}/${encodeURIComponent(targetId)}`, data)) as unknown as AdminPolicyOverride,
  deleteAdminPolicyOverride: async (scope: "ORGANIZER" | "EVENT", targetId: string, reason: string): Promise<void> =>
    await axiosClient.delete(`/payouts/admin/policy/overrides/${scope}/${encodeURIComponent(targetId)}?reason=${encodeURIComponent(reason)}`),
  getAdminPolicyAudit: async (): Promise<AdminPolicyAuditEntry[]> =>
    (await axiosClient.get("/payouts/admin/policy/audit")) as unknown as AdminPolicyAuditEntry[],
  confirmAdminReconciliation: async (eventId: string, data: AdminReconciliationRequest): Promise<AdminReconciliationResponse> =>
    (await axiosClient.put(`/payouts/admin/events/${encodeURIComponent(eventId)}/reconciliation`, data)) as unknown as AdminReconciliationResponse,
  getAdminReconciliationQueue: async (): Promise<AdminReconciliationQueueItem[]> => {
    const response = await axiosClient.get("/payouts/admin/events/reconciliation");
    return Array.isArray(response) ? (response as unknown as (AdminReconciliationQueueItem & { status?: string })[]).map((item) => ({
      ...item,
      reconciliationStatus: item.reconciliationStatus || item.status || "NEEDS_RECONCILIATION",
    })) : [];
  },
  verifyAdminPayoutAccount: async (organizerId: string, verificationReference: string): Promise<void> => {
    await axiosClient.put(`/payouts/admin/organizers/${encodeURIComponent(organizerId)}/payout-account/verify`, { verificationReference });
  },
};
