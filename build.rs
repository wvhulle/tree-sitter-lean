use std::path::{Path, PathBuf};
use std::process::Command;
use std::{fs, io};

fn copy_dir(src: &Path, dst: &Path) -> io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        if entry.path().is_file() {
            fs::copy(entry.path(), dst.join(entry.file_name()))?;
        }
    }
    Ok(())
}

fn generate_parser(out_dir: &Path) -> PathBuf {
    fs::create_dir_all(out_dir).expect("create OUT_DIR");

    // Test if OUT_DIR is writable
    let test_file = out_dir.join(".write_test");
    fs::write(&test_file, "test").unwrap_or_else(|e| {
        panic!("OUT_DIR {} not writable: {}", out_dir.display(), e)
    });
    fs::remove_file(&test_file).ok();

    // Copy everything needed to OUT_DIR (handles read-only nix store)
    let dest = out_dir.join("grammar.js");
    fs::copy("grammar.js", &dest)
        .unwrap_or_else(|e| panic!("copy grammar.js to {}: {}", dest.display(), e));
    copy_dir(Path::new("grammar"), &out_dir.join("grammar"))
        .unwrap_or_else(|e| panic!("copy grammar/: {}", e));
    copy_dir(Path::new("src"), &out_dir.join("src")).ok();

    println!("cargo:warning=Generating parser.c in {}...", out_dir.display());
    let status = Command::new("tree-sitter")
        .arg("generate")
        .current_dir(out_dir)
        .status()
        .expect("tree-sitter CLI not found");
    assert!(status.success(), "tree-sitter generate failed");

    out_dir.join("src")
}

fn main() {
    println!("cargo:rerun-if-changed=grammar.js");
    println!("cargo:rerun-if-changed=src/scanner.c");
    println!("cargo:rerun-if-changed=src/parser.c");

    let src_dir = if Path::new("src/parser.c").exists() {
        PathBuf::from("src")
    } else {
        let out_dir = PathBuf::from(std::env::var("OUT_DIR").unwrap());
        generate_parser(&out_dir)
    };

    cc::Build::new()
        .include(&src_dir)
        .flag_if_supported("-Wno-unused-parameter")
        .flag_if_supported("-Wno-unused-but-set-variable")
        .flag_if_supported("-Wno-trigraphs")
        .file(src_dir.join("parser.c"))
        .file(src_dir.join("scanner.c"))
        .compile("parser");
}
