const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const nodemailer = require('nodemailer');
const archiver = require('archiver');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const RECIPIENT = process.env.EMAIL_USER || 'admin@soulart.ge';
const INCLUDED_DBS = ['dev', 'test', 'soulartChat'];
const MAX_ATTACHMENT_BYTES = 24 * 1024 * 1024;

function sanitizeMongoUri(uri) {
  return String(uri || '')
    .replace(/appName(?=&|$)/g, 'appName=SoulArt')
    .replace(/appName=&/g, 'appName=SoulArt&')
    .replace(/\?&/, '?')
    .replace(/&&/g, '&');
}

function buildTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function createZipBuffer(client, dbNames) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks = [];

    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    (async () => {
      for (const dbName of dbNames) {
        const db = client.db(dbName);
        const collections = await db.listCollections().toArray();
        for (const col of collections) {
          try {
            const docs = await db.collection(col.name).find({}).toArray();
            archive.append(JSON.stringify(docs, null, 2), {
              name: `${dbName}/${col.name}.json`,
            });
            console.log(`Added ${dbName}/${col.name}.json (${docs.length} docs)`);
          } catch (error) {
            console.warn(`Skip ${dbName}/${col.name}: ${error.message}`);
          }
        }
      }
      archive.finalize();
    })().catch(reject);
  });
}

async function sendSingleEmail(transporter, buffer, filename, summaryHtml) {
  await transporter.sendMail({
    from: `SoulArt Support <${process.env.EMAIL_USER}>`,
    to: RECIPIENT,
    subject: `SoulArt Full DB Backup - ${new Date().toISOString().slice(0, 10)}`,
    html: summaryHtml,
    attachments: [
      {
        filename,
        content: buffer,
        contentType: 'application/zip',
      },
    ],
  });
}

async function sendInParts(transporter, buffer, baseFilename, summaryHtml) {
  const totalParts = Math.ceil(buffer.length / MAX_ATTACHMENT_BYTES);
  for (let index = 0; index < totalParts; index++) {
    const start = index * MAX_ATTACHMENT_BYTES;
    const end = Math.min(start + MAX_ATTACHMENT_BYTES, buffer.length);
    const part = buffer.subarray(start, end);
    const filename = baseFilename.replace('.zip', `.part${index + 1}.zip`);
    await transporter.sendMail({
      from: `SoulArt Support <${process.env.EMAIL_USER}>`,
      to: RECIPIENT,
      subject: `SoulArt Full DB Backup - ${new Date().toISOString().slice(0, 10)} (${index + 1}/${totalParts})`,
      html: `${summaryHtml}<p><strong>Part:</strong> ${index + 1}/${totalParts}</p>`,
      attachments: [
        {
          filename,
          content: part,
          contentType: 'application/octet-stream',
        },
      ],
    });
    console.log(`Sent part ${index + 1}/${totalParts}`);
  }
}

async function main() {
  const mongoUri = sanitizeMongoUri(process.env.MONGODB_URI || process.env.DATABASE_URL);
  if (!mongoUri) throw new Error('Missing MONGODB_URI/DATABASE_URL');
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) throw new Error('Missing EMAIL_USER/EMAIL_PASS');

  const client = new MongoClient(mongoUri);
  await client.connect();
  try {
    const dbs = await client.db().admin().listDatabases();
    const available = new Set(dbs.databases.map((db) => db.name));
    const targetDbs = INCLUDED_DBS.filter((name) => available.has(name));
    if (!targetDbs.length) throw new Error('No target databases found');

    console.log(`Backing up DBs: ${targetDbs.join(', ')}`);
    const zipBuffer = await createZipBuffer(client, targetDbs);
    const date = new Date().toISOString().slice(0, 10);
    const filename = `soulart-full-backup-${date}.zip`;

    const outDir = path.join(__dirname, 'output');
    fs.mkdirSync(outDir, { recursive: true });
    const localPath = path.join(outDir, filename);
    fs.writeFileSync(localPath, zipBuffer);

    const sizeMb = (zipBuffer.length / (1024 * 1024)).toFixed(2);
    const summaryHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #012645;">SoulArt Full Database Backup</h2>
        <p><strong>Databases:</strong> ${targetDbs.join(', ')}</p>
        <p><strong>Size:</strong> ${sizeMb} MB</p>
        <p><strong>Recipient:</strong> ${RECIPIENT}</p>
        <p>Backup was generated from the current MongoDB cluster and attached as ZIP.</p>
      </div>
    `;

    const transporter = buildTransporter();
    if (zipBuffer.length <= MAX_ATTACHMENT_BYTES) {
      await sendSingleEmail(transporter, zipBuffer, filename, summaryHtml);
      console.log(`Sent backup in a single email to ${RECIPIENT}`);
    } else {
      await sendInParts(transporter, zipBuffer, filename, summaryHtml);
      console.log(`Sent backup in parts to ${RECIPIENT}`);
    }

    console.log(JSON.stringify({ recipient: RECIPIENT, dbs: targetDbs, sizeMb, localPath }, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});