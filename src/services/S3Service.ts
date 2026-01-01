import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "@/core/config";

export class S3Service {
  private s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      region: config.email.awsRegion || "us-east-1",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
    });
  }

  async uploadFile(file: Express.Multer.File, folder: string = "avatars"): Promise<string> {
    const fileExtension = file.originalname.split(".").pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

    const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
    });

    try {
        await this.s3Client.send(command);
        return `${process.env.S3_ENDPOINT}/${fileName}`;
    } catch (error) {
        throw new Error("Failed to upload image to S3");
    }
}
}