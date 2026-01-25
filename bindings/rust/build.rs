fn main() {
    let src_dir = std::path::Path::new("src");
    let parser_path = src_dir.join("parser.c");

    // Generate parser.c if missing (requires tree-sitter CLI)
    if !parser_path.exists() {
        println!("cargo:warning=parser.c not found, running tree-sitter generate...");
        let status = std::process::Command::new("tree-sitter")
            .arg("generate")
            .status()
            .expect("Failed to run tree-sitter generate. Is tree-sitter CLI installed?");
        if !status.success() {
            panic!("tree-sitter generate failed with status: {}", status);
        }
    }

    // Also regenerate if grammar.js is newer than parser.c
    println!("cargo:rerun-if-changed=grammar.js");

    let mut c_config = cc::Build::new();
    c_config.include(&src_dir);
    c_config
        .flag_if_supported("-Wno-unused-parameter")
        .flag_if_supported("-Wno-unused-but-set-variable")
        .flag_if_supported("-Wno-trigraphs");
    c_config.file(&parser_path);

    // External scanner written in C
    let scanner_path = src_dir.join("scanner.c");
    c_config.file(&scanner_path);
    println!("cargo:rerun-if-changed={}", scanner_path.to_str().unwrap());

    println!("cargo:rerun-if-changed={}", parser_path.to_str().unwrap());
    c_config.compile("parser");

    // If your language uses an external scanner written in C++,
    // then include this block of code:

    /*
    let mut cpp_config = cc::Build::new();
    cpp_config.cpp(true);
    cpp_config.include(&src_dir);
    cpp_config
        .flag_if_supported("-Wno-unused-parameter")
        .flag_if_supported("-Wno-unused-but-set-variable");
    let scanner_path = src_dir.join("scanner.cc");
    cpp_config.file(&scanner_path);
    println!("cargo:rerun-if-changed={}", scanner_path.to_str().unwrap());
    cpp_config.compile("scanner");
    */
}
