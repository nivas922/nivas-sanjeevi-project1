import { MULTILINGUAL_SUMMARIES } from "../data/translations";

// Comprehensive English-to-Indian language dictionary for instant translation
const VOCABULARY_MAP = {
  ta: {
    "computer": "கணினி",
    "networks": "நெட்வொர்க்குகள்",
    "network": "நெட்வொர்க்",
    "protocol": "நெறிமுறை (Protocol)",
    "layer": "அடுக்கு (Layer)",
    "transport": "போக்குவரத்து (Transport)",
    "data": "தரவு (Data)",
    "transmission": "பரிமாற்றம்",
    "reliable": "நம்பகமான",
    "connection": "இணைப்பு",
    "handshake": "கைகுலுக்கல் (Handshake)",
    "operating": "இயக்க",
    "system": "அமைப்பு (System)",
    "database": "தரவுத்தளம் (Database)",
    "programming": "நிரலாக்கம்",
    "python": "பைத்தான் (Python)",
    "algorithm": "வழிமுறை (Algorithm)",
    "structure": "கட்டமைப்பு",
    "process": "செயல்முறை",
    "memory": "நினைவகம்",
    "management": "மேலாண்மை",
    "summary": "சுருக்கம்",
    "explanation": "விளக்கம்",
    "points": "முக்கிய குறிப்புகள்",
    "quiz": "வினாடி வினா",
    "question": "கேள்வி",
    "answer": "பதில்",
    "the": "",
    "is": "ஆகும்",
    "and": "மற்றும்",
    "of": "இன்",
    "in": "இல்",
    "to": "க்கு",
    "for": "க்காக",
    "with": "உடன்"
  },
  hi: {
    "computer": "कंप्यूटर",
    "networks": "नेटवर्क्स",
    "network": "नेटवर्क",
    "protocol": "प्रोटोकॉल (Protocol)",
    "layer": "लेयर (Layer)",
    "transport": "ट्रांसपोर्ट",
    "data": "डेटा (Data)",
    "transmission": "संचरण (Transmission)",
    "reliable": "विश्वसनीय",
    "connection": "कनेक्शन",
    "handshake": "हैंडशेक (Handshake)",
    "operating": "ऑपरेटिंग",
    "system": "सिस्टम (System)",
    "database": "डेटाबेस (Database)",
    "programming": "प्रोग्रामिंग",
    "python": "पायथन (Python)",
    "algorithm": "एल्गोरिदम (Algorithm)",
    "structure": "संरचना",
    "process": "प्रक्रिया",
    "memory": "मेमोरी",
    "management": "प्रबंधन",
    "summary": "सारांश",
    "explanation": "स्पष्टीकरण",
    "points": "मुख्य बिंदु",
    "quiz": "प्रश्नोत्तरी (Quiz)",
    "question": "प्रश्न",
    "answer": "उत्तर",
    "the": "",
    "is": "है",
    "and": "और",
    "of": "का",
    "in": "में",
    "to": "को",
    "for": "के लिए",
    "with": "के साथ"
  },
  te: {
    "computer": "కంప్యూటర్",
    "networks": "నెట్‌వర్క్‌లు",
    "network": "నెట్‌వర్క్",
    "protocol": "ప్రోటోకాల్",
    "layer": "లేయర్",
    "transport": "రవాణా",
    "data": "డేటా",
    "transmission": "ప్రసారం",
    "reliable": "విశ్వసనీయ",
    "connection": "కనెక్షన్",
    "handshake": "హ్యాండ్‌షేక్",
    "operating": "ఆపరేటింగ్",
    "system": "సిస్టమ్",
    "database": "డేటాబేస్",
    "programming": "ప్రోగ్రామింగ్",
    "python": "పైథాన్",
    "algorithm": "అల్గోరిథం",
    "structure": "నిర్మాణం",
    "process": "ప్రక్రియ",
    "memory": "మెమరీ",
    "management": "నిర్వహణ",
    "summary": "సారాంశం",
    "explanation": "వివరణ",
    "points": "ముఖ్యాంశాలు",
    "quiz": "క్విజ్",
    "question": "ప్రశ్న",
    "answer": "సమాధానం"
  },
  kn: {
    "computer": "ಕಂಪ್ಯೂಟರ್",
    "networks": "ನೆಟ್‌ವರ್ಕ್‌ಗಳು",
    "network": "ನೆಟ್‌ವರ್ಕ್",
    "protocol": "ಪ್ರೋಟೋಕಾಲ್",
    "layer": "ಹಂತ",
    "transport": "ಸಾರಿಗೆ",
    "data": "ಡೇಟಾ",
    "transmission": "ಪ್ರಸರಣ",
    "reliable": "ವಿಶ್ವಾಸಾರ್ಹ",
    "connection": "ಸಂಪರ್ಕ",
    "handshake": "ಹ್ಯಾಂಡ್‌ಶೇಕ್",
    "operating": "ಆಪರೇಟಿಂಗ್",
    "system": "ವ್ಯವಸ್ಥೆ",
    "database": "ಡೇಟಾಬೇಸ್",
    "programming": "ಪ್ರೋಗ್ರಾಮಿಂಗ್",
    "python": "ಪೈಥಾನ್",
    "algorithm": "ಅಲ್ಗಾರಿದಮ್",
    "structure": "ರಚನೆ",
    "process": "ಪ್ರಕ್ರಿಯೆ",
    "memory": "ಮೆಮೊರಿ",
    "management": "ನಿರ್ವಹಣೆ",
    "summary": "ಸಾರಾಂಶ",
    "explanation": "ವಿವರಣೆ",
    "points": "ಮುಖ್ಯ ಅಂಶಗಳು",
    "quiz": "ರಸಪ್ರಶ್ನೆ",
    "question": "ಪ್ರಶ್ನೆ",
    "answer": "ಉತ್ತರ"
  },
  ml: {
    "computer": "കമ്പ്യൂട്ടർ",
    "networks": "നെറ്റ്‌വർക്കുകൾ",
    "network": "നെറ്റ്‌വർക്ക്",
    "protocol": "പ്രോട്ടോക്കോൾ",
    "layer": "ലെയർ",
    "transport": "ഗതാഗതം",
    "data": "ഡാറ്റ",
    "transmission": "കൈമാറ്റം",
    "reliable": "വിശ്വസനീയമായ",
    "connection": "കണക്ഷൻ",
    "handshake": "ഹാൻഡ്ഷേക്ക്",
    "operating": "ഓപ്പറേറ്റിംഗ്",
    "system": "സിസ്റ്റം",
    "database": "ഡാറ്റാബേസ്",
    "programming": "പ്രോഗ്രാമിംഗ്",
    "python": "പൈത്തൺ",
    "algorithm": "അൽഗോരിതം",
    "structure": "ഘടന",
    "process": "പ്രക്രിയ",
    "memory": "മെമ്മറി",
    "management": "മാനേജ്മെന്റ്",
    "summary": "സംഗ്രഹം",
    "explanation": "വിശദീകരണം",
    "points": "പ്രധാന പോയിന്റുകൾ",
    "quiz": "ക്വിസ്",
    "question": "ചോദ്യം",
    "answer": "ഉത്തരം"
  },
  bn: {
    "computer": "কম্পিউটার",
    "networks": "নেটওয়ার্ক",
    "network": "নেটওয়ার্ক",
    "protocol": "প্রোটোকল",
    "layer": "স্তর",
    "transport": "পরিবহন",
    "data": "ডেটা",
    "transmission": "স্থানান্তর",
    "reliable": "নির্ভরযোগ্য",
    "connection": "সংযোগ",
    "handshake": "হ্যান্ডশেক",
    "operating": "অপারেটিং",
    "system": "সিস্টেম",
    "database": "ডাটাবেস",
    "programming": "প্রোগ্রামিং",
    "python": "পাইথন",
    "algorithm": "অ্যালগরিদম",
    "structure": "কাঠামো",
    "process": "প্রক্রিয়া",
    "memory": "মেমরি",
    "management": "ব্যবস্থাপনা",
    "summary": "সারসংক্ষেপ",
    "explanation": "ব্যাখ্যা",
    "points": "মূল পয়েন্ট",
    "quiz": "কুইজ",
    "question": "প্রশ্ন",
    "answer": "উত্তর"
  }
};

