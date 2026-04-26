import crypto from "crypto";
import fs from "fs";

/**
 * Vypočíta SHA-256 hash súboru.
 * Používa sa na detekciu duplikátnych dokumentov na základe obsahu,
 * nie len názvu súboru.
 *
 * @param filePath - Cesta k súboru
 * @returns Promise<string> - SHA-256 hash ako hex string (64 znakov)
 */
export async function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("data", (data) => {
      hash.update(data);
    });

    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });

    stream.on("error", (err) => {
      reject(err);
    });
  });
}
