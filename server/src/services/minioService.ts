import * as Minio from "minio";

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

if (!process.env.MINIO_ACCESS_KEY || !process.env.MINIO_SECRET_KEY) {
  throw new Error("MinIO credentials are not defined in environment variables");
}

const BUCKET_NAME = process.env.MINIO_BUCKET_RAW || "raw-pdfs";

/**
 * Generate presigned URL for PDF download (valid for 1 hour)
 */
export async function getMinioPresignedUrl(
  objectName: string,
): Promise<string> {
  try {
    const url = await minioClient.presignedGetObject(
      BUCKET_NAME,
      objectName,
      60 * 60, // 1 hour
    );
    return url;
  } catch (error) {
    console.error("MinIO presigned URL error:", error);
    throw new Error("Failed to generate PDF URL");
  }
}

export async function uploadDocumentToMinio(
  filePath: string,
  fileName: string,
): Promise<string> {
  try {
    const ext = fileName.toLowerCase().split(".").pop();
    let contentType = "application/octet-stream";

    if (ext === "pdf") {
      contentType = "application/pdf";
    } else if (ext === "doc") {
      contentType = "application/msword";
    } else if (ext === "docx") {
      contentType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }

    await minioClient.fPutObject(BUCKET_NAME, fileName, filePath, {
      "Content-Type": contentType,
    });
    return fileName;
  } catch (error) {
    console.error("MinIO upload error:", error);
    throw new Error("Failed to upload document to MinIO");
  }
}

export async function ensureBucketExists(): Promise<void> {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, "us-east-1");
      console.log(`✓ MinIO bucket '${BUCKET_NAME}' created`);
    }
  } catch (error) {
    console.error("MinIO bucket error:", error);
  }
}
