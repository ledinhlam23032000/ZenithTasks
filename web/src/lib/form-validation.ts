type ValidatableField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** Dịch thông báo xác thực HTML5 mặc định (tiếng Anh, "Please fill out this field") sang tiếng Việt. */
export function vnValidityMessage(el: ValidatableField): string {
  const v = el.validity;
  if (v.valueMissing) return "Vui lòng nhập thông tin này.";
  if (v.typeMismatch) return el instanceof HTMLInputElement && el.type === "email" ? "Vui lòng nhập đúng định dạng email." : "Định dạng không hợp lệ.";
  if (v.tooShort && !(el instanceof HTMLSelectElement)) return `Vui lòng nhập ít nhất ${el.minLength} ký tự.`;
  if (v.tooLong && !(el instanceof HTMLSelectElement)) return `Vui lòng nhập không quá ${el.maxLength} ký tự.`;
  if (v.rangeUnderflow) return "Giá trị quá nhỏ.";
  if (v.rangeOverflow) return "Giá trị quá lớn.";
  if (v.stepMismatch || v.badInput) return "Giá trị không hợp lệ.";
  if (v.patternMismatch) return "Định dạng không đúng yêu cầu.";
  return "Thông tin không hợp lệ.";
}

export function handleVnInvalid(e: React.InvalidEvent<ValidatableField>): void {
  e.currentTarget.setCustomValidity(vnValidityMessage(e.currentTarget));
}

export function clearVnValidity(e: React.SyntheticEvent<ValidatableField>): void {
  e.currentTarget.setCustomValidity("");
}
