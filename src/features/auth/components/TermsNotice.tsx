const TERMS_URL = "https://ticketbox.vn/customer-terms-of-use";
const PRIVACY_URL = "https://ticketbox.vn/information-privacy-policy";

export default function TermsNotice() {
  return (
    <p className="auth-terms">
      Bằng việc tiếp tục, bạn đã đọc và đồng ý với{" "}
      <a href={TERMS_URL} target="_blank" rel="noreferrer">
        Điều khoản sử dụng
      </a>{" "}
      và{" "}
      <a href={PRIVACY_URL} target="_blank" rel="noreferrer">
        Chính sách bảo mật thông tin cá nhân
      </a>{" "}
      của HaloTicket.
    </p>
  );
}
