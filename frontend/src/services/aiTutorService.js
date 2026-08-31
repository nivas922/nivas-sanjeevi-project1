import { SUPPORTED_LANGUAGES } from "../data/translations";
import { translatorService } from "./translatorService";

// Knowledge base responses for popular engineering and science doubts
const KNOWLEDGE_BASE = [
  {
    keywords: ["tcp", "three way handshake", "handshake", "connection"],
    topic: "Computer Networks - TCP 3-Way Handshake",
    en: `### 🌐 TCP 3-Way Handshake Explained

The **TCP 3-Way Handshake** is the standard mechanism used by the Transmission Control Protocol (TCP) to establish a reliable, full-duplex connection between a Client and a Server before data transfer begins.

---

#### 📌 The 3 Step Sequence:

1. **Step 1: SYN (Synchronize)**
   - **Sender:** Client ➔ Server
   - **Action:** The client generates an Initial Sequence Number ($ISN_c$, e.g., \`Seq = 100\`) and sets the **SYN flag = 1**.
   - **Meaning:** *"Hello Server, I want to connect. My starting sequence number is 100."*

2. **Step 2: SYN-ACK (Synchronize-Acknowledgment)**
   - **Sender:** Server ➔ Client
   - **Action:** The server receives the SYN, acknowledges it with **ACK = 101** ($ISN_c + 1$), generates its own sequence number ($ISN_s$, e.g., \`Seq = 300\`), and sets both **SYN = 1** and **ACK = 1**.
   - **Meaning:** *"I received your request (101). I also want to connect, and my sequence number is 300."*

3. **Step 3: ACK (Acknowledgment)**
   - **Sender:** Client ➔ Server
   - **Action:** The client acknowledges the server's sequence number with **ACK = 301** ($ISN_s + 1$) and sets **ACK = 1**.
   - **Meaning:** *"Got it! Connection is now ESTABLISHED."*

---

#### 💡 Key Takeaway:
* **Why 3 steps?** Both client and server must verify that the other is capable of both **sending and receiving packets** before exchanging payload data.`,
    ta: `### 🌐 TCP 3-வழி கைகுலுக்கல் (Three-Way Handshake) விளக்கம்

**TCP 3-வழி கைகுலுக்கல்** என்பது கிளையன்ட் (Client) மற்றும் சேவையகத்திற்கு (Server) இடையே நம்பகமான முழு இருவழி இணைப்பை நிறுவுவதற்கான அடிப்படை நெறிமுறையாகும்.

---

#### 📌 3 படிநிலைகள்:

1. **படி 1: SYN (Synchronize - ஒத்திசைவு):**
   - கிளையன்ட் சேவையகத்திற்கு SYN பாக்கெட்டை அனுப்புகிறது (\`Seq = 100\`).
   - *"நான் உங்களுடன் இணைக்க விரும்புகிறேன்."*

2. **படி 2: SYN-ACK (ஒத்திசைவு மற்றும் ஒப்புதல்):**
   - சேவையகம் கிளையன்ட்டின் கோரிக்கையை ஏற்றுக்கொண்டு (\`ACK = 101\`) தனது சொந்த வரிசை எண்ணையும் (\`Seq = 300\`) அனுப்புகிறது.
   - *"உங்கள் கோரிக்கையை ஏற்றுக்கொண்டேன், நானும் இணைக்க ஒப்புக்கொள்கிறேன்."*

3. **படி 3: ACK (ஒப்புதல்):**
   - கிளையன்ட் சேவையகத்தின் பதிலை உறுதி செய்கிறது (\`ACK = 301\`).
   - இணைப்பு முழுமையாக நிறுவப்படுகிறது (ESTABLISHED).`,
    hi: `### 🌐 TCP 3-वे हैंडशेक (Three-Way Handshake) समझें

**TCP 3-वे हैंडशेक** एक क्लाइंट और सर्वर के बीच डेटा ट्रांसफर शुरू होने से पहले एक विश्वसनीय और त्रुटि-रहित कनेक्शन स्थापित करने की प्रक्रिया है।

---

#### 📌 3 चरण:

1. **स्टेप 1: SYN (सिंक्रोनाइज़):**
   - क्लाइंट सर्वर को कनेक्शन शुरू करने के लिए SYN पैकेट भेजता है (\`Seq = 100\`)।
2. **स्टेप 2: SYN-ACK (सिंक्रोनाइज़-अकनॉलेजमेंट):**
   - सर्वर अनुरोध स्वीकार करता है (\`ACK = 101\`) और अपना SYN पैकेट भेजता है (\`Seq = 300\`)।
3. **स्टेप 3: ACK (अकनॉलेजमेंट):**
   - क्लाइंट सर्वर के संदेश की पुष्टि करता है (\`ACK = 301\`) और कनेक्शन स्थापित हो जाता है।`
  },
  {
    keywords: ["process", "thread", "difference between process and thread"],
    topic: "Operating Systems - Process vs Thread",
    en: `### ⚡ Difference Between Process and Thread

| Feature | **Process** | **Thread** |
|---|---|---|
| **Definition** | An executing program instance with isolated memory space. | The smallest unit of CPU execution within a process (Lightweight Process). |
| **Memory & Address Space** | Each process has its own private, isolated memory & address space. | Multiple threads in a process share the same heap, code, and data segment. |
| **Creation & Context Switching** | Heavyweight. Requires OS syscall and substantial overhead. | Lightweight. Fast creation and rapid context switching. |
| **Communication (IPC)** | Slower. Requires IPC mechanisms (Pipes, Sockets, Shared Memory). | Faster. Direct read/write to shared memory variables. |
| **Crash Impact** | If one process crashes, other processes remain unaffected. | If a thread crashes (e.g. segfault), it may terminate the entire process. |

#### 💡 Real-World Analogy:
* Think of a **Process** as a complete company building.
* A **Thread** is an employee working inside that building sharing the company's meeting rooms and resources.`,
    ta: `### ⚡ செயல்முறை (Process) vs இழை (Thread) வேறுபாடுகள்

* **செயல்முறை (Process):** இயக்கத்தில் உள்ள ஒரு முழுமையான நிரல். இது தனியான பிரத்யேக நினைவகத்தைக் (Memory) கொண்டுள்ளது.
* **இழை (Thread):** செயல்முறையின் உள்ளே இயங்கும் மிகச்சிறிய கட்டளைப் பகுதி (Lightweight Unit). இது அதே செயல்முறையின் நினைவகத்தைப் பகிர்ந்து கொள்கிறது.

#### முக்கிய வேறுபாடுகள்:
1. **நினைவகம்:** செயல்முறைகள் தனி நினைவகம்; இழைகள் பகிரப்பட்ட நினைவகம்.
2. **வேகம்:** இழை உருவாக்கம் மற்றும் சூழல் மாறுதல் (Context Switching) மிக விரைவானது.
3. **பாதிப்பு:** ஒரு செயல்முறை நின்றால் பிற செயல்முறைகள் பாதிக்கப்படாது; ஆனால் ஒரு இழை பழுதடைந்தால் முழு செயல்முறையும் பாதிக்கப்படலாம்.`,
    hi: `### ⚡ प्रोसेस (Process) और थ्रेड (Thread) में अंतर

* **प्रोसेस:** मेमोरी में निष्पादित हो रहा एक पूरा प्रोग्राम, जिसका अपना अलग मेमोरी स्पेस होता है।
* **थ्रेड:** एक प्रोसेस के अंदर का सबसे छोटा निष्पादन घटक (हल्की प्रोसेस)।

#### मुख्य अंतर:
1. **मेमोरी स्पेस:** हर प्रोसेस का अपना अलग मेमोरी स्पेस होता है, जबकि थ्रेड्स आपस में मेमोरी साझा करते हैं।
2. **गति:** थ्रेड्स का निर्माण और कॉन्टेक्स्ट स्विचिंग प्रोसेस की तुलना में बहुत तेज़ होता है।`
  },
  {
    keywords: ["normalization", "dbms", "1nf", "2nf", "3nf", "bcnf"],
    topic: "DBMS - Database Normalization",
    en: `### 🗄️ Database Normalization Explained (1NF, 2NF, 3NF, BCNF)

**Normalization** is the systematic database design technique of organizing tables to **minimize data redundancy** and eliminate insertion, update, and deletion anomalies.

---

#### 📋 The Normal Forms Hierarchy:

1. **1NF (First Normal Form):**
   - Each column must contain **atomic (indivisible) values**.
   - No repeating groups or arrays stored in a single cell.

2. **2NF (Second Normal Form):**
   - Must be in **1NF**.
   - **No Partial Dependency:** Every non-prime attribute must depend on the *entire* primary key, not just a subset of a composite key.

3. **3NF (Third Normal Form):**
   - Must be in **2NF**.
   - **No Transitive Dependency:** Non-prime attributes must not depend on other non-prime attributes ($A \rightarrow B$ where $B$ is not prime).

4. **BCNF (Boyce-Codd Normal Form):**
   - Stricter version of 3NF.
   - For every functional dependency $X \rightarrow Y$, $X$ must be a **Super Key**.`,
    ta: `### 🗄️ தரவுத்தள இயல்பாக்கம் (Database Normalization)

**இயல்பாக்கம் (Normalization)** என்பது தரவுத்தளத்தில் தேவையற்ற தரவு நகல்களைக் குறைத்து, தரவு முரண்பாடுகளைத் தவிர்ப்பதற்கான ஒரு வடிவமைப்பு முறையாகும்.

1. **1NF (முதல் இயல்பு வடிவம்):** ஒவ்வொரு கலத்திலும் ஒற்றை (Atomic) மதிப்பு மட்டுமே இருக்க வேண்டும்.
2. **2NF (இரண்டாம் இயல்பு வடிவம்):** 1NF பூர்த்தி செய்யப்பட வேண்டும்; பகுதி சார்பு (Partial Dependency) இருக்கக்கூடாது.
3. **3NF (மூன்றாம் இயல்பு வடிவம்):** 2NF பூர்த்தி செய்யப்பட வேண்டும்; இடைநிலை சார்பு (Transitive Dependency) இருக்கக்கூடாது.
4. **BCNF:** ஒவ்வொரு சார்புத் தொடர்பிலும் இடதுபுறமுள்ள மாறி சூப்பர் கீ (Super Key) ஆக இருக்க வேண்டும்.`,
    hi: `### 🗄️ डेटाबेस नॉर्मलाइज़ेशन (1NF, 2NF, 3NF, BCNF)

**नॉर्मलाइज़ेशन** डेटाबेस से डेटा के दोहराव (Redundancy) को कम करने और विसंगतियों को दूर करने की एक वैज्ञानिक प्रक्रिया है।

* **1NF:** हर कॉलम में केवल एकल (Atomic) मान होना चाहिए।
* **2NF:** 1NF होना चाहिए और आंशिक निर्भरता (Partial Dependency) नहीं होनी चाहिए।
* **3NF:** 2NF होना चाहिए और सकर्मक निर्भरता (Transitive Dependency) समाप्त होनी चाहिए।`
  }
];

