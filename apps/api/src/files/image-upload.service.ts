import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { buffer } from 'stream/consumers';

@Injectable()
export class ImageUploadService {
  private s3 = new S3Client({
    endpoint: process.env.AWS_ENDPOINT || undefined,
    forcePathStyle: true,
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  async getSignedUploadUrl(
    filename: string,
    mimeType: string,
    base64: string | null = null,
  ) {
    const id = randomUUID();
    const fileExtension = filename.split('.').pop();
    if (fileExtension) {
      filename = `${id}.${fileExtension}`;
    } else {
      filename = id;
    }
    const key = `images/${filename}`;

    if (base64) {
      const buffer = Buffer.from(base64, 'base64');

      const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: key,
        ContentType: mimeType,
        Body: buffer,
        ContentEncoding: 'base64',
      });
      await this.s3.send(command);

      const publicUrl = `${process.env.AWS_BUCKET_PUBLIC_DOMAIN}/${process.env.AWS_BUCKET_NAME}/${key}`;
      return { uploadUrl: publicUrl, publicUrl };
    }

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
      ContentType: mimeType,
    });

    let url = await getSignedUrl(this.s3, command, { expiresIn: 300 });

    if (process.env.AWS_BUCKET_PUBLIC_DOMAIN?.includes('localhost')) {
      const publicUrl = `${process.env.AWS_BUCKET_PUBLIC_DOMAIN}/${process.env.AWS_BUCKET_NAME}/${key}`;
      url = url.replace(
        /^https?:\/\/[^\/]+/,
        process.env.AWS_BUCKET_PUBLIC_DOMAIN!,
      );
      return { uploadUrl: url, publicUrl };
    }

    const publicUrl = `https://${process.env.AWS_BUCKET_PUBLIC_DOMAIN}/${process.env.AWS_BUCKET_NAME}/${key}`;
    return { uploadUrl: url, publicUrl };
  }
}
