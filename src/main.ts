/// <reference types="node" />
///
import Key from "./keys"
import File from "./files"

const key = new Key;
const bytes = 32; // must be between 16 and 64 bytes

key.generate(bytes);

const s3Folder = process.env.S3_BUCKET!;
const file = new File(s3Folder);
file.upload("example.txt", key)
