/** Kết quả kiểm tra từng quy tắc mật khẩu: độ dài, chữ thường kèm số, ký tự đặc biệt và chữ hoa. */
export interface PasswordRules {
  hasValidLength: boolean;
  hasLowercaseAndNumber: boolean;
  hasSpecialCharacter: boolean;
  hasUppercase: boolean;
}

const specialCharacterPattern = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;

/**
 * Kiểm tra mật khẩu theo từng quy tắc: dài 8 đến 32 ký tự, có chữ thường và số, có ký tự đặc biệt, có chữ hoa.
 *
 * @param password - Mật khẩu cần kiểm tra.
 */
export function getPasswordRules(password: string): PasswordRules {
  return {
    hasValidLength: password.length >= 8 && password.length <= 32,
    hasLowercaseAndNumber: /[a-z]/.test(password) && /\d/.test(password),
    hasSpecialCharacter: specialCharacterPattern.test(password),
    hasUppercase: /[A-Z]/.test(password),
  };
}

/** Mật khẩu hợp lệ khi thỏa mọi quy tắc. */
export function isPasswordValid(password: string): boolean {
  return Object.values(getPasswordRules(password)).every(Boolean);
}
