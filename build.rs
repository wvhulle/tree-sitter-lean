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
    // Copy everything needed to OUT_DIR (handles read-only nix store)
    fs::copy("grammar.js", out_dir.join("grammar.js")).expect("copy grammar.js");
    copy_dir(Path::new("grammar"), &out_dir.join("grammar")).expect("copy grammar/");
    copy_dir(Path::new("src"), &out_dir.join("src")).ok(); // May not exist fully yet

    // Run tree-sitter generate in OUT_DIR
    println!("cargo:warning=Generating parser.c...");
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
