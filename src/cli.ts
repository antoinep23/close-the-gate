import { Command } from "commander";
import Key from "./keys";
import File from "./files";

export const program = new Command();

program
  .name("ctg")
  .description("Close The Gate CLI")
  .version("1.0.0");

program
  .command("generate-key")
  .description("Generate a new key")
  .option("-b, --bytes <number>", "Number of bytes for the key (between 16 and 64)", "32")
  .action((options) => {
    const key = new Key();
    const bytes = parseInt(options.bytes, 10);
    try {
      const generatedKeyPath = key.generate(bytes);
      console.log("Key generated successfully:", generatedKeyPath);
    } catch(e) {
      console.error("Error generating key: ", e);
    }
  });

program
  .command("delete-key")
  .description("Delete a key. Make sure no file decryption relevant to that key is needed")
  .requiredOption("-k, --key <keyName>", "Name of the key file to delete inside the /keys folder")
  .action((options) => {
    const key = new Key();
    try {
      const retrieved = key.retrieve(options.key);
      if (retrieved instanceof Error) {
        throw retrieved;
      }

      const deleted = key.delete();
      if (deleted instanceof Error) {
        throw deleted;
      }

      console.log("Key deleted successfully");
    } catch(e) {
      console.error("Error deleting key: ", e);
    }
  });

program
  .command("upload-file")
  .description("Upload an encrypted file to your AWS S3")
  .requiredOption("-f, --file <fileName>", "Name of the file to upload (located inside the /files folder)")
  .requiredOption("-k, --key <keyName>", "Name of the key file to use for upload, located inside the /keys folder")
  .action((options) => {
    const file = new File();
    const key = new Key();
    // to implement
  })