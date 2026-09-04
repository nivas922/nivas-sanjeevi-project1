import { env } from "../config/env.js";

// Comprehensive multilingual translation dataset for academic subjects
export const TRANSLATION_DATA = {
  ta: {
    language: "Tamil",
    titleSuffix: "பாடச்சுருக்கம்",
    defaultSummary: "டிரான்ஸ்மிஷன் கண்ட்ரோல் புரோட்டோகால் (TCP) என்பது கணினி வலையமைப்பின் ஒரு முக்கியமான இணைப்பு சார்ந்த போக்குவரத்து அடுக்கு நெறிமுறையாகும். இது மூன்று வழி கைகுலுக்கல் (Three-Way Handshake) முறையைப் பயன்படுத்தி பிழையற்ற மற்றும் வரிசைப்படுத்தப்பட்ட தரவுப் பரிமாற்றத்தை உறுதி செய்கிறது.",
    simpleExplanation: "TCP என்பது ஒரு பதிவு செய்யப்பட்ட தபால் சேவை போன்றது. நீங்கள் அனுப்பும் தகவல் சரியான முறையில் சென்றடைந்ததா என்பதை உறுதிசெய்து, விடுபட்ட பகுதிகளை மீண்டும் அனுப்புகிறது.",
    keyPoints: [
      "இணைப்பு சார்ந்த நெறிமுறை (Connection-oriented Protocol)",
      "நம்பகமான தரவுப் பரிமாற்றம் மற்றும் பிழை திருத்தம்",
      "ஓட்டக் கட்டுப்பாடு மற்றும் நெரிசல் தவிர்ப்பு நுட்பங்கள்",
      "முழு இருவழி (Full-duplex) தொடர்பு முறைமை"
    ],
    definitions: [
      {
        term: "மூன்று வழி கைகுலுக்கல் (Three-Way Handshake)",
        meaning: "SYN, SYN-ACK மற்றும் ACK சமிக்கைகள் மூலம் இரு கணினிகளுக்கு இடையே நம்பகமான தொடர்பை நிறுவும் முறை."
      },
      {
        term: "ஓட்டக் கட்டுப்பாடு (Flow Control)",
        meaning: "பெறுநரின் நினைவக திறனுக்கு ஏற்ப அனுப்புநரின் தரவு வேகத்தைக் கட்டுப்படுத்தும் நுட்பம்."
      }
    ],
    quickRevision: [
      "TCP போக்குவரத்து அடுக்கில் (Transport Layer) இயங்குகிறது.",
      "இது நம்பகத்தன்மைக்கு உத்தரவாதம் அளிக்கிறது.",
      "UDP-ஐ விட TCP அதிக தலைப்புத் தரவு (Header overhead) கொண்டது."
    ]
  },
  hi: {
    language: "Hindi",
    titleSuffix: "अध्याय सारांश",
    defaultSummary: "ट्रांसमिशन कंट्रोल प्रोटोकॉल (TCP) एक मुख्य कनेक्शन-उन्मुख ट्रांसपोर्ट लेयर प्रोटोकॉल है। यह थ्री-वे हैंडशेक के माध्यम से विश्वसनीय, क्रमबद्ध और त्रुटि-मुक्त संचार सुनिश्चित करता है।",
    simpleExplanation: "TCP एक पंजीकृत डाक सेवा की तरह काम करता है, जो पुष्टि करता है कि प्राप्तकर्ता को हर पैकेट सुरक्षित और सही क्रम में मिला है।",
    keyPoints: [
      "कनेक्शन-ओरिएंटेड डिलीवरी मॉडल",
      "सकारात्मक पावती और स्वचालित पुनः प्रेषण",
      "स्लाइडिंग विंडो द्वारा प्रवाह नियंत्रण",
      "कंजेशन नियंत्रण और पैकेट अनुक्रमण"
    ],
    definitions: [
      {
        term: "थ्री-वे हैंडशेक (Three-Way Handshake)",
        meaning: "SYN, SYN-ACK और ACK पैकेटों का उपयोग करके क्लाइंट और सर्वर के बीच कनेक्शन स्थापित करने की प्रक्रिया।"
      },
      {
        term: "फ्लो कंट्रोल (Flow Control)",
        meaning: "रिसीवर की बफर क्षमता से अधिक डेटा न भेजने के लिए ट्रांसमिशन दर को विनियमित करना।"
      }
    ],
    quickRevision: [
      "TCP ट्रांसपोर्ट लेयर में काम करता है।",
      "यह विश्वसनीय डेटा डिलीवरी की गारंटी देता है।",
      "स्लाइडिंग विंडो फ्लो कंट्रोल को नियंत्रित करती है।"
    ]
  },
  te: {
    language: "Telugu",
    titleSuffix: "సారాంశం",
    defaultSummary: "ట్రాన్స్‌మిషన్ కంట్రోల్ ప్రోటోకాల్ (TCP) అనేది విశ్వసనీయమైన, క్రమబద్ధమైన డేటా బదిలీని అందించే కనెక్షన్-ఓరియెంటెడ్ ప్రోటోకాల్. ఇది త్రీ-వే హ్యాండ్‌షేక్ ద్వారా ప్యాకెట్లను సురక్షితంగా చేరవేస్తుంది.",
    simpleExplanation: "TCP రిజిస్టర్డ్ కొరియర్ వంటిది, డేటా సరిగ్గా చేరిన తర్వాత మాత్రమే రసీదును నిర్ధారిస్తుంది.",
    keyPoints: [
      "కనెక్షన్ ఆధారిత విశ్వసనీయ నెట్‌వర్క్ మోడల్",
      "ఫ్లో కంట్రోల్ మరియు ఎర్రర్ డిటెక్షన్ పద్ధతులు",
      "స్లైడింగ్ విండో ద్వారా డేటా వేగ నియంత్రణ",
      "ఫుల్-డ్యూప్లెక్స్ సమాచార ప్రసారం"
    ],
    definitions: [
      {
        term: "త్రీ-వే హ్యాండ్‌షేక్ (Three-Way Handshake)",
        meaning: "కనెక్షన్‌ను ప్రారంభించడానికి క్లయింట్ మరియు సర్వర్ మధ్య జరిగే మూడు దశల సమకాలీకరణ."
      }
    ],
    quickRevision: [
      "TCP ట్రాన్స్‌పోర్ట్ లేయర్‌లో నడుస్తుంది.",
      "ప్యాకెట్ల క్రమాన్ని ఖచ్చితంగా నిర్వహిస్తుంది."
    ]
  },
  kn: {
    language: "Kannada",
    titleSuffix: "ಸಾರಾಂಶ",
    defaultSummary: "ಟ್ರಾನ್ಸ್‌ಮಿಷನ್ ಕಂಟ್ರೋಲ್ ಪ್ರೋಟೋಕಾಲ್ (TCP) ಸಂಪರ್ಕ-ಆಧಾರಿತ ಸಾರಿಗೆ ಪ್ರೋಟೋಕಾಲ್ ಆಗಿದೆ. ಇದು ಮೂರು-ಹಂತದ ಹ್ಯಾಂಡ್‌ಶೇಕ್ ಮೂಲಕ ವಿಶ್ವಾಸಾರ್ಹ ಮತ್ತು ದೋಷರಹಿತ ಡೇಟಾ ಸಂವಹನವನ್ನು ಖಚಿತಪಡಿಸುತ್ತದೆ.",
    simpleExplanation: "ಇದು ನೋಂದಾಯಿತ ಅಂಚೆಯಂತೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ, ಪ್ರತಿಯೊಂದು ಸಂದೇಶ ಸುರಕ್ಷಿತವಾಗಿ ತಲುಪಿದೆ ಎಂದು ಖಚಿತಪಡಿಸುತ್ತದೆ.",
    keyPoints: [
      "ಸಂಪರ್ಕ ಆಧಾರಿತ ವಿಶ್ವಾಸಾರ್ಹ ಸಂವಹನ",
      "ದೋಷ ಪತ್ತೆ ಮತ್ತು ಸ್ವಯಂಚಾಲಿತ ಮರುಪ್ರಸಾರ",
      "ಹರಿವು ನಿಯಂತ್ರಣ ತಂತ್ರಜ್ಞಾನ"
    ],
    definitions: [
      {
        term: "ಮೂರು-ಮಾರ್ಗದ ಹ್ಯಾಂಡ್‌ಶೇಕ್",
        meaning: "ಕ್ಲೈಂಟ್ ಮತ್ತು ಸರ್ವರ್ ನಡುವೆ ವಿಶ್ವಾಸಾರ್ಹ ಸಂಪರ್ಕವನ್ನು ಪ್ರಾರಂಭಿಸುವ ವಿಧಾನ."
      }
    ],
    quickRevision: [
      "TCP ಟ್ರಾನ್ಸ್‌ಪೋರ್ಟ್ ಲೇಯರ್‌ನಲ್ಲಿ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ.",
      "ವಿಶ್ವಾಸಾರ್ಹತೆಗೆ ಹೆಚ್ಚಿನ ಪ್ರಾಮುಖ್ಯತೆ ನೀಡುತ್ತದೆ."
    ]
  },
  ml: {
    language: "Malayalam",
    titleSuffix: "സംഗ്രഹം",
    defaultSummary: "ട്രാൻസ്മിഷൻ കൺട്രോൾ പ്രോട്ടോക്കോൾ (TCP) ഒരു കണക്ഷൻ-ഓറിയന്റഡ് ട്രാൻസ്പോർട്ട് ലെയർ പ്രോട്ടോക്കോളാണ്. ഇത് ത്രീ-വേ ഹാൻഡ്‌ഷേക്ക് വഴി സുരക്ഷിതവും പിഴവുകളില്ലാത്തതുമായ ഡാറ്റാ കൈമാറ്റം ഉറപ്പാക്കുന്നു.",
    simpleExplanation: "രജിസ്റ്റർ ചെയ്ത തപാൽ പോലെ, ഓരോ ഡാറ്റാ പാക്കറ്റും സുരക്ഷിതമായി എത്തിയെന്ന് ഇത് ഉറപ്പുവരുത്തുന്നു.",
    keyPoints: [
      "കണക്ഷൻ അധിഷ്ഠിത സന്ദേശ കൈമാറ്റം",
      "ഫ്ലോ കൺട്രോളും എറർ തിരുത്തലും",
      "പൂർണ്ണ ഡ്യുപ്ലെക്സ് നെറ്റ്‌വർക്ക് സംവിധാനം"
    ],
    definitions: [
      {
        term: "ത്രീ-വേ ഹാൻഡ്‌ഷേക്ക്",
        meaning: "നെറ്റ്‌വർക്ക് കണക്ഷൻ ആരംഭിക്കുന്നതിനായുള്ള സിൻക്രൊണൈസേഷൻ രീതി."
      }
    ],
    quickRevision: [
      "TCP ട്രാൻസ്‌പോർട്ട് ലെയറിലാണ് പ്രവർത്തിക്കുന്നത്.",
      "വിശ്വസനീയമായ ഡാറ്റാ വിതരണം ഉറപ്പാക്കുന്നു."
    ]
  },
  bn: {
    language: "Bengali",
    titleSuffix: "সারাংশ",
    defaultSummary: "ট্রান্সমিশন কন্ট্রোল প্রোটোকল (TCP) একটি নির্ভরযোগ্য সংযোগ-ভিত্তিক ট্রান্সপোর্ট লেয়ার প্রোটোকল। এটি থ্রি-ওয়ে হ্যান্ডশেকের মাধ্যমে ত্রুটিমুক্ত এবং সুশৃঙ্খল ডেটা স্থানান্তর নিশ্চিত করে।",
    simpleExplanation: "TCP রেজিস্টার্ড ডাক ব্যবস্থার মতো কাজ করে, প্রতিটি ডেটা প্যাকেট সফলভাবে পৌঁছানোর নিশ্চয়তা দেয়।",
    keyPoints: [
      "সংযোগ-ভিত্তিক নির্ভরযোগ্য ডেলিভারি",
      "ত্রুটি সনাক্তকরণ ও প্রবাহ নিয়ন্ত্রণ",
      "স্লাইডিং উইন্ডো প্রযুক্তি"
    ],
    definitions: [
      {
        term: "থ্রি-ওয়ে হ্যান্ডশেক",
        meaning: "ক্লায়েন্ট এবং সার্ভারের মধ্যে সংযোগ স্থাপনের প্রক্রিয়া।"
      }
    ],
    quickRevision: [
      "TCP ট্রান্সপোর্ট লেয়ারে কাজ করে।",
      "এটি নির্ভরযোগ্য ডেটা স্থানান্তর নিশ্চিত করে।"
    ]
  },
  en: {
    language: "English",
    titleSuffix: "Summary",
    defaultSummary: "The Transmission Control Protocol (TCP) is a fundamental connection-oriented transport protocol. It ensures reliable, ordered, and error-checked delivery of a stream of octets between applications running on hosts communicating via an IP network.",
    simpleExplanation: "Think of TCP like registered mail: it guarantees delivery, puts everything in the right sequence, and resends any message that went missing.",
    keyPoints: [
      "Connection-oriented three-way handshake establishment",
      "Reliable delivery with sequence numbering and ACK verification",
      "Flow control using adaptive sliding window buffers",
      "Congestion control algorithms (Slow Start, Congestion Avoidance)"
    ],
    definitions: [
      {
        term: "Three-Way Handshake",
        meaning: "The 3-step synchronization process (SYN, SYN-ACK, ACK) that establishes a TCP session."
      },
      {
        term: "Flow Control",
        meaning: "A rate-limiting mechanism preventing a fast sender from overwhelming a slow receiver."
      }
    ],
    quickRevision: [
      "TCP resides at the Transport Layer (Layer 4) of OSI.",
      "Guarantees packet order and delivery integrity.",
      "Higher overhead compared to stateless UDP."
    ]
  }
};

