// html2pdf — render a self-contained HTML file to a real (vector, selectable
// text) A4 PDF. Strategy:
//   1. lay the page out at 794 CSS px wide (== A4 width at 96 dpi);
//   2. collect every text-line top (Range.getClientRects) and special block top;
//   3. greedily pack pages so each break lands between two lines (never through
//      one) while filling the page like a browser print does;
//   4. WKWebView.createPDF each 794×1123 slice (vector), merge with PDFKit;
//   5. scale the merged pages ×(595.28/794) onto true A4 (595.28 × 841.88 pt).
// Usage: html2pdf <input.html> <output.pdf>
import AppKit
import WebKit
import Quartz
import CoreGraphics

let PAGE_W: CGFloat = 794
let PAGE_H: CGFloat = 1123
let A4_W: CGFloat = 595.28
let A4_H: CGFloat = 841.88

final class PDFMaker: NSObject, WKNavigationDelegate {
    let webView: WKWebView
    let window: NSWindow
    let outURL: URL
    var pageBreaks: [CGFloat] = []
    var pagePDFs: [Data] = []

    init(html: URL, out: URL) {
        self.outURL = out
        let cfg = WKWebViewConfiguration()
        cfg.preferences.javaScriptEnabled = true
        let frame = NSRect(x: -10000, y: -10000, width: PAGE_W, height: PAGE_H)
        self.webView = WKWebView(frame: frame, configuration: cfg)
        self.window = NSWindow(contentRect: frame, styleMask: [.borderless],
                              backing: .buffered, defer: false)
        super.init()
        webView.navigationDelegate = self
        window.contentView = webView
        webView.loadFileURL(html, allowingReadAccessTo: html.deletingLastPathComponent())
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) { [weak self] in
            self?.prepareLayout()
        }
    }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        err("navigation failed: \(error.localizedDescription)"); exit(4)
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        err("provisional load failed: \(error.localizedDescription)"); exit(4)
    }

    // Expand the view to full content height so every line is laid out, then
    // collect line tops.
    func prepareLayout() {
        let totalJS = "Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)"
        webView.evaluateJavaScript(totalJS) { [weak self] val, _ in
            guard let self = self, let n = val as? NSNumber else { self?.err("measure failed"); exit(5) }
            let total = CGFloat(n.doubleValue)
            let f = NSRect(x: -10000, y: -10000, width: PAGE_W, height: max(total, PAGE_H))
            self.webView.frame = f
            self.window.setFrame(f, display: false)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                self.collectLines(total: total)
            }
        }
    }

    func collectLines(total: CGFloat) {
        let js = """
        (function(){
          try {
            var root=document.querySelector('article')||document.body;
            var tops=[];
            var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null,false);
            var n;
            while((n=walker.nextNode())){
              if(!n.nodeValue || !n.nodeValue.trim())continue;
              var rg=document.createRange(); rg.selectNodeContents(n);
              var rects=rg.getClientRects();
              for(var i=0;i<rects.length;i++){ if(rects[i].height>0) tops.push(Math.round(rects[i].top+window.scrollY)); }
            }
            var blocks=root.querySelectorAll('img,svg,hr,table,pre,video,canvas,.rl-math-block,.rl-code-block,.mermaid');
            for(var j=0;j<blocks.length;j++){var r=blocks[j].getBoundingClientRect(); if(r.height>0) tops.push(Math.round(r.top+window.scrollY));}
            tops.sort(function(a,b){return a-b;});
            var u=[],last=-1;
            for(var k=0;k<tops.length;k++){ if(tops[k]-last>=2){u.push(tops[k]);last=tops[k];} }
            return JSON.stringify({total:Math.round(totalH),tops:u});
          } catch(e) { return 'ERR:'+e.message; }
        })();
        """.replacingOccurrences(of: "totalH", with: String(Double(total)))
        webView.evaluateJavaScript(js) { [weak self] val, err in
            if let err = err { self?.err("collectLines JS error: \(err.localizedDescription)"); exit(5) }
            if let s = val as? String, s.hasPrefix("ERR:") { self?.err("collectLines: \(s)"); exit(5) }
            guard let self = self,
                  let json = (val as? String)?.data(using: .utf8),
                  let obj = try? JSONSerialization.jsonObject(with: json) as? [String: Any] else {
                self?.err("line collection failed; raw val=\(String(describing: val))"); exit(5)
            }
            let tot = CGFloat((obj["total"] as? NSNumber)?.doubleValue ?? Double(total))
            let tops = (obj["tops"] as? [NSNumber])?.map { CGFloat($0.doubleValue) } ?? []

            var breaks: [CGFloat] = []
            var start: CGFloat = 0
            while start < tot {
                breaks.append(start)
                let hard = start + PAGE_H
                var next = hard
                for t in tops where t > start + 1 && t <= hard { next = t }
                if next <= start + 1 { next = hard }
                if next >= tot { break }
                start = next
            }
            self.pageBreaks = breaks
            self.capturePage(0)
        }
    }

    func capturePage(_ index: Int) {
        if index >= pageBreaks.count { writeA4(); return }
        let y = pageBreaks[index]
        let cfg = WKPDFConfiguration()
        cfg.rect = CGRect(x: 0, y: y, width: PAGE_W, height: PAGE_H)
        webView.createPDF(configuration: cfg) { [weak self] result in
            guard let self = self else { exit(6) }
            switch result {
            case .failure(let error):
                self.err("page \(index) pdf failed: \(error.localizedDescription)"); exit(6)
            case .success(let data):
                self.pagePDFs.append(data)
                self.capturePage(index + 1)
            }
        }
    }

    // Merge slices and draw them, scaled, onto true A4 pages (keeps vector text).
    func writeA4() {
        let scale = A4_W / PAGE_W
        let out = NSMutableData()
        var media = CGRect(x: 0, y: 0, width: A4_W, height: A4_H)
        guard let consumer = CGDataConsumer(data: out as CFMutableData),
              let ctx = CGContext(consumer: consumer, mediaBox: &media, nil) else {
            err("cannot create pdf context"); exit(8)
        }
        var count = 0
        for one in pagePDFs {
            guard let doc = PDFDocument(data: one) else { continue }
            for i in 0..<doc.pageCount {
                guard let page = doc.page(at: i) else { continue }
                var box = CGRect(x: 0, y: 0, width: A4_W, height: A4_H)
                ctx.beginPage(mediaBox: &box)
                ctx.scaleBy(x: scale, y: scale)
                page.draw(with: .mediaBox, to: ctx)
                ctx.endPage()
                count += 1
            }
        }
        ctx.closePDF()
        if count == 0 { err("no pages produced"); exit(7) }
        do {
            try out.write(to: outURL)
            exit(0)
        } catch {
            err("write pdf: \(error.localizedDescription)"); exit(8)
        }
    }

    func err(_ s: String) {
        FileHandle.standardError.write((s + "\n").data(using: .utf8) ?? Data())
    }
}

let args = CommandLine.arguments
guard args.count == 3 else {
    FileHandle.standardError.write("usage: html2pdf <input.html> <output.pdf>\n".data(using: .utf8)!)
    exit(2)
}
let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let maker = PDFMaker(html: URL(fileURLWithPath: args[1]), out: URL(fileURLWithPath: args[2]))
withExtendedLifetime(maker) { app.run() }
