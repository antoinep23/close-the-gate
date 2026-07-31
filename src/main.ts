/// <reference types="node" />
///
import Key from "./keys"

const key = new Key;
const bytes = 32; // must be between 16 and 64 bytes

key.generate(bytes);
key.delete();