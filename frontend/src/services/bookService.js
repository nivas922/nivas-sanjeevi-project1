import { api } from "./api";

export const bookService = {
  uploadBook: (file, metadata, onProgress) => api.uploadTextbook(file, metadata, onProgress),
  getBooks: async () => {
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const token = localStorage.getItem("learnai_auth_token_v3");
    try {
      const res = await fetch(`${API_BASE}/books`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        return data.books || [];
      }
    } catch {}
    return JSON.parse(localStorage.getItem("learnai_textbooks_v3") || "[]");
  }
};

export default bookService;
