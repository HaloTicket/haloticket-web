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
    <section aria-label="Yêu cầu mật khẩu" className={`rounded-xl border p-4 ${isValid ? "border-green-300 bg-green-50 dark:border-green-900/80 dark:bg-green-950/20" : "border-red-300 bg-red-50 dark:border-red-900/80 dark:bg-red-950/20"}`}>
      <p className={`flex items-center gap-2 font-semibold ${isValid ? "text-green-700 dark:text-green-300" : "text-red-600 dark:text-red-400"}`}>
        {isValid ? <FiCheckCircle aria-hidden="true" /> : <FiXCircle aria-hidden="true" />}
        {isValid ? "Mật khẩu hợp lệ" : "Mật khẩu chưa hợp lệ"}
      </p>
      <ul className="mt-3 space-y-2 text-sm app-text-main">
        {requirements.map((requirement) => {
          const isMet = rules[requirement.key];
          return <li className="flex items-center gap-2" key={requirement.key}>
            {isMet ? <FiCheckCircle aria-hidden="true" className="shrink-0 text-green-600 dark:text-green-400" /> : <FiXCircle aria-hidden="true" className="shrink-0 text-red-500" />}
            <span className={isMet ? "text-green-700 dark:text-green-300" : undefined}>{requirement.label}</span>
          </li>;
        })}
      </ul>
    </section>
  );
}
