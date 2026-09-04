export interface PasswordRules {
  hasValidLength: boolean;
  hasLowercaseAndNumber: boolean;
  hasSpecialCharacter: boolean;
  hasUppercase: boolean;
}

const specialCharacterPattern = /[^A-Za-z0-9]/;

export function getPasswordRules(password: string): PasswordRules {
  return {
    hasValidLength: password.length >= 8 && password.length <= 32,
    hasLowercaseAndNumber: /[a-z]/.test(password) && /\d/.test(password),
    hasSpecialCharacter: specialCharacterPattern.test(password),
    hasUppercase: /[A-Z]/.test(password),
  };
}

export function isPasswordValid(password: string): boolean {
  return Object.values(getPasswordRules(password)).every(Boolean);
}
