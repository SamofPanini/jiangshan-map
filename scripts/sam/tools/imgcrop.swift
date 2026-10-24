// imgcrop.swift — 从大图里按像素裁一块（原点＝左上角），可选缩到给定长边
// 用法：swift imgcrop.swift <in> <out.jpg> <x> <y> <w> <h> [long_side_px]
// fail-closed：参数不对、裁剪框越界、读写失败都会非零退出。
import AppKit

let a = CommandLine.arguments
guard a.count == 7 || a.count == 8, let x = Int(a[3]), let y = Int(a[4]), let w = Int(a[5]), let h = Int(a[6]), w > 0, h > 0 else {
    FileHandle.standardError.write("usage: imgcrop.swift <in> <out.jpg> <x> <y> <w> <h> [long_side_px]\n".data(using: .utf8)!); exit(2)
}
guard let src = NSImage(contentsOfFile: a[1]), let cg = src.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    FileHandle.standardError.write("cannot read \(a[1])\n".data(using: .utf8)!); exit(3)
}
guard x >= 0, y >= 0, x + w <= cg.width, y + h <= cg.height else {
    FileHandle.standardError.write("crop box out of bounds: image \(cg.width)x\(cg.height)\n".data(using: .utf8)!); exit(4)
}
guard var out = cg.cropping(to: CGRect(x: x, y: y, width: w, height: h)) else { exit(5) }
if a.count == 8, let ls = Int(a[7]), ls > 0, max(w, h) > ls {
    let s = Double(ls) / Double(max(w, h))
    let nw = Int(Double(w) * s), nh = Int(Double(h) * s)
    guard let ctx = CGContext(data: nil, width: nw, height: nh, bitsPerComponent: 8, bytesPerRow: 0,
        space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { exit(6) }
    ctx.interpolationQuality = .high
    ctx.draw(out, in: CGRect(x: 0, y: 0, width: nw, height: nh))
    guard let r = ctx.makeImage() else { exit(7) }
    out = r
}
let rep = NSBitmapImageRep(cgImage: out)
guard let data = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.88]) else { exit(8) }
try data.write(to: URL(fileURLWithPath: a[2]))
print("in=\(cg.width)x\(cg.height) crop=\(x),\(y),\(w)x\(h) out=\(out.width)x\(out.height) -> \(a[2])")
