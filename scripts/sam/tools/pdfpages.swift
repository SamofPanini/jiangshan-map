// Render each PDF page to a PNG with PDFKit. Fail closed on bad input.
// Usage: swift pdfpages.swift <in.pdf> <out_dir> <long_side_px>
import Foundation
import PDFKit
import AppKit

let args = CommandLine.arguments
guard args.count == 4, let longSide = Double(args[3]), longSide > 100 else {
    FileHandle.standardError.write("usage: pdfpages.swift <in.pdf> <out_dir> <long_side_px>\n".data(using: .utf8)!)
    exit(2)
}
guard let doc = PDFDocument(url: URL(fileURLWithPath: args[1])) else {
    FileHandle.standardError.write("cannot open PDF\n".data(using: .utf8)!)
    exit(1)
}
let outDir = URL(fileURLWithPath: args[2])
var written = 0
for i in 0..<doc.pageCount {
    guard let page = doc.page(at: i) else { continue }
    let box = page.bounds(for: .mediaBox)
    let scale = longSide / Double(max(box.width, box.height))
    let size = NSSize(width: box.width * scale, height: box.height * scale)
    let image = page.thumbnail(of: size, for: .mediaBox)
    guard let tiff = image.tiffRepresentation,
          let rep = NSBitmapImageRep(data: tiff),
          let png = rep.representation(using: .png, properties: [:]) else {
        FileHandle.standardError.write("render failed on page \(i + 1)\n".data(using: .utf8)!)
        exit(1)
    }
    try png.write(to: outDir.appendingPathComponent(String(format: "p%02d.png", i + 1)))
    written += 1
}
print("pages=\(doc.pageCount) written=\(written)")
