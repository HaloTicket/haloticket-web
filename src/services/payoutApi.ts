import axiosClient from "./axiosClient";
import type { PayoutResponse } from "@/types";

const DEFAULT_MOCK_PAYOUTS: PayoutResponse[] = [
  {
    id: "PAY-8F2A91D0-01",
    eventId: "The Eras Tour - Hanoi",
    organizerUserId: "org-001",
    grossAmount: 500000000,
    platformFee: 25000000,
    netAmount: 475000000,
    status: "PENDING",
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  },
  {
    id: "PAY-3C7B194E-02",
    eventId: "Rap Viet All-Star Live Concert",
    organizerUserId: "org-002",
    grossAmount: 120000000,
    platformFee: 6000000,
    netAmount: 114000000,
    status: "COMPLETED",
    transferredAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "PAY-9E4F51A2-03",
    eventId: "Monsoon Music Festival 2026",
    organizerUserId: "org-001",
    grossAmount: 850000000,
    platformFee: 42500000,
    netAmount: 807500000,
    status: "COMPLETED",
    transferredAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "PAY-1A8D99FF-04",
    eventId: "EDM Symphony Saigon 2026",
    organizerUserId: "org-003",
    grossAmount: 80000000,
    platformFee: 4000000,
    netAmount: 76000000,
    status: "DISPUTE",
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
];

const DEFAULT_ELIGIBLE_EVENTS = [
  {
    eventId: "EVT-123",
    eventName: "The Eras Tour - Hanoi",
    totalRevenue: 500000000,
    platformFeeRate: 0.05,
    netAmount: 475000000,
    image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&q=80",
    ticketCount: 1250,
  },
  {
    eventId: "EVT-456",
    eventName: "Rap Viet All-Star Live Concert",
    totalRevenue: 120000000,
    platformFeeRate: 0.05,
    netAmount: 114000000,
    image: "https://images.unsplash.com/photo-1470229722913-7c090be103f6?w=600&q=80",
    ticketCount: 450,
  },
  {
    eventId: "EVT-789",
    eventName: "Monsoon Music Festival 2026",
    totalRevenue: 850000000,
    platformFeeRate: 0.05,
    netAmount: 807500000,
    image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&q=80",
    ticketCount: 1800,
  },
];

const getStoredPayouts = (): PayoutResponse[] => {
  try {
    const raw = localStorage.getItem("haloticket_mock_payouts");
    if (raw) return JSON.parse(raw);
    localStorage.setItem("haloticket_mock_payouts", JSON.stringify(DEFAULT_MOCK_PAYOUTS));
    return DEFAULT_MOCK_PAYOUTS;
  } catch {
    return DEFAULT_MOCK_PAYOUTS;
  }
};

const updateStoredPayouts = (list: PayoutResponse[]) => {
  try {
    localStorage.setItem("haloticket_mock_payouts", JSON.stringify(list));
  } catch (e) {
    console.error(e);
  }
};

export const payoutApi = {
  getPendingPayouts: async (): Promise<PayoutResponse[]> => {
    try {
      const response = await axiosClient.get("/payouts/admin/pending");
      const list = (response as unknown) as PayoutResponse[];
      if (Array.isArray(list) && list.length > 0) return list;
    } catch (err) {
      console.warn("Using sample pending payouts for UI testing:", err);
    }
    return getStoredPayouts().filter(p => p.status === 'PENDING');
  },

  getAllAdminPayouts: async (): Promise<PayoutResponse[]> => {
    try {
      const response = await axiosClient.get("/payouts/admin/all");
      const list = (response as unknown) as PayoutResponse[];
      if (Array.isArray(list) && list.length > 0) return list;
    } catch (err) {
      console.warn("Using sample admin payouts for UI testing:", err);
    }
    return getStoredPayouts();
  },

  approvePayout: async (payoutId: string): Promise<PayoutResponse> => {
    let result: PayoutResponse | null = null;
    try {
      const response = await axiosClient.post(`/payouts/admin/${payoutId}/approve`);
      result = (response as unknown) as PayoutResponse;
    } catch (err) {
      console.warn("Simulating approvePayout for UI testing:", err);
    }

    const current = getStoredPayouts();
    const updated = current.map(p => {
      if (p.id === payoutId) {
        return {
          ...p,
          status: 'COMPLETED' as const,
          transferredAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    });
    updateStoredPayouts(updated);

    return result || (updated.find(p => p.id === payoutId) as PayoutResponse) || {
      id: payoutId,
      eventId: "Event",
      organizerUserId: "org-001",
      grossAmount: 100000000,
      platformFee: 5000000,
      netAmount: 95000000,
      status: "COMPLETED",
      transferredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  disputePayout: async (payoutId: string, reason?: string): Promise<PayoutResponse> => {
    let result: PayoutResponse | null = null;
    try {
      const response = await axiosClient.post(`/payouts/admin/${payoutId}/dispute`, { reason });
      result = (response as unknown) as PayoutResponse;
    } catch (err) {
      console.warn("Simulating disputePayout for UI testing:", err);
    }

    const current = getStoredPayouts();
    const updated = current.map(p => {
      if (p.id === payoutId) {
        return {
          ...p,
          status: 'DISPUTE' as const,
          disputeReason: reason || "Yêu cầu rà soát bổ sung chứng từ sự kiện",
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    });
    updateStoredPayouts(updated);

    return result || (updated.find(p => p.id === payoutId) as PayoutResponse);
  },

  reopenPayout: async (payoutId: string): Promise<PayoutResponse> => {
    let result: PayoutResponse | null = null;
    try {
      const response = await axiosClient.post(`/payouts/admin/${payoutId}/reopen`);
      result = (response as unknown) as PayoutResponse;
    } catch (err) {
      console.warn("Simulating reopenPayout for UI testing:", err);
    }

    const current = getStoredPayouts();
    const updated = current.map(p => {
      if (p.id === payoutId) {
        return {
          ...p,
          status: 'PENDING' as const,
          disputeReason: undefined,
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    });
    updateStoredPayouts(updated);

    return result || (updated.find(p => p.id === payoutId) as PayoutResponse);
  },

  getOrganizerPayouts: async (): Promise<PayoutResponse[]> => {
    try {
      const response = await axiosClient.get(`/payouts/organizer`);
      const list = (response as unknown) as PayoutResponse[];
      if (Array.isArray(list) && list.length > 0) return list;
    } catch (err) {
      console.warn("Using sample organizer payouts for UI testing:", err);
    }
    return getStoredPayouts();
  },

  getEligibleEvents: async (): Promise<any[]> => {
    try {
      const response = await axiosClient.get(`/payouts/organizer/eligible-events`);
      const list = (response as unknown) as any[];
      if (Array.isArray(list) && list.length > 0) return list;
    } catch (err) {
      console.warn("Using sample eligible events for UI testing:", err);
    }
    return DEFAULT_ELIGIBLE_EVENTS;
  },

  requestPayout: async (eventId: string, requestAmount: number, platformFeeRate: number): Promise<PayoutResponse> => {
    let result: PayoutResponse | null = null;
    try {
      const response = await axiosClient.post(`/payouts/organizer/request`, { eventId, requestAmount, platformFeeRate });
      result = (response as unknown) as PayoutResponse;
    } catch (err) {
      console.warn("Simulating requestPayout for UI testing:", err);
    }

    const newPayout: PayoutResponse = {
      id: `PAY-${Date.now().toString(16).toUpperCase()}`,
      eventId,
      organizerUserId: "org-001",
      grossAmount: requestAmount,
      platformFee: requestAmount * platformFeeRate,
      netAmount: requestAmount * (1 - platformFeeRate),
      status: "PENDING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const current = getStoredPayouts();
    updateStoredPayouts([newPayout, ...current]);

    return result || newPayout;
  }
};
