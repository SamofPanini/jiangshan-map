// Extract text from a PDF with PDFKit, page by page. Fail closed on bad input.
// Usage: swift pdftext.swift <in.pdf> <out.txt>
import Foundation
import PDFKit

let args = CommandLine.arguments
guard args.count == 3 else {
    FileHandle.standardError.write("usage: pdftext.swift <in.pdf> <out.txt>\n".data(using: .utf8)!)
    exit(2)
}
guard let doc = PDFDocument(url: URL(fileURLWithPath: args[1])) else {
    FileHandle.standardError.write("cannot open PDF\n".data(using: .utf8)!)
    exit(1)
}
var out = ""
var emptyPages = 0
for i in 0..<doc.pageCount {
    let text = doc.page(at: i)?.string ?? ""
    if text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { emptyPages += 1 }
    out += "\n===== PAGE \(i + 1) =====\n" + text
}
try out.write(toFile: args[2], atomically: true, encoding: .utf8)
print("pages=\(doc.pageCount) empty_pages=\(emptyPages) chars=\(out.count)")
