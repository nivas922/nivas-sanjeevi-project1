import fs from "fs";
import pdfParse from "pdf-parse";

export function createValidPdf(lines) {
  const content = lines.map((l, idx) => "1 0 0 1 50 " + (700 - idx * 25) + " Tm (" + l.replace(/[()]/g, "") + ") Tj").join("\n");
  const stream = "BT /F1 12 Tf\n" + content + "\nET";
  const streamLen = Buffer.byteLength(stream, "latin1");

  const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  const obj2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
  const obj3 = "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n";
  const obj4 = "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";
  const obj5 = "5 0 obj\n<< /Length " + streamLen + " >>\nstream\n" + stream + "\nendstream\nendobj\n";

  let body = "%PDF-1.4\n";
  const off1 = Buffer.byteLength(body, "latin1");
  body += obj1;
  const off2 = Buffer.byteLength(body, "latin1");
  body += obj2;
  const off3 = Buffer.byteLength(body, "latin1");
  body += obj3;
  const off4 = Buffer.byteLength(body, "latin1");
  body += obj4;
  const off5 = Buffer.byteLength(body, "latin1");
  body += obj5;

  const xrefOffset = Buffer.byteLength(body, "latin1");
  let xref = "xref\n0 6\n";
  xref += "0000000000 65535 f \n";
  xref += String(off1).padStart(10, "0") + " 00000 n \n";
  xref += String(off2).padStart(10, "0") + " 00000 n \n";
  xref += String(off3).padStart(10, "0") + " 00000 n \n";
  xref += String(off4).padStart(10, "0") + " 00000 n \n";
  xref += String(off5).padStart(10, "0") + " 00000 n \n";
  xref += "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF\n";

  return Buffer.from(body + xref, "latin1");
}
