export interface SeatTier {
  id: string;
  name: string;
  price: number;
  color: string;
}

export interface Seat {
  id: string;
  row: string;
  col: number;
  tierId: string;
  status: "AVAILABLE" | "RESERVED" | "SOLD" | "BLOCKED";
}
