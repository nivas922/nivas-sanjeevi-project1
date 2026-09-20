import { env } from "../config/env.js";
import { aiConfig } from "../config/aiConfig.js";
import { DocumentChunk } from "../models/DocumentChunk.js";

export class AiSummaryService {
  /**
   * Exponential backoff retry wrapper for Gemini API calls
   */
  static async callGeminiApiWithRetry(prompt, options = {}) {
    const apiKey = env.GEMINI_API_KEY || aiConfig.gemini.apiKey;
    if (!apiKey) {
      if (env.NODE_ENV === "test") {
        if (prompt.includes("educational AI academic tutor") || prompt.includes("Student Question:") || prompt.includes("STRICT AI TUTOR RULES")) {
          return this.generateMockDoubtJsonFromPrompt(prompt);
        }
        if (prompt.includes("quiz") || prompt.includes("MCQ") || prompt.includes("questions") || prompt.includes("STRICT QUESTION GENERATION RULES")) {
          return this.generateMockQuizJsonFromPrompt(prompt);
        }
        // Return mock structured response for unit testing
        return JSON.stringify({
          summary: "Mocked academic summary for test environment.",
          overview: "Mocked academic overview for test environment.",
          keyPoints: ["Mocked Key Point 1", "Mocked Key Point 2"],
          definitions: [{ term: "Mock Term", meaning: "Mock Meaning" }],
          formulas: [{ name: "Mock Formula", formula: "E = mc^2", description: "Mock Desc" }],
          examples: [{ title: "Mock Example", code: "print('test')" }],
          examPoints: ["Mock Exam Point"],
          quickRevision: ["Mock Revision Point"]
        });
      }
      const err = new Error("AI service is currently unavailable. Please configure GEMINI_API_KEY in environment variables.");
      err.statusCode = 503;
      throw err;
    }


    const model = aiConfig.gemini.model || "gemini-1.5-flash";
    const url = `${aiConfig.gemini.endpoint}/${model}:generateContent?key=${apiKey}`;

    const maxRetries = options.maxRetries || 3;
    let attempt = 0;
    let delayMs = options.initialDelayMs || 500;

    while (attempt < maxRetries) {
      attempt++;
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              topP: 0.8
            }
          })
        });

        if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
          if (attempt >= maxRetries) {
            const errText = await response.text();
            const err = new Error(`Gemini API error ${response.status}: ${errText.slice(0, 200)}`);
            err.statusCode = response.status;
            throw err;
          }
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          delayMs *= 2;
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          const err = new Error(`Gemini API call failed with status ${response.status}: ${errText.slice(0, 200)}`);
          err.statusCode = response.status;
          throw err;
        }

        const data = await response.json();
        const geminiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!geminiText) {
          throw new Error("Gemini returned empty text candidate.");
        }

        return geminiText;
      } catch (err) {
        if (attempt >= maxRetries || (err.statusCode && err.statusCode !== 429 && err.statusCode < 500)) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2;
      }
    }

    throw new Error("Gemini API call failed after retries.");
  }

  /**
   * Helper to parse structured JSON from Gemini string response safely
   */
  static parseJsonFromGemini(text) {
    if (!text) return null;
    let clean = text.trim();
    if (clean.startsWith("```json")) {
      clean = clean.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
    } else if (clean.startsWith("```")) {
      clean = clean.replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    }
    try {
      return JSON.parse(clean);
    } catch {
      return null;
    }
  }

  /**
   * Step 1: Chunk-Level Summarization
   */
  static async summarizeChunk(chunk, targetLanguage = "en") {
    const prompt = `You are an expert academic tutor. Summarize the following textbook chunk content in language '${targetLanguage}'.
Do NOT invent facts, definitions, or formulas not present in the text.

Chapter: ${chunk.chapter || "Overview"}
Section: ${chunk.section || "General"}
Pages: ${chunk.pageStart || 1} - ${chunk.pageEnd || 1}

Text Content:
${chunk.text}

Return ONLY a valid JSON object in the following format:
{
  "summary": "Concise summary of this chunk",
  "keyPoints": ["Point 1", "Point 2"],
  "definitions": [{"term": "Term", "meaning": "Meaning"}],
  "formulas": [{"name": "Formula Name", "formula": "Formula Expression", "description": "Description"}],
  "examples": [{"title": "Example Title", "code": "Example text or code"}],
  "examPoints": ["Exam point 1"]
}`;

    const raw = await this.callGeminiApiWithRetry(prompt);
    const parsed = this.parseJsonFromGemini(raw);

    return {
      chunkId: chunk.id || chunk.chunkId,
      chapter: chunk.chapter || "Chapter 1: Overview",
      section: chunk.section || "General Content",
      pageStart: chunk.pageStart || 1,
      pageEnd: chunk.pageEnd || 1,
      chunkIndex: chunk.chunkIndex,
      summary: parsed?.summary || raw.slice(0, 300),
      keyPoints: Array.isArray(parsed?.keyPoints) ? parsed.keyPoints : [],
      definitions: Array.isArray(parsed?.definitions) ? parsed.definitions : [],
      formulas: Array.isArray(parsed?.formulas) ? parsed.formulas : [],
      examples: Array.isArray(parsed?.examples) ? parsed.examples : [],
      examPoints: Array.isArray(parsed?.examPoints) ? parsed.examPoints : []
    };
  }

  /**
   * Step 2: Section-Level Summarization
   */
  static async summarizeSection(sectionName, chunkSummaries, targetLanguage = "en") {
    if (chunkSummaries.length === 1) {
      return chunkSummaries[0];
    }

    const pageStart = Math.min(...chunkSummaries.map((c) => c.pageStart || 1));
    const pageEnd = Math.max(...chunkSummaries.map((c) => c.pageEnd || 1));

    const combinedText = chunkSummaries.map((c) => `Chunk (Pages ${c.pageStart}-${c.pageEnd}): ${c.summary}`).join("\n");

    const prompt = `Synthesize a coherent section-level academic summary in language '${targetLanguage}' for section '${sectionName}'.
Do NOT invent information.

Chunk Summaries:
${combinedText}

Return ONLY a valid JSON object:
{
  "summary": "Coherent section summary",
  "keyPoints": ["Key point 1", "Key point 2"],
  "definitions": [{"term": "Term", "meaning": "Meaning"}],
  "formulas": [{"name": "Formula", "formula": "Expression", "description": "Desc"}],
  "examples": [{"title": "Example", "code": "Code/Text"}],
  "examPoints": ["Exam point 1"]
}`;

    const raw = await this.callGeminiApiWithRetry(prompt);
    const parsed = this.parseJsonFromGemini(raw);

    return {
      section: sectionName,
      pageStart,
      pageEnd,
      summary: parsed?.summary || combinedText.slice(0, 500),
      keyPoints: Array.isArray(parsed?.keyPoints)
        ? parsed.keyPoints
        : chunkSummaries.flatMap((c) => c.keyPoints || []),
      definitions: Array.isArray(parsed?.definitions)
        ? parsed.definitions
        : chunkSummaries.flatMap((c) => c.definitions || []),
      formulas: Array.isArray(parsed?.formulas)
        ? parsed.formulas
        : chunkSummaries.flatMap((c) => c.formulas || []),
      examples: Array.isArray(parsed?.examples)
        ? parsed.examples
        : chunkSummaries.flatMap((c) => c.examples || []),
      examPoints: Array.isArray(parsed?.examPoints)
        ? parsed.examPoints
        : chunkSummaries.flatMap((c) => c.examPoints || [])
    };
  }

  /**
   * Step 3: Chapter-Level Summarization
   */
  static async summarizeChapter(chapterName, sectionSummaries, targetLanguage = "en") {
    const pageStart = Math.min(...sectionSummaries.map((s) => s.pageStart || 1));
    const pageEnd = Math.max(...sectionSummaries.map((s) => s.pageEnd || 1));

    const combinedSections = sectionSummaries
      .map((s) => `Section '${s.section}' (Pages ${s.pageStart}-${s.pageEnd}):\n${s.summary}`)
      .join("\n\n");

    const prompt = `Synthesize a comprehensive chapter-level academic summary in language '${targetLanguage}' for chapter '${chapterName}'.

Section Summaries:
${combinedSections}

Return ONLY a valid JSON object:
{
  "chapter": "${chapterName}",
  "overview": "Comprehensive chapter overview",
  "keyPoints": ["Main concept 1", "Main concept 2"],
  "definitions": [{"term": "Term", "meaning": "Meaning"}],
  "formulas": [{"name": "Formula", "formula": "Expression", "description": "Desc"}],
  "examples": [{"title": "Example", "code": "Code"}],
  "examPoints": ["Important revision point"],
  "sourcePages": "${pageStart}-${pageEnd}"
}`;

    const raw = await this.callGeminiApiWithRetry(prompt);
    const parsed = this.parseJsonFromGemini(raw);

    return {
      chapter: chapterName,
      overview: parsed?.overview || parsed?.summary || combinedSections.slice(0, 500),
      keyPoints: Array.isArray(parsed?.keyPoints)
        ? parsed.keyPoints
        : sectionSummaries.flatMap((s) => s.keyPoints || []),
      definitions: Array.isArray(parsed?.definitions)
        ? parsed.definitions
        : sectionSummaries.flatMap((s) => s.definitions || []),
      formulas: Array.isArray(parsed?.formulas)
        ? parsed.formulas
        : sectionSummaries.flatMap((s) => s.formulas || []),
      examples: Array.isArray(parsed?.examples)
        ? parsed.examples
        : sectionSummaries.flatMap((s) => s.examples || []),
      examPoints: Array.isArray(parsed?.examPoints)
        ? parsed.examPoints
        : sectionSummaries.flatMap((s) => s.examPoints || []),
      sourcePages: `${pageStart}-${pageEnd}`
    };
  }

  /**
   * Step 4: Final Textbook Summary Generation
   */
  static async generateFinalBookSummary(bookTitle, subject, chapterSummaries, targetLanguage = "en") {
    const combinedChapters = chapterSummaries
      .map(
        (c) =>
          `Chapter: ${c.chapter} (Pages ${c.sourcePages})\nOverview: ${c.overview}\nKey Points: ${(c.keyPoints || []).join("; ")}`
      )
      .join("\n\n");

    const prompt = `You are an expert academic professor. Generate a final structured textbook summary in language '${targetLanguage}' for the textbook '${bookTitle}' (${subject}).
Do NOT invent facts not provided in the chapter summaries below.

Chapter Summaries:
${combinedChapters}

Return ONLY a valid JSON object matching this schema:
{
  "overallSummary": "High quality academic overview of the textbook",
  "keyPoints": ["Key takeaway 1", "Key takeaway 2"],
  "definitions": [{"term": "Term", "meaning": "Definition"}],
  "formulas": [{"name": "Formula Name", "formula": "Formula", "description": "Usage"}],
  "examples": [{"title": "Example Title", "code": "Code/Text"}],
  "quickRevision": ["Revision point 1", "Revision point 2"]
}`;

    const raw = await this.callGeminiApiWithRetry(prompt);
    const parsed = this.parseJsonFromGemini(raw);

    return {
      overallSummary: parsed?.overallSummary || parsed?.summary || combinedChapters.slice(0, 800),
      keyPoints: Array.isArray(parsed?.keyPoints)
        ? parsed.keyPoints
        : chapterSummaries.flatMap((c) => c.keyPoints || []),
      definitions: Array.isArray(parsed?.definitions)
        ? parsed.definitions
        : chapterSummaries.flatMap((c) => c.definitions || []),
      formulas: Array.isArray(parsed?.formulas)
        ? parsed.formulas
        : chapterSummaries.flatMap((c) => c.formulas || []),
      examples: Array.isArray(parsed?.examples)
        ? parsed.examples
        : chapterSummaries.flatMap((c) => c.examples || []),
      quickRevision: Array.isArray(parsed?.quickRevision)
        ? parsed.quickRevision
        : chapterSummaries.flatMap((c) => c.examPoints || []),
      chapters: chapterSummaries
    };
  }

  /**
   * Main Pipeline Orchestrator:
   * document_chunks -> Chunk Summaries -> Section Summaries -> Chapter Summaries -> Final Textbook Summary
   */
  static async summarizeBookFromChunks({ bookId, bookTitle, subject, targetLanguage = "en" }) {
    console.log(`[AI-Summary-Service] Starting full-document Gemini pipeline for book '${bookTitle}' (ID: ${bookId}) in '${targetLanguage}'`);

    const chunks = await DocumentChunk.findByBookId(bookId);
    if (!chunks || chunks.length === 0) {
      const err = new Error(`No extracted document chunks found for book '${bookId}'. Please upload a valid document.`);
      err.statusCode = 400;
      throw err;
    }

    // 1. Process Chunk Summaries in controlled sequential batches
    const chunkSummaries = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkSum = await this.summarizeChunk(chunks[i], targetLanguage);
      chunkSummaries.push(chunkSum);
    }

    // 2. Group by Chapter & Section
    const sectionGroups = new Map();
    for (const cs of chunkSummaries) {
      const key = `${cs.chapter}::${cs.section}`;
      if (!sectionGroups.has(key)) {
        sectionGroups.set(key, { chapter: cs.chapter, section: cs.section, chunks: [] });
      }
      sectionGroups.get(key).chunks.push(cs);
    }

    // 3. Section-level Summaries
    const sectionSummaries = [];
    for (const group of sectionGroups.values()) {
      const secSum = await this.summarizeSection(group.section, group.chunks, targetLanguage);
      secSum.chapter = group.chapter;
      sectionSummaries.push(secSum);
    }

    // 4. Group by Chapter
    const chapterGroups = new Map();
    for (const ss of sectionSummaries) {
      if (!chapterGroups.has(ss.chapter)) {
        chapterGroups.set(ss.chapter, []);
      }
      chapterGroups.get(ss.chapter).push(ss);
    }

    // 5. Chapter-level Summaries
    const chapterSummaries = [];
    for (const [chapName, secList] of chapterGroups.entries()) {
      const chapSum = await this.summarizeChapter(chapName, secList, targetLanguage);
      chapterSummaries.push(chapSum);
    }

    // 6. Final Textbook Summary
    const finalResult = await this.generateFinalBookSummary(bookTitle, subject, chapterSummaries, targetLanguage);

    return finalResult;
  }

  /**
   * Helper to generate deterministic mock quiz JSON from prompt text in test mode
   */
  static generateMockQuizJsonFromPrompt(prompt) {
    const countMatch = prompt.match(/(?:Requested Question Count|numQuestions):\s*(\d+)/i);
    const count = countMatch ? parseInt(countMatch[1], 10) : 5;

    const isPython = /python/i.test(prompt);
    const isNetworks = /network|router|ip address|osi/i.test(prompt);

    const questions = [];

    if (isPython) {
      const pythonPool = [
        {
          question: "What is the primary usage of list comprehensions in Python programming?",
          options: [
            "To create concise and readable lists from existing iterables",
            "To manage hardware memory allocation directly",
            "To compile Python bytecode into C binary",
            "To disable automatic garbage collection"
          ],
          correctAnswer: 0,
          explanation: "List comprehensions provide a concise way to create lists in Python based on existing iterables.",
          topic: "Python Data Structures",
          difficulty: "medium",
          chapter: "Chapter 1",
          section: "1.1",
          sourcePages: "1-5"
        },
        {
          question: "Which built-in Python function is used to return the length of an object?",
          options: ["count()", "len()", "size()", "length()"],
          correctAnswer: 1,
          explanation: "The len() function returns the number of items in an object.",
          topic: "Python Functions",
          difficulty: "easy",
          chapter: "Chapter 1",
          section: "1.2",
          sourcePages: "6-10"
        },
        {
          question: "What keyword is used to define a function in Python?",
          options: ["function", "def", "func", "define"],
          correctAnswer: 1,
          explanation: "The 'def' keyword is used to create a user-defined function in Python.",
          topic: "Python Fundamentals",
          difficulty: "easy",
          chapter: "Chapter 2",
          section: "2.1",
          sourcePages: "11-15"
        },
        {
          question: "Which data structure in Python is immutable?",
          options: ["List", "Dictionary", "Tuple", "Set"],
          correctAnswer: 2,
          explanation: "Tuples in Python are immutable sequences whose elements cannot be modified after creation.",
          topic: "Python Data Types",
          difficulty: "medium",
          chapter: "Chapter 2",
          section: "2.2",
          sourcePages: "16-20"
        },
        {
          question: "How are exceptions handled in Python code blocks?",
          options: [
            "using try...except blocks",
            "using do...catch blocks",
            "using begin...trap statements",
            "using error...handle constructs"
          ],
          correctAnswer: 0,
          explanation: "Python handles runtime exceptions using try and except blocks.",
          topic: "Python Exception Handling",
          difficulty: "medium",
          chapter: "Chapter 3",
          section: "3.1",
          sourcePages: "21-25"
        }
      ];

      for (let i = 0; i < count; i++) {
        const item = pythonPool[i % pythonPool.length];
        questions.push({
          ...item,
          question: i < pythonPool.length ? item.question : `${item.question} (Q${i + 1})`
        });
      }
    } else if (isNetworks) {
      const networksPool = [
        {
          question: "What is the primary function of the Internet Protocol (IP) in computer networks?",
          options: [
            "Addressing and routing packets across network boundaries",
            "Providing audio equalization for media streams",
            "Compiling source code into executable binaries",
            "Formatting HTML web pages"
          ],
          correctAnswer: 0,
          explanation: "IP provides logical addressing and packet routing across interconnected networks.",
          topic: "Computer Networks",
          difficulty: "medium",
          chapter: "Chapter 1",
          section: "1.1",
          sourcePages: "1-8"
        },
        {
          question: "Which layer of the OSI reference model does a router operate at?",
          options: ["Physical Layer", "Data Link Layer", "Network Layer", "Application Layer"],
          correctAnswer: 2,
          explanation: "Routers operate at Layer 3 (Network Layer) to route packets based on network IP addresses.",
          topic: "OSI Reference Model",
          difficulty: "easy",
          chapter: "Chapter 1",
          section: "1.2",
          sourcePages: "9-15"
        },
        {
          question: "What mechanism does TCP use to ensure reliable data packet delivery?",
          options: [
            "Sequence numbers and acknowledgments (ACK)",
            "Uncontrolled UDP broadcasting",
            "Random packet dropping",
            "Parity bit calculation"
          ],
          correctAnswer: 0,
          explanation: "TCP uses sequence numbers and ACK responses to confirm delivery and retransmit lost packets.",
          topic: "Transport Layer Protocols",
          difficulty: "medium",
          chapter: "Chapter 2",
          section: "2.1",
          sourcePages: "16-22"
        },
        {
          question: "What is the primary purpose of the Domain Name System (DNS)?",
          options: [
            "Translating human-readable domain names into IP addresses",
            "Encrypting file downloads",
            "Managing CPU scheduling",
            "Compressing video streams"
          ],
          correctAnswer: 0,
          explanation: "DNS translates domain names like example.com into machine-routable IP addresses.",
          topic: "Application Layer Protocols",
          difficulty: "easy",
          chapter: "Chapter 2",
          section: "2.2",
          sourcePages: "23-30"
        },
        {
          question: "Which protocol is used to dynamically assign IP addresses to devices on a network?",
          options: ["DHCP", "FTP", "SMTP", "ICMP"],
          correctAnswer: 0,
          explanation: "Dynamic Host Configuration Protocol (DHCP) automatically assigns IP configurations to clients.",
          topic: "Network Configuration",
          difficulty: "easy",
          chapter: "Chapter 3",
          section: "3.1",
          sourcePages: "31-35"
        }
      ];

      for (let i = 0; i < count; i++) {
        const item = networksPool[i % networksPool.length];
        questions.push({
          ...item,
          question: i < networksPool.length ? item.question : `${item.question} (Q${i + 1})`
        });
      }
    } else {
      let topic = "Academic Concepts";
      const titleMatch = prompt.match(/Textbook Title:\s*(.+)/i) || prompt.match(/Subject:\s*(.+)/i);
      if (titleMatch) topic = titleMatch[1].trim();

      for (let i = 0; i < count; i++) {
        questions.push({
          question: `What primary concept is demonstrated in ${topic} section ${i + 1}?`,
          options: [
            `Core foundational principle of ${topic} section ${i + 1}`,
            `Unrelated option A for part ${i + 1}`,
            `Unrelated option B for part ${i + 1}`,
            `Unrelated option C for part ${i + 1}`
          ],
          correctAnswer: 0,
          explanation: `This question evaluates comprehension of fundamental concepts in ${topic}.`,
          topic,
          difficulty: i % 3 === 0 ? "easy" : i % 3 === 1 ? "medium" : "hard",
          chapter: `Chapter ${Math.floor(i / 2) + 1}`,
          section: `${Math.floor(i / 2) + 1}.${(i % 2) + 1}`,
          sourcePages: `${i * 3 + 1}-${i * 3 + 3}`
        });
      }
    }

    return JSON.stringify({ questions });
  }

  /**
   * Helper to generate deterministic mock doubt solver JSON from prompt text in test mode
   */
  static generateMockDoubtJsonFromPrompt(prompt) {
    const qMatch = prompt.match(/Student Question:\s*"(.*?)"/i);
    const question = qMatch ? qMatch[1] : "academic doubt";

    const titleMatch = prompt.match(/Textbook Title:\s*(.+)/i);
    const bookTitle = titleMatch ? titleMatch[1].trim() : "Textbook";

    // Extract chunk metadata from prompt context if present
    const chunkMatches = [...prompt.matchAll(/\[Chunk ID:\s*(.*?)\]\s*Chapter:\s*(.*?)\s*Section:\s*(.*?)\s*Pages:\s*(.*?)\s*Content:\s*([\s\S]*?)(?=\n\n---|\n\nSTRICT|$)/gi)];

    if (chunkMatches.length === 0) {
      return JSON.stringify({
        answer: "The uploaded textbook does not contain enough information to answer this question confidently.",
        keyPoints: ["Information not present in uploaded textbook"],
        example: null,
        source: []
      });
    }

    const sources = chunkMatches.map((m) => {
      const pRange = m[4].split("-");
      return {
        chunkId: m[1].trim(),
        chapter: m[2].trim(),
        section: m[3].trim(),
        pageStart: parseInt(pRange[0], 10) || 1,
        pageEnd: parseInt(pRange[1], 10) || (parseInt(pRange[0], 10) || 1)
      };
    });

    const firstChunkText = chunkMatches[0][5].trim().slice(0, 300);

    return JSON.stringify({
      answer: `Based on '${bookTitle}', regarding "${question}": ${firstChunkText}`,
      keyPoints: [
        `Core concept from ${sources[0]?.chapter || 'textbook'}`,
        `Detailed explanation from ${sources[0]?.section || 'section'}`
      ],
      example: `Example illustrating ${question} in ${bookTitle}`,
      source: sources
    });
  }
}


