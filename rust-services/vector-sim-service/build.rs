fn main() {
    println!("cargo:rerun-if-changed=proto/vector.proto");
    // Protobuf compilation handled separately
}
