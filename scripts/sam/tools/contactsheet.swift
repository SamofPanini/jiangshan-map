// contactsheet.swift — 把一个目录里的 pNN.png 拼成带页码的缩略总览图（用于先判断每页是什么，再决定细读哪几页）
// 用法：swift contactsheet.swift <in_dir> <out.png> <cols> <thumb_px>
// fail-closed：参数个数不对、目录里没有 pNN.png、写出失败都会非零退出。
import AppKit

let a = CommandLine.arguments
guard a.count == 5, let cols = Int(a[3]), let tp = Int(a[4]), cols > 0, tp > 0 else {
    FileHandle.standardError.write("usage: contactsheet.swift <in_dir> <out.png> <cols> <thumb_px>\n".data(using: .utf8)!); exit(2)
}
let dir = URL(fileURLWithPath: a[1])
let names = try FileManager.default.contentsOfDirectory(atPath: dir.path)
    .filter { $0.range(of: #"^p\d+\.png$"#, options: .regularExpression) != nil }.sorted()
guard !names.isEmpty else { FileHandle.standardError.write("no pNN.png in \(dir.path)\n".data(using: .utf8)!); exit(3) }
let rows = (names.count + cols - 1) / cols
let label = 22
let W = cols * tp, H = rows * (tp + label)
guard let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: W, pixelsHigh: H, bitsPerSample: 8,
    samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)
else { exit(4) }
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
NSColor.white.setFill(); NSRect(x: 0, y: 0, width: W, height: H).fill()
for (i, n) in names.enumerated() {
    guard let img = NSImage(contentsOf: dir.appendingPathComponent(n)) else { FileHandle.standardError.write("cannot read \(n)\n".data(using: .utf8)!); exit(5) }
    let c = i % cols, r = i / cols
    let x0 = c * tp, yTop = H - r * (tp + label)
    let iw = Double(img.size.width), ih = Double(img.size.height)
    let s: Double = min(Double(tp) / iw, Double(tp) / ih)
    let w: Double = iw * s, h: Double = ih * s
    let x: Double = Double(x0) + (Double(tp) - w) / 2.0, y: Double = Double(yTop - label) - h
    img.draw(in: NSRect(x: x, y: y, width: w, height: h))
    (n as NSString).draw(at: NSPoint(x: x0 + 4, y: yTop - label + 3),
        withAttributes: [.font: NSFont.boldSystemFont(ofSize: 15), .foregroundColor: NSColor.red])
}
NSGraphicsContext.restoreGraphicsState()
guard let data = rep.representation(using: .png, properties: [:]) else { exit(6) }
try data.write(to: URL(fileURLWithPath: a[2]))
print("pages=\(names.count) out=\(a[2]) size=\(W)x\(H)")
