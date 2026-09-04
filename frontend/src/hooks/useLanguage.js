import { useLanguageContext } from "../context/LanguageContext";

export const useLanguage = () => {
  return useLanguageContext();
};

export default useLanguage;
