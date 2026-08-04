import { Command } from "commander";
import Key from "./keys";
import File from "./files";

export const program = new Command();

program
  .name("ctg")
  .description(`                                                                      
 ▗▄▄▖█  ▄▄▄   ▄▄▄ ▗▞▀▚▖       ■  ▐▌   ▗▞▀▚▖       ▗▞▀▜▌   ■  ▗▞▀▚▖
▐▌   █ █   █ ▀▄▄  ▐▛▀▀▘    ▗▄▟▙▄▖▐▌   ▐▛▀▀▘       ▝▚▄▟▌▗▄▟▙▄▖▐▛▀▀▘
▐▌   █ ▀▄▄▄▀ ▄▄▄▀ ▝▚▄▄▖      ▐▌  ▐▛▀▚▖▝▚▄▄▖              ▐▌  ▝▚▄▄▖
▝▚▄▄▖█                       ▐▌  ▐▌ ▐▌          ▗▄▖      ▐▌       
                             ▐▌                ▐▌ ▐▌     ▐▌       
                                                ▝▀▜▌              
                                               ▐▙▄▞▘              

  Close The Gate (CTG) CLI
  Zero-Knowledge S3 Shield
  © antoinep23
  `)
  .version("1.0.0");

program
  .command("generate-key")
  .description("Generate a new key")
  .option("-b, --bytes <number>", "Number of bytes for the key (between 16 and 64)", "32")
  .option("-n, --key-name <keyName>", "Custom name for the key (without the extension)")
  .option("-p, --path <path>", "Custom path for the key (default is /keys at the root of the process)")
  .action((options) => {
    const key = new Key();
    const bytes = parseInt(options.bytes, 10);
    const keyName = options.keyName ? options.keyName : null;
    const customPath = options.path ? options.path : null;

    try {
      const generatedKeyPath = key.generate(bytes, keyName, customPath);
      console.log("Key generated successfully:", generatedKeyPath);
    } catch(e: unknown) {
      console.error(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    }
  });

program
  .command("delete-key")
  .description("Delete a key. Make sure no file decryption relevant to that key is needed")
  .requiredOption("-n, --key-name <keyName>", "Name of the key file to delete")
  .option("-p, --path <path>", "Custom path for the key (default is /keys at the root of the process)")
  .action((options) => {
    const key = new Key();
    const customPath = options.path ? options.path : null;
    
    try {
      const retrieved = key.retrieve(options.keyName, customPath);
      if (retrieved instanceof Error) {
        throw retrieved;
      }

      const deleted = key.delete();
      if (deleted instanceof Error) {
        throw deleted;
      }

      console.log(deleted);
    } catch(e: unknown) {
      console.error(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    }
  });

program
  .command("upload-file")
  .description("Upload an encrypted file to your AWS S3")
  .requiredOption("-f, --file <fileName>", "Name of the file to upload (located inside the /files folder)")
  .requiredOption("-k, --key <keyName>", "Name of the key file to use for upload, located inside the /keys folder")
  .option("-p, --path <path>", "Custom path of the file directory (default is /files at the root of the process)")
  .action(async (options) => {
    const file = new File();
    const key = new Key();
    const customPath = options.path ? options.path : null;
    
    try {
      const retrieved = key.retrieve(options.key);
      if (retrieved instanceof Error) {
        throw retrieved;
      }

      const uploaded = await file.upload(options.file, key, customPath);

      console.log(uploaded);
    } catch(e: unknown) {
      console.error(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    }
  })

  program
  .command("delete-file")
  .description("Delete an encrypted file from your AWS S3. Ensure you pass the right key associated with the file or the deletion will not happen")
  .requiredOption("-f, --file <fileName>", "Name of the file to delete (located inside the /files folder)")
  .requiredOption("-k, --key <keyName>", "Name of the key file to use for deletion, located inside the /keys folder")
  .action(async (options) => {
    const file = new File();
    const key = new Key();
    
    try {
      const retrieved = key.retrieve(options.key);
      if (retrieved instanceof Error) {
        throw retrieved;
      }

      await file.delete(options.file, key);
    } catch(e: unknown) {
      console.error(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    }
  });

program
  .command("download-file")
  .description("Download an encrypted file from your AWS S3")
  .requiredOption("-f, --file <fileName>", "Name of the file to download (located inside the /files folder)")
  .requiredOption("-k, --key <keyName>", "Name of the key file to use for download, located inside the /keys folder")
  .option("-p, --path <path>", "Custom path of the file directory (default is /files at the root of the process)")
  .action(async (options) => {
    const file = new File();
    const key = new Key();
    const customPath = options.path ? options.path : null;
    
    try {
      const retrieved = key.retrieve(options.key);
      if (retrieved instanceof Error) {
        throw retrieved;
      }

      const downloadedPath = await file.download(options.file, key, customPath);

      console.log(`File downloaded successfully at ${downloadedPath}`);
    } catch(e: unknown) {
      console.error(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    }
  });