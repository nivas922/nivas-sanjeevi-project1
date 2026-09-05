export const exportService = {
  downloadText(filename, content, mimeType = "text/plain;charset=utf-8") {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  exportSummaryAsMarkdown(summary) {
    const md = `# ${summary.bookTitle}
## ${summary.chapterTitle}
**Topic:** ${summary.topic}
**Difficulty:** ${summary.difficulty} | **Generated Date:** ${summary.createdDate}

---

### 📖 AI Summary
${summary.summaryText}

### 💡 Simplified Explanation
${summary.simpleExplanation}

### 🎯 Key Concepts
${summary.keyConcepts.map(c => `- ${c}`).join("\n")}

### 📌 Important Points
${summary.keyPoints.map(p => `- ${p}`).join("\n")}

### 📚 Key Definitions
${summary.definitions.map(d => `**${d.term}:** ${d.definition}`).join("\n\n")}

${summary.formulas && summary.formulas.length > 0 ? `### 🔢 Formulas\n` + summary.formulas.map(f => `**${f.name}**\n\`${f.formula}\`\n*${f.description}*`).join("\n\n") : ""}

### ⚡ Quick Revision
${summary.quickRevision.map(r => `- [ ] ${r}`).join("\n")}

---
*Exported from LearnAI - Multilingual Textbook Summarization & Adaptive Learning Platform*
`;
    this.downloadText(`${summary.topic.replace(/[^a-zA-Z0-9]/g, "_")}_Summary.md`, md, "text/markdown;charset=utf-8");
  },

  exportQuizResult(result) {
    const text = `LearnAI Quiz Score Report
===============================================
Quiz: ${result.quizTitle}
Topic: ${result.topic}
Score: ${result.score} / ${result.totalQuestions} (${result.percentage}%)
Performance Level: ${result.performanceLevel}
Date: ${new Date().toLocaleString()}

Question Review:
-----------------------------------------------
${result.answers.map((ans, idx) => `
Q${idx + 1}: ${ans.question}
Your Answer: ${ans.userOption} (${ans.isCorrect ? "CORRECT ✓" : "INCORRECT ✗"})
Correct Answer: ${ans.correctOption}
Explanation: ${ans.explanation}
`).join("\n")}

AI Recommendations:
- Recommended Focus: ${result.recommendedTopic || result.topic}
- Suggested Review: Revise summary and take adaptive beginner quiz.
===============================================
`;
    this.downloadText(`${result.topic.replace(/[^a-zA-Z0-9]/g, "_")}_Quiz_Report.txt`, text, "text/plain;charset=utf-8");
  }
};
