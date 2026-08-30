export const DEPARTMENTS = [
  "Computer Science & Engineering (CSE)",
  "Information Technology (IT)",
  "Artificial Intelligence & Data Science (AI & DS)",
  "Cyber Security & Forensics",
  "Electronics & Communication Engineering (ECE)",
  "Electrical & Electronics Engineering (EEE)",
  "Mechanical Engineering (MECH)",
  "Civil Engineering (CIVIL)",
  "Biomedical Engineering",
  "Science & Humanities",
  "Other Department / School"
];

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", native: "English", flag: "🇬🇧", bcp47: "en-US" },
  { code: "ta", name: "Tamil", native: "தமிழ்", flag: "🇮🇳", bcp47: "ta-IN" },
  { code: "hi", name: "Hindi", native: "हिन्दी", flag: "🇮🇳", bcp47: "hi-IN" },
  { code: "te", name: "Telugu", native: "తెలుగు", flag: "🇮🇳", bcp47: "te-IN" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ", flag: "🇮🇳", bcp47: "kn-IN" },
  { code: "ml", name: "Malayalam", native: "മലയാളം", flag: "🇮🇳", bcp47: "ml-IN" },
  { code: "bn", name: "Bengali", native: "বাংলা", flag: "🇮🇳", bcp47: "bn-IN" },
];

export const INITIAL_SUBJECT_PROGRESS = [
  { subject: "Python Programming", progress: 0, color: "bg-emerald-500", text: "text-emerald-700", bgLight: "bg-emerald-50" },
  { subject: "Database Management (DBMS)", progress: 0, color: "bg-brand-500", text: "text-brand-700", bgLight: "bg-brand-50" },
  { subject: "Operating Systems", progress: 0, color: "bg-amber-500", text: "text-amber-700", bgLight: "bg-amber-50" },
  { subject: "Computer Networks", progress: 0, color: "bg-rose-500", text: "text-rose-700", bgLight: "bg-rose-50" },
];

