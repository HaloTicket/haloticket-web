import { FiCheckCircle, FiXCircle } from "react-icons/fi";

import { getPasswordRules } from "@/features/auth/passwordRules";

interface PasswordRequirementsProps { password: string; }

const requirements = [
  { key: "hasValidLength", label: "Từ 8 - 32 ký tự" },
  { key: "hasLowercaseAndNumber", label: "Bao gồm chữ thường và số" },
  { key: "hasSpecialCharacter", label: "Bao gồm ký tự đặc biệt (!, $, @, %, ...)" },
  { key: "hasUppercase", label: "Có ít nhất 1 ký tự in hoa" },
] as const;

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const rules = getPasswordRules(password);
  const isValid = Object.values(rules).every(Boolean);
  return (
    <section aria-label="Yêu cầu mật khẩu" className={`rounded-xl border p-4 ${isValid ? "app-border-success app-bg-success-soft" : "app-border-danger app-bg-danger-soft"}`}>
      <p className={`flex items-center gap-2 font-semibold ${isValid ? "app-text-success" : "app-text-danger"}`}>
        {isValid ? <FiCheckCircle aria-hidden="true" /> : <FiXCircle aria-hidden="true" />}
        {isValid ? "Mật khẩu hợp lệ" : "Mật khẩu chưa hợp lệ"}
      </p>
      <ul className="mt-3 space-y-2 text-sm app-text-main">
        {requirements.map((requirement) => {
          const isMet = rules[requirement.key];
          return <li className="flex items-center gap-2" key={requirement.key}>
            {isMet ? <FiCheckCircle aria-hidden="true" className="app-text-success shrink-0" /> : <FiXCircle aria-hidden="true" className="app-text-danger shrink-0" />}
            <span className={isMet ? "app-text-success" : undefined}>{requirement.label}</span>
          </li>;
        })}
      </ul>
    </section>
  );
}
