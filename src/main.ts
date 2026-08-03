/// <reference types="node" />
///
import Key from "./keys"
import File from "./files"

const key = new Key;
// const bytes = 32; // must be between 16 and 64 bytes
// key.generate(bytes);
key.retrieve("010c0295-4c46-4b70-8768-b1c4c461f72f.pem");

const file = new File();
file.upload("example.txt", key);
// file.delete("example.txt", key);
// file.download("example.txt", key);