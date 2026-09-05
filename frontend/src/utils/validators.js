export const validators = {
  isValidMobile: (mobile) => /^[+]?[0-9]{10,15}$/.test(String(mobile || "").trim()),
  isValidEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim()),
  isValidOtp: (otp) => /^[0-9]{4,8}$/.test(String(otp || "").trim()),
  isValidBookFile: (file) => {
    if (!file) return { valid: false, error: "Please select a file." };
    const allowed = [".pdf", ".docx", ".doc", ".txt", ".jpg", ".jpeg", ".png", ".webp"];
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!allowed.includes(ext)) {
      return { valid: false, error: "Unsupported file format. Please upload PDF, DOCX, TXT, or Image." };
    }
    if (file.size > 50 * 1024 * 1024) {
      return { valid: false, error: "File exceeds maximum size of 50MB." };
    }
    return { valid: true };
  }
};
