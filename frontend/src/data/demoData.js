export const INITIAL_USER = {
  id: "usr_101",
  name: "Alex Johnson",
  email: "alex.johnson@university.edu",
  role: "Computer Science Undergrad",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  streakDays: 7,
  totalStudyHours: 24.5,
  quizzesTaken: 14,
  averageScore: 78,
  preferredLanguage: "English",
  preferredDifficulty: "Intermediate",
  speechRate: 1.0,
  speechVoice: "default",
  notifications: true
};

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", native: "English", flag: "🇬🇧" },
  { code: "ta", name: "Tamil", native: "தமிழ்", flag: "🇮🇳" },
  { code: "hi", name: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
  { code: "te", name: "Telugu", native: "తెలుగు", flag: "🇮🇳" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ", flag: "🇮🇳" },
  { code: "ml", name: "Malayalam", native: "മലയാളം", flag: "🇮🇳" },
  { code: "bn", name: "Bengali", native: "বাংলা", flag: "🇮🇳" },
];

export const DEMO_TEXTBOOKS = [
  {
    id: "tb-1",
    title: "Computer Networks: A Top-Down Approach",
    author: "Kurose & Ross",
    coverUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80",
    subject: "Computer Networks",
    category: "Core Engineering",
    pages: 420,
    chaptersCount: 8,
    progress: 55,
    status: "In Progress",
    lastStudied: "2 hours ago",
    topics: [
      { id: "top-101", name: "TCP/IP Protocol Suite", mastery: 45, status: "Weak" },
      { id: "top-102", name: "OSI 7-Layer Model", mastery: 68, status: "Needs Improvement" },
      { id: "top-103", name: "DNS & HTTP/HTTPS", mastery: 82, status: "Good" },
      { id: "top-104", name: "Subnetting & CIDR", mastery: 50, status: "Weak" },
    ],
    chapters: [
      { id: "ch-1", number: 1, title: "Computer Networks and the Internet", pages: 65 },
      { id: "ch-2", number: 2, title: "Application Layer Protocols (DNS, HTTP)", pages: 72 },
      { id: "ch-3", number: 3, title: "Transport Layer: TCP vs UDP & Congestion Control", pages: 85 },
      { id: "ch-4", number: 4, title: "The Network Layer: Data Plane & Routing", pages: 90 },
    ]
  },
  {
    id: "tb-2",
    title: "Python Programming: An Introduction to Computer Science",
    author: "John Zelle",
    coverUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&auto=format&fit=crop&q=80",
    subject: "Python Programming",
    category: "Programming",
    pages: 310,
    chaptersCount: 10,
    progress: 85,
    status: "Completed",
    lastStudied: "Yesterday",
    topics: [
      { id: "top-201", name: "OOP & Classes", mastery: 90, status: "Strong" },
      { id: "top-202", name: "Data Structures (Lists, Dicts, Sets)", mastery: 92, status: "Strong" },
      { id: "top-203", name: "Decorators & Generators", mastery: 80, status: "Good" },
      { id: "top-204", name: "Concurrency & AsyncIO", mastery: 78, status: "Good" },
    ],
    chapters: [
      { id: "ch-21", number: 1, title: "Computers and Programs Overview", pages: 30 },
      { id: "ch-22", number: 2, title: "Object-Oriented Programming and Encapsulation", pages: 45 },
      { id: "ch-23", number: 3, title: "Advanced Data Structures & Algorithms", pages: 55 },
    ]
  },
  {
    id: "tb-3",
    title: "Database System Concepts (6th Edition)",
    author: "Silberschatz, Korth & Sudarshan",
    coverUrl: "https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?w=400&auto=format&fit=crop&q=80",
    subject: "Database Management Systems",
    category: "Core Engineering",
    pages: 580,
    chaptersCount: 12,
    progress: 72,
    status: "In Progress",
    lastStudied: "3 days ago",
    topics: [
      { id: "top-301", name: "Relational Algebra & SQL Queries", mastery: 85, status: "Strong" },
      { id: "top-302", name: "Normalization (1NF to BCNF)", mastery: 74, status: "Good" },
      { id: "top-303", name: "ACID Properties & Transaction Concurrency", mastery: 65, status: "Needs Improvement" },
      { id: "top-304", name: "Indexing (B-Trees & Hash)", mastery: 70, status: "Good" },
    ],
    chapters: [
      { id: "ch-31", number: 1, title: "Relational Model and SQL", pages: 80 },
      { id: "ch-32", number: 2, title: "Database Design and Normalization", pages: 75 },
      { id: "ch-33", number: 3, title: "Transactions and ACID Concurrency", pages: 90 },
    ]
  },
  {
    id: "tb-4",
    title: "Operating System Concepts (Dinosaur Book)",
    author: "Silberschatz & Galvin",
    coverUrl: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&auto=format&fit=crop&q=80",
    subject: "Operating Systems",
    category: "Core Engineering",
    pages: 490,
    chaptersCount: 9,
    progress: 68,
    status: "In Progress",
    lastStudied: "5 days ago",
    topics: [
      { id: "top-401", name: "Process Synchronization & Semaphores", mastery: 60, status: "Needs Improvement" },
      { id: "top-402", name: "Deadlocks & Banker\'s Algorithm", mastery: 75, status: "Good" },
      { id: "top-403", name: "Virtual Memory & Paging", mastery: 70, status: "Good" },
      { id: "top-404", name: "CPU Scheduling Algorithms", mastery: 82, status: "Good" },
    ],
    chapters: [
      { id: "ch-41", number: 1, title: "Introduction to Operating Systems", pages: 40 },
      { id: "ch-42", number: 2, title: "Processes and Threads", pages: 65 },
      { id: "ch-43", number: 3, title: "Process Synchronization and Deadlocks", pages: 70 },
      { id: "ch-44", number: 4, title: "Memory Management and Virtual Paging", pages: 85 },
    ]
  }
];

export const DEMO_SUMMARIES = [
  {
    id: "sum-1",
    textbookId: "tb-1",
    bookTitle: "Computer Networks: A Top-Down Approach",
    chapterId: "ch-3",
    chapterTitle: "Chapter 3: Transport Layer (TCP/IP Fundamentals)",
    topic: "TCP/IP Protocol Suite & 3-Way Handshake",
    difficulty: "Intermediate",
    length: "Detailed",
    createdDate: "2026-08-28",
    readTime: "6 min read",
    summaryText: `The Transmission Control Protocol (TCP) is a connection-oriented transport protocol that provides reliable, ordered, and error-checked delivery of a stream of octets between applications running on hosts communicating via an IP network. TCP breaks user data streams into segments, adds a TCP header containing sequence numbers and checksums, and manages flow control via sliding window mechanisms. Reliable connection establishment is achieved through a three-way handshake (SYN, SYN-ACK, ACK), ensuring both communication endpoints synchronize sequence numbers before data exchange occurs. In contrast to UDP's lightweight stateless datagram delivery, TCP guarantees recovery against packet loss, duplication, and network congestion through additive increase / multiplicative decrease (AIMD) algorithms.`,
    simpleExplanation: `Think of TCP like sending certified postal mail with return receipts. Before sending your message, you call the recipient to check if they are ready (Handshake). You number every page (Sequence numbers). If a page gets lost in transit, you re-send just that page. When network traffic gets crowded, TCP automatically slows down so roads don't get jammed!`,
    keyConcepts: [
      "Connection-oriented vs Connectionless transport layer paradigms",
      "Reliable byte-stream transmission using Sequence and Acknowledgment numbers",
      "TCP 3-Way Handshake (SYN -> SYN-ACK -> ACK) and 4-way Teardown (FIN -> ACK)",
      "Flow Control using the Receive Window (rwnd) to prevent buffer overflows",
      "Congestion Control using Congestion Window (cwnd) with Slow Start and Congestion Avoidance"
    ],
    keyPoints: [
      "TCP operates at Layer 4 (Transport Layer) of the OSI model.",
      "Ensures zero loss through selective acknowledgments (SACK) and retransmissions.",
      "Connection termination requires 4 segments (FIN, ACK, FIN, ACK).",
      "TCP header minimum size is 20 bytes (up to 60 bytes with options).",
      "UDP is preferred for real-time applications like video streaming and gaming where low latency beats guaranteed delivery."
    ],
    definitions: [
      {
        term: "Transmission Control Protocol (TCP)",
        definition: "A robust connection-oriented transport protocol providing reliable, ordered, and byte-stream delivery with flow and congestion control."
      },
      {
        term: "Three-Way Handshake",
        definition: "The synchronization method used by TCP to establish a connection between client and server using SYN, SYN-ACK, and ACK packets."
      },
      {
        term: "Sliding Window Protocol",
        definition: "A flow control mechanism allowing the sender to transmit multiple packets before requiring an acknowledgment."
      },
      {
        term: "AIMD (Additive Increase Multiplicative Decrease)",
        definition: "The congestion control algorithm where cwnd increases linearly upon success and drops exponentially upon packet loss."
      }
    ],
    formulas: [
      {
        name: "TCP Throughput Formula (Mathis Equation)",
        formula: "Throughput ≤ (1.22 × MSS) / (RTT × √p)",
        description: "Where MSS is Maximum Segment Size, RTT is Round Trip Time, and p is Packet Loss Rate."
      },
      {
        name: "Estimated RTT (Exponential Moving Average)",
        formula: "EstimatedRTT = (1 - α) × EstimatedRTT + α × SampleRTT",
        description: "Standard α = 0.125 (smoothing parameter for dynamic retransmission timeout)."
      },
      {
        name: "Effective Window Size",
        formula: "Window = min(cwnd, rwnd)",
        description: "Transmission capacity limited by receiver buffer (rwnd) and network state (cwnd)."
      }
    ],
    examples: [
      {
        title: "Establishing a TCP Connection (3-Way Handshake)",
        code: `Client                    Server
  |                         |
  |--- SYN (seq=100) ------>|  (1. Client asks to connect)
  |<-- SYN-ACK (seq=300, ---|  (2. Server agrees and confirms)
  |            ack=101)     |
  |--- ACK (ack=301) ------>|  (3. Client confirms receipt)
  |                         |
  [ Connection Established: Reliable Stream Ready ]`
      }
    ],
    quickRevision: [
      "TCP = Reliable, ordered, connection-oriented.",
      "3-Way Handshake = SYN -> SYN+ACK -> ACK.",
      "Flow control uses rwnd (protects receiver); Congestion control uses cwnd (protects network).",
      "AIMD increases window linearly, halves it upon packet loss."
    ],
    translations: {
      ta: {
        summaryText: "டிரான்ஸ்மிஷன் கண்ட்ரோல் புரோட்டோகால் (TCP) என்பது ஒரு நம்பகமான, வரிசைப்படுத்தப்பட்ட இணைப்பு சார்ந்த போக்குவரத்து நெறிமுறையாகும். இது ஐபி நெட்வொர்க்கில் உள்ள பயன்பாடுகளுக்கு இடையே பிழையின்றி தரவை வழங்குகிறது. TCP மூன்று வழி கைகுலுக்கல் (SYN, SYN-ACK, ACK) மூலம் இணைப்பை உருவாக்குகிறது.",
        simpleExplanation: "TCP என்பது ரசீதுடன் கூடிய பதிவுத் தபால் போன்றது. செய்தியை அனுப்பும் முன், பெறுநர் தயாராக உள்ளாரா என உறுதி செய்து (Handshake), ஒவ்வொரு பக்கத்திற்கும் வரிசை எண் கொடுத்து அனுப்புகிறது. ஏதேனும் பக்கம் தொலைந்தால் மீண்டும் அனுப்பப்படும்.",
        keyPoints: [
          "TCP என்பது OSI மாதிரியின் 4-வது அடுக்கில் (Transport Layer) இயங்குகிறது.",
          "SYN, SYN-ACK, ACK ஆகிய 3-படி கைகுலுக்கல் மூலம் நம்பகமான இணைப்பு நிறுவப்படுகிறது.",
          "பாக்கெட் இழப்பு ஏற்பட்டால் தானாகவே மறுபரிமாற்றம் செய்யும் வசதி கொண்டது."
        ]
      },
      hi: {
        summaryText: "ट्रांसमिशन कंट्रोल प्रोटोकॉल (TCP) एक कनेक्शन-उन्मुख ट्रांसपोर्ट लेयर प्रोटोकॉल है जो आईपी नेटवर्क के माध्यम से विश्वसनीय, क्रमित और त्रुटि-मुक्त डेटा ट्रांसमिशन प्रदान करता है। यह डेटा ट्रांसफर शुरू करने से पहले 3-वे हैंडशेक (SYN, SYN-ACK, ACK) का उपयोग करता है।",
        simpleExplanation: "टीसीपी को पावती रसीद वाले डाक पत्र की तरह समझें। डेटा भेजने से पहले यह सुनिश्चित करता है कि रिसीवर तैयार है या नहीं। यदि कोई पैकेट रास्ते में छूट जाता है, तो उसे दोबारा भेजा जाता है।",
        keyPoints: [
          "टीसीपी ओएसआई मॉडल की लेयर 4 (ट्रांसपोर्ट लेयर) पर कार्य करता है।",
          "3-वे हैंडशेक के माध्यम से कनेक्शन स्थापित होता है।",
          "यह फ्लो कंट्रोल और कंजेशन कंट्रोल का पूर्ण प्रबंधन करता है।"
        ]
      },
      te: {
        summaryText: "ట్రాన్స్‌మిషన్ కంట్రోల్ ప్రోటోకాల్ (TCP) అనేది విశ్వసనీయమైన, కనెక్షన్-ఆధారిత ట్రాన్స్‌పోర్ట్ ప్రోటోకాల్. ఇది IP నెట్‌వర్క్ ద్వారా లోపాలు లేని డేటా బదిలీని అందిస్తుంది. డేటా ప్రసారానికి ముందు 3-వే హ్యాండ్‌షేక్ నిర్వహిస్తుంది.",
        simpleExplanation: "TCP అనేది రశీదుతో కూడిన రిజిస్టర్డ్ పోస్ట్ వంటిది. డేటా పంపే ముందు స్వీకర్త సిద్ధంగా ఉన్నారా లేదా అని తనిఖీ చేస్తుంది మరియు కోల్పోయిన ప్యాకెట్లను తిరిగి పంపుతుంది.",
        keyPoints: [
          "TCP అనేది OSI మోడల్ యొక్క 4వ లేయర్‌లో పనిచేస్తుంది.",
          "3-వే హ్యాండ్‌షేక్ (SYN, SYN-ACK, ACK) ద్వారా కనెక్షన్ స్థాపించబడుతుంది."
        ]
      },
      kn: {
        summaryText: "ಟ್ರಾನ್ಸ್‌ಮಿಷನ್ ಕಂಟ್ರೋಲ್ ಪ್ರೋಟೋಕಾಲ್ (TCP) ಒಂದು ವಿಶ್ವಾಸಾರ್ಹ ಮತ್ತು ಸಂಪರ್ಕ-ಆಧಾರಿತ ಸಾರಿಗೆ ಪ್ರೋಟೋಕಾಲ್ ಆಗಿದೆ. ಇದು 3-ವೇ ಹ್ಯಾಂಡ್‌ಶೇಕ್ ಮೂಲಕ ಸುರಕ್ಷಿತ ಸಂಪರ್ಕವನ್ನು ಸ್ಥಾಪಿಸುತ್ತದೆ.",
        simpleExplanation: "TCP ನೋಂದಾಯಿತ ಅಂಚೆಯಂತೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ. ಡೇಟಾ ತಲುಪಿದೆ ಎಂದು ಖಚಿತಪಡಿಸುತ್ತದೆ ಮತ್ತು ತಪ್ಪಿದ ಭಾಗಗಳನ್ನು ಮರುಕಳುಹಿಸುತ್ತದೆ.",
        keyPoints: [
          "TCP 4ನೇ ಹಂತದಲ್ಲಿ (Transport Layer) ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ.",
          "ವಿಶ್ವಾಸಾರ್ಹ ಸಂಪರ್ಕಕ್ಕಾಗಿ 3-ವೇ ಹ್ಯಾಂಡ್‌ಶೇಕ್ ಬಳಸಲಾಗುತ್ತದೆ."
        ]
      },
      ml: {
        summaryText: "ട്രാൻസ്മിഷൻ കൺട്രോൾ പ്രോട്ടോക്കോൾ (TCP) ഒരു കണക്ഷൻ-ഓറിയന്റഡ് ട്രാൻസ്പോർട്ട് പ്രോട്ടോക്കോളാണ്. ഇത് സുരക്ഷിതവും പിശകില്ലാത്തതുമായ ഡാറ്റാ കൈമാറ്റം ഉറപ്പാക്കുന്നു.",
        simpleExplanation: "രസീത് സഹിതം അയക്കുന്ന രജിസ്റ്റേർഡ് തപാൽ പോലെയാണ് TCP പ്രവർത്തിക്കുന്നത്. ഡാറ്റ കൃത്യമായി എത്തിയെന്ന് ഉറപ്പാക്കുന്നു.",
        keyPoints: [
          "OSI മോഡലിന്റെ നാലാം ലെയറിലാണ് TCP പ്രവർത്തിക്കുന്നത്.",
          "3-വേ ഹാൻഡ്ഷേക്ക് വഴിയാണ് കണക്ഷൻ സ്ഥാപിക്കുന്നത്."
        ]
      },
      bn: {
        summaryText: "ট্রান্সমিশন কন্ট্রোল প্রোটোকল (TCP) একটি নির্ভরযোগ্য সংযোগ-ভিত্তিক ট্রান্সপোর্ট প্রোটোকল যা আইপি নেটওয়ার্কের মাধ্যমে সঠিক ও সুশৃঙ্খল ডেটা স্থানান্তর নিশ্চিত করে।",
        simpleExplanation: "টিসিপি হলো রসিদযুক্ত রেজিস্টার্ড ডাকের মতো। বার্তা পাঠানোর আগে প্রাপক প্রস্তুত কিনা তা ৩-ধাপের হ্যান্ডশেকের মাধ্যমে যাচাই করে।",
        keyPoints: [
          "টিসিপি ওএসআই মডেলের ৪র্থ স্তরে (ট্রান্সপোর্ট লেয়ার) কাজ করে।",
          "নির্ভরযোগ্য ডেটা ডেলিভারির জন্য ৩-ওয়ে হ্যান্ডশেক ব্যবহার করা হয়।"
        ]
      }
    }
  },
  {
    id: "sum-2",
    textbookId: "tb-2",
    bookTitle: "Python Programming: An Introduction to Computer Science",
    chapterId: "ch-22",
    chapterTitle: "Chapter 2: Object-Oriented Programming and Encapsulation",
    topic: "Encapsulation & OOP Principles",
    difficulty: "Beginner",
    length: "Medium",
    createdDate: "2026-08-27",
    readTime: "4 min read",
    summaryText: `Object-Oriented Programming (OOP) in Python centers on classes and objects. Encapsulation is the fundamental principle of bundling data attributes and the methods that operate on that data into a single unit (class) while restricting direct external access to internal state components. In Python, encapsulation is implemented conventionally through single underscore (_protected) and double underscore (__private) name mangling. By providing getter and setter properties, classes ensure data integrity, maintain abstraction boundaries, and decouple implementation details from public interfaces.`,
    simpleExplanation: `Encapsulation is like a medical capsule or a smartphone. The internal electronics and battery are sealed inside a casing. You only interact with the screen and buttons (public methods). You don't directly solder the battery wires to adjust volume (data protection)!`,
    keyConcepts: [
      "Class blueprints vs Object instances",
      "Encapsulation and Data Hiding via private attributes",
      "Python name mangling with double underscore prefixes",
      "Properties (@property, @setter) for clean pythonic accessors"
    ],
    keyPoints: [
      "Classes encapsulate state (attributes) and behavior (methods).",
      "Double underscore '__variable' invokes name mangling (_ClassName__variable).",
      "Promotes loose coupling and high cohesion in software engineering."
    ],
    definitions: [
      {
        term: "Encapsulation",
        definition: "The mechanism of bundling data and methods operating on that data within a class while restricting direct access to internal components."
      },
      {
        term: "Name Mangling",
        definition: "Python's internal renaming of double-underscore attributes to prevent unintentional overriding in subclasses."
      }
    ],
    formulas: [],
    examples: [
      {
        title: "Encapsulation with @property in Python",
        code: `class BankAccount:
    def __init__(self, owner, balance):
        self.owner = owner
        self.__balance = balance  # Private attribute

    @property
    def balance(self):
        """Getter for balance"""
        return self.__balance

    def deposit(self, amount):
        if amount > 0:
            self.__balance += amount
            return True
        return False

# Usage
acc = BankAccount("Alex", 1000)
acc.deposit(250)
print(f"Balance: \${acc.balance}") # 1250`
      }
    ],
    quickRevision: [
      "Encapsulation = Bundling data + methods together.",
      "Private variables use '__' prefix.",
      "Use @property for safe read/write access."
    ],
    translations: {
      ta: {
        summaryText: "பைத்தானில் ஆப்ஜெக்ட்-ஓரியண்டட் புரோகிராமிங் (OOP) என்பது கிளாஸ் மற்றும் ஆப்ஜெக்ட்டுகளை அடிப்படையாகக் கொண்டது. என்காப்சுலேஷன் என்பது தரவுகளையும் முறைகளையும் ஒரே கிளாஸுக்குள் இணைத்து பாதுகாக்கும் செயல்முறையாகும்.",
        simpleExplanation: "என்காப்சுலேஷன் என்பது ஒரு மருந்து மாத்திரை போன்றது. உள் மருந்துகள் வெளியில் தெரியாமல் மூடிக்குள் வைக்கப்படுவது போல, கிளாஸின் தரவுகள் பாதுகாப்பாக வைக்கப்படுகின்றன.",
        keyPoints: [
          "தரவுகளையும் செயல்களையும் ஒரே இடத்தில் இணைக்கிறது.",
          "தனியார் மாறிகளுக்கு '__' என்ற இரட்டை அடிக்கோடு பயன்படுத்தப்படுகிறது."
        ]
      },
      hi: {
        summaryText: "पायथन में ऑब्जेक्ट-ओरिएंटेड प्रोग्रामिंग (OOP) क्लास और ऑब्जेक्ट्स पर केंद्रित है। इनकैप्सुलेशन डेटा और विधियों को एक इकाई में बांधने और आंतरिक स्थिति को सुरक्षित रखने का सिद्धांत है।",
        simpleExplanation: "इनकैप्सुलेशन एक मेडिकल कैप्सूल जैसा है जिसमें दवा अंदर बंद होती है। आप सीधे आंतरिक डेटा को संशोधित किए बिना केवल सार्वजनिक विधियों का उपयोग करते हैं।",
        keyPoints: [
          "डेटा और मेथड्स को क्लास में बांधता है।",
          "प्राइवेट वेरिएबल्स के लिए '__' प्रीफिक्स का उपयोग होता है।"
        ]
      }
    }
  }
];

export const DEMO_QUIZZES = [
  {
    id: "quiz-1",
    textbookId: "tb-1",
    title: "Computer Networks: TCP/IP & Transport Layer Mastery",
    topic: "TCP/IP Protocol Suite",
    subject: "Computer Networks",
    difficulty: "Intermediate",
    timeLimitMinutes: 10,
    totalQuestions: 5,
    questions: [
      {
        id: "q-101",
        question: "Which transport protocol guarantees reliable, ordered, and error-checked delivery of a byte stream?",
        options: [
          "User Datagram Protocol (UDP)",
          "Transmission Control Protocol (TCP)",
          "Internet Protocol (IP)",
          "Address Resolution Protocol (ARP)"
        ],
        correctAnswer: 1, // 0-indexed -> TCP
        explanation: "TCP establishes a virtual connection using sequence numbers and ACKs to guarantee reliable, ordered data delivery.",
        topic: "TCP/IP Protocol Suite",
        difficulty: "Beginner"
      },
      {
        id: "q-102",
        question: "During a TCP connection establishment, what is the exact packet sequence in the 3-Way Handshake?",
        options: [
          "ACK → SYN → SYN-ACK",
          "SYN → ACK → SYN-ACK",
          "SYN → SYN-ACK → ACK",
          "FIN → ACK → FIN-ACK"
        ],
        correctAnswer: 2,
        explanation: "The client first sends SYN, the server responds with SYN-ACK, and the client confirms with ACK.",
        topic: "TCP/IP Protocol Suite",
        difficulty: "Intermediate"
      },
      {
        id: "q-103",
        question: "What is the minimum header size of a standard TCP segment without options?",
        options: [
          "8 bytes",
          "20 bytes",
          "32 bytes",
          "64 bytes"
        ],
        correctAnswer: 1,
        explanation: "The standard TCP header is 20 bytes long (5 words of 32 bits each). UDP by comparison is only 8 bytes.",
        topic: "TCP/IP Protocol Suite",
        difficulty: "Intermediate"
      },
      {
        id: "q-104",
        question: "Which congestion control mechanism decreases the Congestion Window (cwnd) by half upon packet loss?",
        options: [
          "Additive Increase",
          "Multiplicative Decrease",
          "Fast Retransmit only",
          "Slow Start exponential increase"
        ],
        correctAnswer: 1,
        explanation: "In AIMD (Additive Increase Multiplicative Decrease), the window is halved upon loss detection to relieve network bottleneck.",
        topic: "Congestion Control",
        difficulty: "Advanced"
      },
      {
        id: "q-105",
        question: "How many segments are exchanged to gracefully terminate a TCP connection?",
        options: [
          "2 segments (FIN, ACK)",
          "3 segments (FIN, FIN-ACK, ACK)",
          "4 segments (FIN, ACK, FIN, ACK)",
          "1 segment (RST)"
        ],
        correctAnswer: 2,
        explanation: "TCP connection closure is a 4-way handshake because each simplex direction is closed independently with FIN and ACK.",
        topic: "TCP/IP Protocol Suite",
        difficulty: "Intermediate"
      }
    ]
  },
  {
    id: "quiz-2",
    textbookId: "tb-2",
    title: "Python Object-Oriented Programming Fundamentals",
    topic: "OOP & Classes",
    subject: "Python Programming",
    difficulty: "Beginner",
    timeLimitMinutes: 8,
    totalQuestions: 4,
    questions: [
      {
        id: "q-201",
        question: "In Python, how do you specify that an attribute should undergo name mangling for private encapsulation?",
        options: [
          "Prefix with single underscore like '_attr'",
          "Prefix with double underscore like '__attr'",
          "Use the 'private' keyword before variable name",
          "Wrap it inside a '@protected' decorator"
        ],
        correctAnswer: 1,
        explanation: "Python transforms double underscore variables (e.g. __balance) into _ClassName__balance via name mangling.",
        topic: "OOP & Classes",
        difficulty: "Beginner"
      },
      {
        id: "q-202",
        question: "What built-in decorator is used in Python to define a getter property?",
        options: [
          "@getter",
          "@property",
          "@accessor",
          "@classmethod"
        ],
        correctAnswer: 1,
        explanation: "The @property decorator turns a method into a read-only attribute getter with dot-syntax access.",
        topic: "OOP & Classes",
        difficulty: "Beginner"
      },
      {
        id: "q-203",
        question: "What parameter must always be the first argument in a standard instance method in Python?",
        options: [
          "this",
          "self",
          "cls",
          "super"
        ],
        correctAnswer: 1,
        explanation: "'self' represents the instance of the class and is explicitly passed as the first parameter in Python methods.",
        topic: "OOP & Classes",
        difficulty: "Beginner"
      },
      {
        id: "q-204",
        question: "What is the primary objective of Encapsulation in software design?",
        options: [
          "To make programs execute twice as fast",
          "To bundle data and methods together and protect internal state from unwanted mutation",
          "To allow multiple classes to inherit from 10 different parents simultaneously",
          "To compile Python bytecode into C binaries"
        ],
        correctAnswer: 1,
        explanation: "Encapsulation hides internal implementation details and restricts unauthorized modifications, preserving integrity.",
        topic: "OOP & Classes",
        difficulty: "Beginner"
      }
    ]
  }
];

export const DEMO_RECOMMENDATIONS = [
  {
    id: "rec-1",
    topic: "TCP/IP Protocol Suite & Handshake",
    subject: "Computer Networks",
    reason: "Your recent quiz accuracy in TCP/IP was 45%. Revising handshake mechanics will significantly boost your score.",
    recommendedDifficulty: "Beginner",
    estimatedMinutes: 8,
    actionType: "summary",
    targetSummaryId: "sum-1",
    targetQuizId: "quiz-1",
    urgency: "High",
    badge: "Weak Topic Detected"
  },
  {
    id: "rec-2",
    topic: "Subnetting & CIDR Calculation",
    subject: "Computer Networks",
    reason: "Diagnostic indicates 50% mastery in IP addressing. Practice step-by-step bitmask exercises.",
    recommendedDifficulty: "Beginner",
    estimatedMinutes: 12,
    actionType: "quiz",
    targetQuizId: "quiz-1",
    urgency: "Medium",
    badge: "Needs Improvement"
  },
  {
    id: "rec-3",
    topic: "Process Synchronization & Semaphores",
    subject: "Operating Systems",
    reason: "Critical concept in OS exams. Strengthen your understanding of mutexes and race conditions.",
    recommendedDifficulty: "Intermediate",
    estimatedMinutes: 15,
    actionType: "summary",
    targetSummaryId: "sum-1",
    urgency: "Medium",
    badge: "Exam High-Yield"
  },
  {
    id: "rec-4",
    topic: "Advanced Python Decorators & Generators",
    subject: "Python Programming",
    reason: "You have achieved 90% in Python OOP! Ready to advance to functional metaprogramming.",
    recommendedDifficulty: "Advanced",
    estimatedMinutes: 10,
    actionType: "quiz",
    targetQuizId: "quiz-2",
    urgency: "Low",
    badge: "Level Up"
  }
];

export const SUBJECT_PROGRESS = [
  { subject: "Python Programming", progress: 85, color: "bg-emerald-500", text: "text-emerald-700", bgLight: "bg-emerald-50" },
  { subject: "Database Management (DBMS)", progress: 72, color: "bg-brand-500", text: "text-brand-700", bgLight: "bg-brand-50" },
  { subject: "Operating Systems", progress: 68, color: "bg-amber-500", text: "text-amber-700", bgLight: "bg-amber-50" },
  { subject: "Computer Networks", progress: 55, color: "bg-rose-500", text: "text-rose-700", bgLight: "bg-rose-50" },
];

export const RECENT_ACTIVITIES = [
  {
    id: "act-1",
    type: "upload",
    title: "Uploaded 'Computer Networks: Kurose & Ross'",
    time: "2 hours ago",
    badge: "Upload",
    badgeColor: "bg-blue-100 text-blue-700"
  },
  {
    id: "act-2",
    type: "summary",
    title: "Generated AI Summary for Chapter 3: Transport Layer",
    time: "1 hour ago",
    badge: "Summary",
    badgeColor: "bg-purple-100 text-purple-700"
  },
  {
    id: "act-3",
    type: "quiz",
    title: "Completed 'TCP/IP Fundamentals' Quiz (Score: 70%)",
    time: "45 mins ago",
    badge: "Quiz",
    badgeColor: "bg-amber-100 text-amber-700"
  },
  {
    id: "act-4",
    type: "audio",
    title: "Listened to Chapter 3 Summary in Tamil (TTS)",
    time: "20 mins ago",
    badge: "Audio TTS",
    badgeColor: "bg-emerald-100 text-emerald-700"
  }
];
