import { useTranslation } from "react-i18next";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";

import { getPasswordRules } from "@/validation/passwordRules";

interface PasswordRequirementsProps { password: string; showDetails?: boolean; }

const requirements = [
  { key: "hasValidLength", label: "Từ 8 - 32 ký tự" },
  { key: "hasLowercaseAndNumber", label: "Bao gồm chữ thường và số" },
  { key: "hasSpecialCharacter", label: "Bao gồm ký tự đặc biệt (!, $, @, %, ...)" },
  { key: "hasUppercase", label: "Có ít nhất 1 ký tự in hoa" },
] as const;

export function PasswordRequirements({ password, showDetails = true }: PasswordRequirementsProps) {
  const { t } = useTranslation();
  const rules = getPasswordRules(password);
  const isValid = Object.values(rules).every(Boolean);
  return (
    <section aria-label={t("Yêu cầu mật khẩu")} className={`auth-password-requirements rounded-xl border px-3 py-2.5 ${isValid ? "is-valid" : "is-invalid"}`}>
      <p className={`flex items-center gap-1.5 text-sm font-semibold ${isValid ? "password-rule--met" : "password-rule--unmet"}`}>
        {isValid ? <FaCheckCircle aria-hidden="true" /> : <FaTimesCircle aria-hidden="true" />}
        {isValid ? t("Mật khẩu hợp lệ") : t("Mật khẩu chưa hợp lệ")}
      </p>
      <ul className={`password-rule-details mt-2 grid grid-cols-1 gap-y-1.5 text-xs app-text-main ${showDetails ? "is-open" : ""}`} aria-hidden={!showDetails}>
        {requirements.map((requirement) => {
          const isMet = rules[requirement.key];
          return <li className={`flex items-center gap-1.5 ${isMet ? "password-rule--met" : "password-rule--unmet"}`} key={requirement.key}>
            {isMet ? <FaCheckCircle aria-hidden="true" className="shrink-0" /> : <FaTimesCircle aria-hidden="true" className="shrink-0" />}
            <span>{t(requirement.label)}</span>
          </li>;
        })}
      </ul>
    </section>
  );
}
