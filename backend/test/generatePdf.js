import fs from "fs";
import pdfParse from "pdf-parse";

export function createValidPdf(lines) {
  const content = lines.map((l, idx) => `1 0 0 1 50 ${700 - idx * 25} Tm (${l.replace(/[()]/g, "")}) Tj`).join("\n");
  const stream = `BT /F1 12 Tf\n${content}\nET`;
  const streamLen = Buffer.byteLength(stream);
  
  const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  const obj2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
  const obj3 = "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n";
  const obj4 = "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";
  const obj5 = `5 0 obj\n<< /Length ${streamLen} >>\nstream\n${stream}\nendstream\nendobj\n`;

  let pdf = "%PDF-1.4\n";
  const off1 = Buffer.byteLength(pdf);
  pdf += obj1;
  const off2 = Buffer.byteLength(pdf);
  pdf += obj2;
  const off3 = Buffer.byteLength(pdf);
  pdf += obj3;
  const off4 = Buffer.byteLength(pdf);
  pdf += obj4;
  const off5 = Buffer.byteLength(pdf);
  pdf += obj5;

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += "xref\r\n0 6\r\n";
  pdf += "0000000000 65535 f \r\n";
  pdf += String(off1).padStart(10, "0") + " 00000 n \r\n";
  pdf += String(off2).padStart(10, "0") + " 00000 n \r\n";
  pdf += String(off3).padStart(10, "0") + " 00000 n \r\n";
  pdf += String(off4).padStart(10, "0") + " 00000 n \r\n";
  pdf += String(off5).padStart(10, "0") + " 00000 n \r\n";
  pdf += `trailer\r\n<< /Size 6 /Root 1 0 R >>\r\nstartxref\r\n${xrefOffset}\r\n%%EOF\r\n`;

  return Buffer.from(pdf);
}

// Quick validation
const buf = createValidPdf([
  "CHAPTER 1: COMPUTER NETWORKS",
  "1.1 Network Fundamentals",
  "The OSI reference model defines seven layers for network communications.",
  "1.2 Transmission Control Protocol",
  "TCP ensures reliable transport using a 3-way handshake.",
  "CHAPTER 2: ADVANCED PROTOCOLS",
  "2.1 Routing Algorithms",
  "Link state algorithms determine the shortest path."
]);

pdfParse(buf).then(data => {
  console.log("PDF parsed successfully! Length:", data.text.length);
  console.log("Text preview:\n" + data.text.trim());
}).catch(err => {
  console.error("PDF Parse error:", err);
});
