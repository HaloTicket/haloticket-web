export interface VoucherItem {
  id: string;
  title: string;
  code: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}