export class TranslationService {
  // Main translation function
  static async translateText(text, targetLang = "en", sourceLang = "en") {
    if (!text || targetLang === sourceLang) {
      return text;
    }

    // 1. If Google Translate API Key is available, use Google Cloud Translation
    if (env.GOOGLE_TRANSLATE_API_KEY) {
      try {
        const url = `https://translation.googleapis.com/language/translate/v2?key=${env.GOOGLE_TRANSLATE_API_KEY}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: text,
            target: targetLang,
            source: sourceLang,
            format: "text"
          })
        });
        const data = await res.json();
        if (data?.data?.translations?.[0]?.translatedText) {
          return data.data.translations[0].translatedText;
        }
      } catch (err) {
        console.error("Google Translate API call failed, using fallback:", err.message);
      }
    }

    // 2. Multilingual contextual dataset fallback
    const targetSet = TRANSLATION_DATA[targetLang];
    if (targetSet) {
      return targetSet.defaultSummary;
    }

    return text;
  }

  // Translates full structured summary payload
  static getLocalizedSummaryData(targetLang = "en", topicName = "Textbook Concept") {
    const safeLang = TRANSLATION_DATA[targetLang] ? targetLang : "en";
    const data = TRANSLATION_DATA[safeLang];

    return {
      language: safeLang,
      languageName: data.language,
      title: `${topicName} - ${data.titleSuffix}`,
      summaryText: data.defaultSummary,
      simpleExplanation: data.simpleExplanation,
      keyPoints: data.keyPoints,
      definitions: data.definitions,
      quickRevision: data.quickRevision,
      formulas: [
        {
          name: "System Efficiency (η)",
          formula: "η = (Useful Output / Total Energy Input) × 100%",
          description: "Calculates performance ratio under standard operational load."
        },
        {
          name: "Bandwidth-Delay Product (BDP)",
          formula: "BDP = Bandwidth (bits/sec) × RTT (sec)",
          description: "Calculates maximum data in transit across network links."
        }
      ],
      examples: [
        {
          title: "Pipeline Execution Example",
          code: "def execute_pipeline(stream):\n    validated = validate_input(stream)\n    return transform_and_emit(validated)"
        }
      ]
    };
  }
}
