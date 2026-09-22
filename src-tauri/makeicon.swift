// Generate a 1024×1024 macOS app icon with proper transparent margin so it
// matches the Dock size of other apps. Usage: makeicon <out.png>
import AppKit

let S: CGFloat = 1024
let out = CommandLine.arguments[1]

let image = NSImage(size: NSSize(width: S, height: S))
image.lockFocus()
guard let ctx = NSGraphicsContext.current?.cgContext else { fatalError("no ctx") }
ctx.clear(CGRect(x: 0, y: 0, width: S, height: S))

let inset: CGFloat = 100
let box = CGRect(x: inset, y: inset, width: S - 2 * inset, height: S - 2 * inset)
let radius: CGFloat = 186
let path = CGPath(roundedRect: box, cornerWidth: radius, cornerHeight: radius, transform: nil)

let cs = CGColorSpaceCreateDeviceRGB()
let top = CGColor(red: 0x2d/255.0, green: 0xd4/255.0, blue: 0xbf/255.0, alpha: 1)
let midc = CGColor(red: 0x14/255.0, green: 0xb8/255.0, blue: 0xa6/255.0, alpha: 1)
let bot = CGColor(red: 0x0f/255.0, green: 0x76/255.0, blue: 0x6e/255.0, alpha: 1)
if let grad = CGGradient(colorsSpace: cs, colors: [top, midc, bot] as CFArray,
                         locations: [0, 0.55, 1]) {
  ctx.saveGState()
  ctx.addPath(path)
  ctx.clip()
  ctx.drawLinearGradient(grad,
                         start: CGPoint(x: 0, y: S),
                         end: CGPoint(x: 0, y: 0),
                         options: [])
  ctx.restoreGState()
}

// White "M↓" Markdown mark, centered.
let para = NSMutableParagraphStyle()
para.alignment = .center
let attrs: [NSAttributedString.Key: Any] = [
  .font: NSFont.systemFont(ofSize: 430, weight: .heavy),
  .foregroundColor: NSColor.white,
  .paragraphStyle: para,
]
let str = "M\u{2193}" as NSString
let ts = str.size(withAttributes: attrs)
str.draw(in: CGRect(x: 0, y: (CGFloat(S) - ts.height) / 2, width: CGFloat(S), height: ts.height),
         withAttributes: attrs)

image.unlockFocus()

let rep = NSBitmapImageRep(data: image.tiffRepresentation!)!
let png = rep.representation(using: .png, properties: [:])!
try! png.write(to: URL(fileURLWithPath: out))
