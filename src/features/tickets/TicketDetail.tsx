import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
import { useParams } from "react-router-dom";

export default function TicketDetail() {
  useTranslation();
  const { id } = useParams<{ id: string }>();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">{translate("Trang Chi Tiết Vé #")}{id}</h1>
    </div>
  );
}
