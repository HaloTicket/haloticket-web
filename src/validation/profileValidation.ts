import { t as translate } from "@/i18n";
import type { UserProfileUpdateRequest } from "@/services/userApi";

export interface ProfileFieldErrors {
  fullName?: string;
  phoneNumber?: string;
  gender?: string;
}

/**
 * Validate họ tên: không được rỗng
 */
function validateFullName(fullName: string): string | undefined {
  if (!fullName.trim()) {
    return translate("Vui lòng nhập họ tên đầy đủ");
  }
  return undefined;
}

/**
 * Validate SĐT: bắt buộc + định dạng số điện thoại VN (+84)
 * Hợp lệ: 0[3-9]xxxxxxxx (10 số) hoặc 84[3-9]xxxxxxxx (11 số không có +)
 */
function validatePhoneNumber(phoneNumber: string): string | undefined {
  const raw = phoneNumber.replace(/\s|-/g, "");
  if (!raw) {
    return translate("Vui lòng nhập Số điện thoại (+84)");
  }
  // Hỗ trợ tất cả đầu số Việt Nam:
  //   03x — Viettel
  //   05x — Vietnamobile (052, 056, 058), Gmobile (059), Reddi (055)
  //   07x — Mobifone (070, 076, 077, 078, 079)
  //   08x — Vinaphone (081-085, 088), Mobifone (089), Viettel (086)
  //   09x — Viettel (096, 097, 098), Mobifone (090, 093), Vinaphone (091, 094), Vietnamobile (092), Gmobile (099)
  // Định dạng: 0[35789]xxxxxxxx (10 số) hoặc +84/84[35789]xxxxxxxx
  const VN_PHONE_REGEX = /^(\+?84|0)[35789]\d{8}$/;
  if (!VN_PHONE_REGEX.test(raw)) {
    return translate("Số điện thoại không hợp lệ (VD: 09x, 08x, 07x, 05x, 03x)");
  }
  return undefined;
}


/**
 * Validate giới tính: bắt buộc chọn
 */
function validateGender(gender: string | undefined): string | undefined {
  if (!gender) {
    return translate("Vui lòng chọn Giới tính");
  }
  return undefined;
}

/**
 * Validate toàn bộ profile form
 * @returns object chứa các lỗi, rỗng nếu hợp lệ
 */
export function validateProfileForm(data: UserProfileUpdateRequest): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};

  const fullNameError = validateFullName(data.fullName);
  if (fullNameError) errors.fullName = fullNameError;

  const phoneError = validatePhoneNumber(data.phoneNumber ?? "");
  if (phoneError) errors.phoneNumber = phoneError;

  const genderError = validateGender(data.gender);
  if (genderError) errors.gender = genderError;

  return errors;
}

/**
 * Kiểm tra object errors có lỗi không
 */
export function hasProfileErrors(errors: ProfileFieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}
