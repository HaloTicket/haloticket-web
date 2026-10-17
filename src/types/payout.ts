export interface PayoutResponse {
  id: string;
  eventId: string;
  organizerUserId: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  status: 'PENDING' | 'COMPLETED' | 'DISPUTE';
  transferredAt?: string;
  disputeReason?: string;
  createdAt: string;
  updatedAt: string;
}
