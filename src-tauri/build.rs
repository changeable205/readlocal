// Build the native HTML→PDF helper (macOS) from Swift as a UNIVERSAL binary
// (x86_64 + arm64), then let Tauri generate its context. The compiled helper is
// embedded into the main app via include_bytes! and extracted to a temp dir at
// runtime, so a universal app ships a universal helper regardless of which
// cargo target arch is currently compiling.
fn main() {
    #[cfg(target_os = "macos")]
    build_html2pdf();
    tauri_build::build();
}

#[cfg(target_os = "macos")]
fn build_html2pdf() {
    use std::process::Command;
    println!("cargo:rerun-if-changed=html2pdf.swift");
    let out_dir = std::env::var("OUT_DIR").expect("OUT_DIR");

    // Swift 5.4.2 cannot read the MacOSX12.x .swiftinterface; pin the 11.3 SDK.
    let sdk = Command::new("xcrun")
        .args(["--sdk", "macosx11.3", "--show-sdk-path"])
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| {
            "/Library/Developer/CommandLineTools/SDKs/MacOSX11.3.sdk".to_string()
        });

    let frameworks = ["-framework", "AppKit", "-framework", "WebKit",
                      "-framework", "Quartz", "-framework", "CoreGraphics",
                      "-framework", "Foundation"];

    let mut slices = Vec::new();
    for arch in ["x86_64", "arm64"] {
        let dest = format!("{out_dir}/html2pdf.{arch}");
        let target = format!("{arch}-apple-macos11.0");
        let mut cmd = Command::new("swiftc");
        cmd.args(["-suppress-warnings", "-sdk", &sdk, "-target", &target]);
        cmd.args(frameworks);
        cmd.args(["html2pdf.swift", "-o", &dest]);
        let status = cmd.status();
        match status {
            Ok(s) if s.success() => {}
            other => panic!("failed to compile html2pdf.swift for {arch}: {other:?}"),
        }
        slices.push(dest);
    }

    let universal = format!("{out_dir}/html2pdf");
    let status = Command::new("lipo")
        .arg("-create")
        .args(&slices)
        .arg("-output")
        .arg(&universal)
        .status()
        .expect("failed to run lipo");
    assert!(status.success(), "lipo failed to create universal html2pdf");
}
