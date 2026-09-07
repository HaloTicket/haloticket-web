import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
export default function NotFound() {
  useTranslation();
  return (
    <div className="container mx-auto px-4 py-8 text-center">
      <h1 className="text-2xl font-bold">{translate("404 - Trang Không Tồn Tại")}</h1>
    </div>
  );
}
