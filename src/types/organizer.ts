export interface TicketItem {
  id: string;
  name: string;
  price: number;
  isFree: boolean;
  totalQuantity: number;
  minPerOrder: number;
  maxPerOrder: number;
  startSaleDate: string;
  endSaleDate: string;
  description: string;
  image?: string | null;
}

export interface CustomQuestionItem {
  id: string;
  title: string;
  description: string;
  type: string;
  isRequired: boolean;
}
