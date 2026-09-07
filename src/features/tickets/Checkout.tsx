import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
export default function Checkout() {
  useTranslation();
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">{translate("Trang Thanh Toán")}</h1>
    </div>
  );
}
