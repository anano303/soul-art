import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as nodemailer from 'nodemailer';
import archiver = require('archiver');
import { emailConfig } from '@/email.config';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {
    this.transporter = nodemailer.createTransport(emailConfig);
  }

  /**
   * თვეში ორჯერ — 1-სა და 15-ში, ღამის 3 საათზე
   * ყველა კოლექციას ექსპორტავს JSON-ად, ZIP-ში აარქივებს და მეილზე აგზავნის
   */
  @Cron('0 3 1,15 * *')
  async handleScheduledBackup() {
    this.logger.log('🔄 ავტომატური ბექაფი დაიწყო...');
    try {
      await this.createAndSendBackup();
      this.logger.log('✅ ბექაფი წარმატებით გაიგზავნა მეილზე');
    } catch (error) {
      this.logger.error('❌ ბექაფის შეცდომა:', error.message);
    }
  }

  async createAndSendBackup() {
    const db = this.connection.db;
    const collections = await db.listCollections().toArray();
    const date = new Date().toISOString().split('T')[0];
    const filename = `soulart-backup-${date}.zip`;

    // ZIP ბუფერის შექმნა memory-ში
    const zipBuffer = await this.createZipBuffer(db, collections);

    const sizeInMB = (zipBuffer.length / (1024 * 1024)).toFixed(2);
    this.logger.log(`📦 ბექაფის ზომა: ${sizeInMB} MB, კოლექციები: ${collections.length}`);

    // Gmail-ის ლიმიტი 25MB-ია attachment-ისთვის
    if (zipBuffer.length > 24 * 1024 * 1024) {
      // თუ 24MB-ზე მეტია, ნაწილებად გაგზავნა
      await this.sendInParts(zipBuffer, filename, date, collections.length);
    } else {
      await this.sendBackupEmail(zipBuffer, filename, date, collections.length);
    }
  }

  private async createZipBuffer(
    db: any,
    collections: Array<{ name: string }>,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      // ყველა კოლექციის ექსპორტი
      const exportPromise = (async () => {
        for (const col of collections) {
          try {
            const docs = await db
              .collection(col.name)
              .find({})
              .toArray();

            const json = JSON.stringify(docs, null, 2);
            archive.append(json, { name: `${col.name}.json` });

            this.logger.log(
              `  📄 ${col.name}: ${docs.length} დოკუმენტი`,
            );
          } catch (err) {
            this.logger.warn(
              `  ⚠️ ${col.name} ვერ წაეკითხა: ${err.message}`,
            );
          }
        }
        archive.finalize();
      })();

      exportPromise.catch(reject);
    });
  }

  private async sendBackupEmail(
    zipBuffer: Buffer,
    filename: string,
    date: string,
    collectionCount: number,
  ) {
    const sizeInMB = (zipBuffer.length / (1024 * 1024)).toFixed(2);

    await this.transporter.sendMail({
      from: emailConfig.from,
      to: process.env.BACKUP_EMAIL || process.env.EMAIL_USER,
      subject: `🗄️ SoulArt DB Backup — ${date}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2 style="color: #012645;">SoulArt Database Backup</h2>
          <p><strong>თარიღი:</strong> ${date}</p>
          <p><strong>კოლექციები:</strong> ${collectionCount}</p>
          <p><strong>ზომა:</strong> ${sizeInMB} MB</p>
          <p style="color: #666;">ეს ავტომატური ბექაფია. ფაილი მიმაგრებულია ZIP არქივის სახით.</p>
          <hr/>
          <p style="font-size: 12px; color: #999;">SoulArt Automated Backup System</p>
        </div>
      `,
      attachments: [
        {
          filename,
          content: zipBuffer,
          contentType: 'application/zip',
        },
      ],
    });
  }

  private async sendInParts(
    zipBuffer: Buffer,
    filename: string,
    date: string,
    collectionCount: number,
  ) {
    const PART_SIZE = 20 * 1024 * 1024; // 20MB ნაწილებად
    const totalParts = Math.ceil(zipBuffer.length / PART_SIZE);
    const totalSizeMB = (zipBuffer.length / (1024 * 1024)).toFixed(2);

    this.logger.log(
      `📨 ბექაფი ძალიან დიდია (${totalSizeMB} MB), ${totalParts} ნაწილად გაიგზავნება`,
    );

    for (let i = 0; i < totalParts; i++) {
      const start = i * PART_SIZE;
      const end = Math.min(start + PART_SIZE, zipBuffer.length);
      const part = zipBuffer.subarray(start, end);
      const partFilename = filename.replace('.zip', `.part${i + 1}.zip`);

      await this.transporter.sendMail({
        from: emailConfig.from,
        to: process.env.BACKUP_EMAIL || process.env.EMAIL_USER,
        subject: `🗄️ SoulArt DB Backup — ${date} (ნაწილი ${i + 1}/${totalParts})`,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #012645;">SoulArt Database Backup</h2>
            <p><strong>თარიღი:</strong> ${date}</p>
            <p><strong>ნაწილი:</strong> ${i + 1} / ${totalParts}</p>
            <p><strong>სრული ზომა:</strong> ${totalSizeMB} MB</p>
            <p><strong>კოლექციები:</strong> ${collectionCount}</p>
            <p style="color: #666;">ეს ავტომატური ბექაფია. ნაწილები უნდა გაერთიანდეს ZIP-ის სახით.</p>
          </div>
        `,
        attachments: [
          {
            filename: partFilename,
            content: part,
            contentType: 'application/octet-stream',
          },
        ],
      });

      this.logger.log(`  📨 ნაწილი ${i + 1}/${totalParts} გაიგზავნა`);
    }
  }
}
