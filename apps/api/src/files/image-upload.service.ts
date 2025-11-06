import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class ImageUploadService {
  private s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  async getSignedUploadUrl(filename: string, mimeType: string) {
    const id = randomUUID();
    const key = `uploads/${id}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
      ContentType: mimeType,
    });

    const url = await getSignedUrl(this.s3, command, { expiresIn: 300 });

    const publicUrl = `https://${process.env.AWS_BUCKET_PUBLIC_DOMAIN}/${key}`;
    return { uploadUrl: url, publicUrl };
  }
}