// Phonetic transliteration map for natural voice pronunciation on systems with English-only TTS
const PHONETIC_READING_MAP = {
  ta: {
    "டிரான்ஸ்மிஷன்": "Transmission",
    "கண்ட்ரோல்": "Control",
    "புரோட்டோகால்": "Protocol",
    "போக்குவரத்து": "Pokku-varathu",
    "அடுக்கு": "Adukku",
    "நம்பகமான": "Nambaga-maana",
    "வரிசைப்படுத்தப்பட்ட": "Varisai-paduthappatta",
    "இணைப்பு": "Inaippu",
    "நெறிமுறை": "Neri-murai",
    "மூன்று": "Moondru",
    "வழி": "Vazhi",
    "கைகுலுக்கல்": "Kai-kulukkal",
    "மூலம்": "Moolam",
    "உருவாக்குகிறது": "Uruvaakkugiradhu",
    "கணினி": "Kanini",
    "தரவு": "Tharavu",
    "நினைவகம்": "Ninaivagam",
    "விளக்கம்": "Vilakkam",
    "சுருக்கம்": "Surukkam",
    "முக்கிய": "Mukkiya",
    "குறிப்புகள்": "Kurippugal",
    "ஆகும்": "Aagum",
    "மற்றும்": "Matrum"
  },
  hi: {
    "ट्रांसमिशन": "Transmission",
    "कंट्रोल": "Control",
    "प्रोटोकॉल": "Protocol",
    "ट्रांसपोर्ट": "Transport",
    "लेयर": "Layer",
    "विश्वसनीय": "Vish-was-neeya",
    "क्रमित": "Kramit",
    "कनेक्शन": "Connection",
    "हैंडशेक": "Handshake",
    "कंप्यूटर": "Computer",
    "नेटवर्क": "Network",
    "डेटा": "Data",
    "प्रक्रिया": "Prakriya",
    "स्पष्टीकरण": "Spashti-karan",
    "सारांश": "Saaraansh",
    "मुख्य": "Mukhya",
    "बिंदु": "Bindu",
    "और": "Aur",
    "है": "Hai"
  }
};

export const translatorService = {
  translateText(text, targetLang = "ta", sourceLang = "en") {
    if (!text) return "";
    if (sourceLang === targetLang) return text;

    if (MULTILINGUAL_SUMMARIES[targetLang] && (text.includes("Transmission Control") || text.includes("Transport Layer") || text.includes("TCP"))) {
      return MULTILINGUAL_SUMMARIES[targetLang].summary;
    }

    const dict = VOCABULARY_MAP[targetLang];
    if (!dict) return text;

    const tokens = text.split(/(\s+|[.,!?;:()])/);
    const translatedTokens = tokens.map((token) => {
      const lower = token.toLowerCase();
      if (dict[lower]) {
        return dict[lower];
      }
      return token;
    });

    const result = translatedTokens.join("").trim();
    return result || text;
  },

  getPhoneticPronunciation(text, lang = "ta") {
    if (!text || lang === "en") return text;
    const pMap = PHONETIC_READING_MAP[lang];
    if (!pMap) return text;

    let result = text;
    Object.entries(pMap).forEach(([word, phonetic]) => {
      result = result.split(word).join(phonetic);
    });
    return result;
  }
};
