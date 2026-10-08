import { api } from "./api";

export const aiTutorService = {
  /**
   * Real AI Academic Tutor calling backend POST /api/ask-doubt
   */
  async askDoubt(question, languageCode = "en", bookId = null) {
    if (!bookId) {
      throw new Error("Please select a textbook before asking a doubt.");
    }

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return {
        answer: "Please ask a question or enter your academic doubt.",
        language: languageCode,
        relatedTopics: ["Explain key concepts", "Formulas & Theorems", "Important Exam Q&A"]
      };
    }

    try {
      const data = await api.askDoubt({
        bookId,
        question: question.trim(),
        language: languageCode
      });

      let formattedAnswer = data.answer || "No response received.";
      if (data.keyPoints && data.keyPoints.length > 0) {
        formattedAnswer += "\n\n### 📌 Key Takeaways:\n" + data.keyPoints.map((kp) => `* ${kp}`).join("\n");
      }
      if (data.example) {
        formattedAnswer += `\n\n### 💡 Example:\n\`\`\`text\n${data.example}\n\`\`\``;
      }

      return {
        topic: question.trim().slice(0, 40),
        answer: formattedAnswer,
        language: languageCode,
        source: data.source || [],
        hasRelevantContent: data.hasRelevantContent !== false,
        relatedTopics: [
          "Explain with an illustrative diagram",
          "Provide code implementation / key formulas",
          "What are top exam questions on this topic?"
        ]
      };
    } catch (err) {
      throw err;
    }
  }
};