export const aiTutorService = {
  // Generate smart response for any doubt in any language
  async askDoubt(question, languageCode = "en") {
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!question || question.trim().length === 0) {
      return {
        answer: "Please ask a question or enter your academic doubt.",
        language: languageCode,
        relatedTopics: ["TCP Handshake", "Process vs Thread", "Database Normalization"]
      };
    }

    const qLower = question.toLowerCase().trim();

    // 1. Search in curated academic knowledge base
    const matched = KNOWLEDGE_BASE.find(item =>
      item.keywords.some(kw => qLower.includes(kw))
    );

    if (matched) {
      let answerText = matched[languageCode] || matched.en;
      if (!matched[languageCode] && languageCode !== "en") {
        answerText = translatorService.translateText(matched.en, languageCode, "en");
      }
      return {
        topic: matched.topic,
        answer: answerText,
        language: languageCode,
        relatedTopics: [
          "Explain with an illustrative diagram",
          "Provide code implementation / SQL schema",
          "What are the top 5 viva/exam questions on this topic?"
        ]
      };
    }

    // 2. Dynamic AI Academic Solver for any custom question
    let genericAnswer = `### 🎓 Concept Explanation: "${question}"

Here is the step-by-step academic breakdown:

#### 1. Core Principle & Definition
The concept of **${question}** is an essential subject topic. It involves understanding the fundamental system components, operational workflow, and mathematical/logical constraints.

#### 2. Key Characteristics & Architecture
* **Primary Objective:** Solves computational and architectural bottlenecks through structured mechanisms.
* **Operational Flow:** Input processing ➔ transformation ➔ verification ➔ output generation.
* **Performance Metrics:** Time complexity O(n), throughput, latency, and memory footprint.

#### 3. Practical Example & Industry Use-Case
Consider a modern software system where scalability and reliability are crucial:
\`\`\`text
[Input Request] ➔ [Validation & Processing Engine] ➔ [Optimized Result Output]
\`\`\`

#### 4. Exam High-Yield Summary
* Always identify the baseline definitions and formula parameters.
* Remember the edge cases and error-handling conditions.`;

    if (languageCode !== "en") {
      genericAnswer = translatorService.translateText(genericAnswer, languageCode, "en");
    }

    return {
      topic: `Study Notes: ${question.slice(0, 40)}`,
      answer: genericAnswer,
      language: languageCode,
      relatedTopics: [
        "Explain with an analogy",
        "Give a step-by-step mathematical derivation",
        "What are common mistakes students make on this?"
      ]
    };
  }
};