export const MULTILINGUAL_SUMMARIES = {
  en: {
    title: "Core Fundamentals & Architecture",
    summary: "This chapter covers the foundational principles, structural hierarchy, and communication models. It explains data encapsulation, reliable transport mechanisms, state transitions, and optimization algorithms essential for software engineering.",
    simpleExplanation: "Think of this topic like the blueprint and electrical wiring of a house. Before adding furniture (advanced features), you need solid walls and wiring (foundations) to make sure everything works smoothly without sparks!",
    keyConcepts: [
      "Modular system architecture and layer boundaries",
      "Reliable state transitions and deterministic data pipelines",
      "Error detection, synchronization, and latency minimization",
      "Scalable infrastructure design for real-world applications"
    ],
    keyPoints: [
      "Operates as the core backbone for all subsequent chapters.",
      "Reduces computational overhead through modular subroutines.",
      "Guarantees data integrity and predictable execution flow."
    ],
    definitions: [
      {
        term: "System Architecture",
        definition: "The conceptual model that defines the structure, behavior, and more views of a system."
      },
      {
        term: "State Transition",
        definition: "The deterministic progression from one state to another upon receiving an input or event."
      }
    ],
    quickRevision: [
      "Review the core architectural pillars.",
      "Understand state transition diagrams.",
      "Check error handling protocols."
    ]
  },
  ta: {
    title: "அடிப்படை தத்துவங்கள் மற்றும் கட்டமைப்பு (Core Fundamentals)",
    summary: "இந்த அத்தியாயம் பாடப்புத்தகத்தின் அடிப்படை கொள்கைகள், கட்டமைப்பு அடுக்குகள் மற்றும் தகவல் தொடர்பு மாதிரிகளை விரிவாக விளக்குகிறது. தரவு பாதுகாப்பு, நம்பகமான பரிமாற்ற வழிமுறைகள் மற்றும் மென்பொருள் பொறியியலுக்கு தேவையான முக்கிய வழிமுறைகளை இது கற்பிக்கிறது.",
    simpleExplanation: "ஒரு புதிய வீட்டிற்கு வலுவான அடித்தளமும் மின்சார இணைப்பும் எவ்வளவு முக்கியமோ, அதே போல அடுத்தடுத்த பாடங்களை சரியாக புரிந்து கொள்ள இந்த அடிப்படை அத்தியாயம் மிக முக்கியமானது!",
    keyConcepts: [
      "கட்டமைப்பு மாதிரிகள் மற்றும் அடுக்கு எல்லைகள்",
      "நம்பகமான தரவு ஓட்டம் மற்றும் நிலை மாற்றங்கள்",
      "பிழை கண்டறிதல் மற்றும் செயல்திறன் மேம்பாடு",
      "நவீன மென்பொருள் பயன்பாடுகளுக்கான அளவிடக்கூடிய வடிவமைப்பு"
    ],
    keyPoints: [
      "அடுத்தடுத்த அனைத்து அத்தியாயங்களுக்கும் இதுவே முதன்மை அடித்தளமாகும்.",
      "முறையான வடிவமைப்பு மூலம் கணினி செயல்திறனை அதிகரிக்கிறது.",
      "தரவு துல்லியம் மற்றும் சீரான செயல்பாட்டை உறுதி செய்கிறது."
    ],
    definitions: [
      {
        term: "கணினி கட்டமைப்பு (System Architecture)",
        definition: "ஒரு அமைப்பின் கட்டமைப்பு, நடத்தை மற்றும் செயல்பாடுகளை வரையறுக்கும் கருத்தியல் மாதிரி."
      },
      {
        term: "நிலை மாற்றம் (State Transition)",
        definition: "ஒரு உள்ளீட்டைப் பெற்றவுடன் ஒரு செயல்பாட்டு நிலையிலிருந்து மற்றொரு நிலைக்கு மாறும் முறை."
      }
    ],
    quickRevision: [
      "முக்கிய கட்டமைப்பு தூண்களை மதிப்பாய்வு செய்யவும்.",
      "நிலை மாற்ற வரைபடங்களை நினைவில் கொள்ளவும்.",
      "பிழை திருத்தும் வழிமுறைகளை சரிபார்க்கவும்."
    ]
  },
  hi: {
    title: "मौलिक सिद्धांत और सिस्टम आर्किटेक्चर (Core Fundamentals)",
    summary: "यह अध्याय मूलभूत सिद्धांतों, संरचनात्मक पदानुक्रम और संचार मॉडलों का विस्तृत विवरण प्रस्तुत करता है। यह डेटा इनकैप्सुलेशन, विश्वसनीय ट्रांसपोर्ट प्रोटोकॉल और सॉफ्टवेयर इंजीनियरिंग के आवश्यक एल्गोरिदम को समझाता है।",
    simpleExplanation: "इस विषय को एक मजबूत इमारत की नींव जैसा समझें। उन्नत सुविधाओं को जोड़ने से पहले, एक ठोस आधार होना जरूरी है ताकि पूरी प्रणाली बिना किसी रुकावट के सही ढंग से काम करे!",
    keyConcepts: [
      "मॉड्यूलर सिस्टम आर्किटेक्चर और लेयर सीमाएं",
      "विश्वसनीय डेटा प्रवाह और स्टेट ट्रांजिशन",
      "त्रुटि पहचान, सिंक्रोनाइज़ेशन और विलंबता में कमी",
      "वास्तविक दुनिया के अनुप्रयोगों के लिए स्केलेबल डिज़ाइन"
    ],
    keyPoints: [
      "आगामी सभी अध्यायों के लिए एक मजबूत आधार प्रदान करता है।",
      "मॉड्यूलर संरचना के माध्यम से कम्प्यूटेशनल ओवरहेड को कम करता है।",
      "डेटा अखंडता और सुसंगत निष्पादन प्रवाह सुनिश्चित करता है।"
    ],
    definitions: [
      {
        term: "सिस्टम आर्किटेक्चर (System Architecture)",
        definition: "एक वैचारिक मॉडल जो किसी सिस्टम की संरचना, व्यवहार और विचारों को परिभाषित करता है।"
      },
      {
        term: "स्टेट ट्रांजिशन (State Transition)",
        definition: "किसी घटना या इनपुट के प्राप्त होने पर एक स्थिति से दूसरी स्थिति में व्यवस्थित बदलाव।"
      }
    ],
    quickRevision: [
      "मुख्य आर्किटेक्चर घटकों को दोहराएं।",
      "स्टेट ट्रांजिशन डायग्राम को समझें।",
      "त्रुटि निवारण प्रोटोकॉल की जांच करें।"
    ]
  },
  te: {
    title: "ప్రాథమిక సూత్రాలు మరియు నిర్మాణం (Core Fundamentals)",
    summary: "ఈ అధ్యాయం ప్రాథమిక సూత్రాలు, నిర్మాణ క్రమం మరియు సమాచార మార్పిడి నమూనాలపై దృష్టి పెడుతుంది. డేటా సమగ్రత, నమ్మకమైన ప్రసార పద్ధతులు మరియు సాఫ్ట్‌వేర్ అభివృద్ధికి అవసరమైన కీలక సూత్రాలను వివరిస్తుంది.",
    simpleExplanation: "ఒక ఇంటికి పునాది ఎంత ముఖ్యమో, రాబోయే అధునాతన పాఠాలను సులభంగా అర్థం చేసుకోవడానికి ఈ ప్రాథమిక అంశాలు అంతే అవసరం!",
    keyConcepts: [
      "మాడ్యులర్ సిస్టమ్ నిర్మాణం మరియు పొరల సరిహద్దులు",
      "నమ్మకమైన డేటా ప్రవాహం మరియు స్థితి పరివర్తనలు",
      "లోపాల గుర్తింపు మరియు పనితీరు మెరుగుదల"
    ],
    keyPoints: [
      "తదుపరి పాఠాలకు బలమైన పునాదిని ఏర్పరుస్తుంది.",
      "డేటా భద్రత మరియు ఖచ్చితత్వాన్ని నిర్ధారిస్తుంది."
    ],
    definitions: [
      {
        term: "సిస్టమ్ ఆర్కిటెక్చర్",
        definition: "వ్యవస్థ యొక్క నిర్మాణం మరియు ప్రవర్తనను నిర్వచించే ప్రాథమిక నమూనా."
      }
    ],
    quickRevision: [
      "ముఖ్య నిర్మాణ సూత్రాలను పునశ్చరణ చేయండి.",
      "డేటా ప్రవాహ రేఖాచిత్రాలను గమనించండి."
    ]
  },
  kn: {
    title: "ಮೂಲಭೂತ ತತ್ವಗಳು ಮತ್ತು ಸಿಸ್ಟಮ್ ವಿನ್ಯಾಸ (Core Fundamentals)",
    summary: "ಈ ಅಧ್ಯಾಯವು ಮೂಲ ತತ್ವಗಳು, ವ್ಯವಸ್ಥೆಯ ರಚನೆ ಮತ್ತು ಸಂವಹನ ಮಾದರಿಗಳನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ವಿವರಿಸುತ್ತದೆ. ಡೇಟಾ ಭದ್ರತೆ ಮತ್ತು ದಕ್ಷತೆಯ ಮಹತ್ವವನ್ನು ಇದು ತಿಳಿಸುತ್ತದೆ.",
    simpleExplanation: "ಒಂದು ಸುಂದರವಾದ ಕಟ್ಟಡಕ್ಕೆ ಭದ್ರವಾದ ಅಡಿಪಾಯ ಎಷ್ಟು ಮುಖ್ಯವೋ, ಮುಂದಿನ ಪಾಠಗಳನ್ನು ಕಲಿಯಲು ಈ ಅಧ್ಯಾಯವು ಅಷ್ಟೇ ಮುಖ್ಯ!",
    keyConcepts: [
      "ಮಾಡ್ಯುಲರ್ ರಚನೆ ಮತ್ತು ನಿಯಮಗಳು",
      "ವಿಶ್ವಾಸಾರ್ಹ ಡೇಟಾ ಪ್ರಸರಣ ಪ್ರಕ್ರಿಯೆ",
      "ದೋಷ ಪತ್ತೆ ಮತ್ತು ಪರಿಹಾರ"
    ],
    keyPoints: [
      "ಮುಂದಿನ ಎಲ್ಲಾ ಅಧ್ಯಾಯಗಳಿಗೆ ಬಲವಾದ ಅಡಿಪಾಯ ಒದಗಿಸುತ್ತದೆ.",
      "ಕಾರ್ಯಕ್ಷಮತೆಯನ್ನು ಗಣನೀಯವಾಗಿ ಹೆಚ್ಚಿಸುತ್ತದೆ."
    ],
    definitions: [
      {
        term: "ಸಿಸ್ಟಮ್ ಆರ್ಕಿಟೆಕ್ಚರ್",
        definition: "ವ್ಯವಸ್ಥೆಯ ರಚನೆ ಮತ್ತು ನಡವಳಿಕೆಯನ್ನು ವಿವರಿಸುವ ಮೂಲ ಮಾದರಿ."
      }
    ],
    quickRevision: [
      "ಮುಖ್ಯ ನಿಯಮಗಳನ್ನು ಪುನರಾವರ್ತಿಸಿ.",
      "ದೋಷ ಪರಿಹಾರ ಹಂತಗಳನ್ನು ನೆನಪಿಡಿ."
    ]
  },
  ml: {
    title: "അടിസ്ഥാന തത്വങ്ങളും ഘടനയും (Core Fundamentals)",
    summary: "ഈ അധ്യായം അടിസ്ഥാന സിദ്ധാന്തങ്ങളും പ്രവർത്തന രീതികളും വ്യക്തമാക്കുന്നു. കാര്യക്ഷമമായ ഡാറ്റാ കൈമാറ്റവും സുരക്ഷിതത്വവും ഇതിൽ ഉൾക്കൊള്ളുന്നു.",
    simpleExplanation: "ഒരു വലിയ കെട്ടിടത്തിന്റെ അടിത്തറ പോലെയാണ് ഈ പാഠം. അടുത്ത ഘട്ടങ്ങൾ എളുപ്പത്തിൽ പഠിക്കാൻ ഇത് സഹായിക്കും!",
    keyConcepts: [
      "സിസ്റ്റം ഘടനയും നിയമങ്ങളും",
      "കൃത്യമായ ഡാറ്റാ പ്രവാഹം",
      "പിശകുകൾ കണ്ടെത്തലും പരിഹാരവും"
    ],
    keyPoints: [
      "തുടർന്നുള്ള പാഠങ്ങൾക്കുള്ള അടിസ്ഥാനം നൽകുന്നു.",
      "പ്രവർത്തന വേഗത വർദ്ധിപ്പിക്കുന്നു."
    ],
    definitions: [
      {
        term: "സിസ്റ്റം ആർക്കിടെക്ചർ",
        definition: "ഒരു സിസ്റ്റത്തിന്റെ ഘടനയെയും പ്രവർത്തനങ്ങളെയും നിർവ്വചിക്കുന്ന മാതൃക."
      }
    ],
    quickRevision: [
      "പ്രധാന ആശയങ്ങൾ ഓർക്കുക.",
      "ഘടനാപരമായ ഡയഗ്രമുകൾ പരിശോധിക്കുക."
    ]
  },
  bn: {
    title: "মৌলিক নীতি ও সিস্টেম স্থাপত্য (Core Fundamentals)",
    summary: "এই অধ্যায়টি মৌলিক ধারণা, গঠনমূলক স্তর এবং যোগাযোগ মডেলের ওপর আলোকপাত করে। এটি নির্ভরযোগ্য ডেটা ট্রান্সমিশন ও সফটওয়্যার ইঞ্জিনিয়ারিংয়ের মূল নীতিগুলো ব্যাখ্যা করে।",
    simpleExplanation: "একটি মজবুত ভবনের ভিত্তির মতো এই অধ্যায়টি কাজ করে। পরবর্তী জটিল বিষয়গুলো সহজে বোঝার জন্য এই ভিত্তি অত্যন্ত জরুরি!",
    keyConcepts: [
      "মডুলার সিস্টেম আর্কিটেকচার",
      "নির্ভরযোগ্য ডেটা ফ্লো এবং স্টেট ট্রানজিশন",
      "ত্রুটি সনাক্তকরণ ও কার্যক্ষমতা বৃদ্ধি"
    ],
    keyPoints: [
      "পরবর্তী সকল অধ্যায়ের মূল ভিত্তি হিসেবে কাজ করে।",
      "ডেটার নির্ভুলতা ও ধারাবাহিকতা নিশ্চিত করে।"
    ],
    definitions: [
      {
        term: "সিস্টেম আর্কিটেকচার",
        definition: "একটি ধারণাগত মডেল যা সিস্টেমের গঠন ও আচরণকে সংজ্ঞায়িত করে।"
      }
    ],
    quickRevision: [
      "মূল নীতিগুলো পুনরায় দেখুন।",
      "ত্রুটি সংশোধন প্রক্রিয়া মনে রাখুন।"
    ]
  }
};
