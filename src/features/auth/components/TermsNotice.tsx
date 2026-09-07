import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
const TERMS_URL = "https://ticketbox.vn/customer-terms-of-use";
const PRIVACY_URL = "https://ticketbox.vn/information-privacy-policy";

export default function TermsNotice() {
  useTranslation();
  return (
    <p className="auth-terms">
      {translate("Bằng việc tiếp tục, bạn đã đọc và đồng ý với")}{" "}{" "}
      <a href={TERMS_URL} target="_blank" rel="noreferrer">
        {translate("Điều khoản sử dụng")}</a>{" "}
      {translate("và")}{" "}{" "}
      <a href={PRIVACY_URL} target="_blank" rel="noreferrer">
        {translate("Chính sách bảo mật thông tin cá nhân")}</a>{" "}
      {translate("của HaloTicket.")}</p>
  );
}
