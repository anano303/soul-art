#!/usr/bin/env node
/**
 * send-notification-to-batch-users.js
 * 
 * Sends notification email to all 168 users created by register-verification-recipients.js
 * Uses Gmail SMTP (soulart.georgia@gmail.com)
 * 
 * Usage:
 *   node scripts/send-notification-to-batch-users.js          # dry run
 *   node scripts/send-notification-to-batch-users.js --send    # actually send
 */

const { MongoClient } = require('mongodb');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
const SEND = process.argv.includes('--send');

// Batch window: users created by register-verification-recipients.js
const BATCH_START = new Date('2026-04-10T16:21:00Z');
const BATCH_END = new Date('2026-04-10T16:22:00Z');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
});

const SUBJECT = 'SoulArt - მნიშვნელოვანი შეტყობინება';

function buildHtml(email) {
  return `
<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f5f5f5;">
  <div style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:30px 20px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:28px;">SoulArt</h1>
      <p style="color:#e0e7ff;margin:8px 0 0;font-size:14px;">ქართული ხელოვნების მარკეტი</p>
    </div>

    <!-- Content -->
    <div style="padding:30px 25px;">
      <p style="color:#333;font-size:16px;line-height:1.6;margin-bottom:20px;">
        გამარჯობა,
      </p>

      <p style="color:#333;font-size:15px;line-height:1.7;margin-bottom:20px;">
        როგორც იცით, საიტზე არსებული ინფორმაციის ნაწილი ამ დრომდე მიუწვდომელია ირანის თავდასხმის გამო ამაზონის სერვერებზე. მიმდინარეობს აღდგენა.
      </p>

      <p style="color:#333;font-size:15px;line-height:1.7;margin-bottom:20px;">
        გთხოვთ სისტემაში შესასვლელად შეიყვანოთ ერთჯერადი პაროლი:
      </p>

      <!-- Password Box -->
      <div style="background:#f0f0ff;border:2px solid #6366f1;border-radius:8px;padding:15px;text-align:center;margin:20px 0;">
        <p style="margin:0 0 5px;color:#666;font-size:13px;">ერთჯერადი პაროლი:</p>
        <p style="margin:0;color:#6366f1;font-size:32px;font-weight:bold;letter-spacing:8px;">123456</p>
      </div>

      <!-- Login Button -->
      <div style="text-align:center;margin:25px 0;">
        <a href="https://soulart.ge/login" 
           style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:16px;font-weight:600;">
          შესვლა საიტზე
        </a>
      </div>

      <p style="color:#e53e3e;font-size:15px;line-height:1.7;margin-bottom:15px;font-weight:600;">
        ⚠️ შესვლისთანავე აუცილებლად შეცვალეთ პაროლი!
      </p>

      <p style="color:#333;font-size:15px;line-height:1.7;margin-bottom:20px;">
        ასევე, თუ გქონდათ თქვენი მაღაზია და გაქვთ პრობლემა ან არ გიჩანთ ნამუშევრები პირად გვერდზე, მოგვწერეთ ამავე მეილზე ან 
        <a href="https://www.facebook.com/SoulArtGe" style="color:#6366f1;">ფეისბუქის გვერდზე</a>, 
        რომ დაგეხმაროთ.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8f9fa;padding:20px 25px;text-align:center;border-top:1px solid #eee;">
      <p style="color:#888;font-size:12px;margin:0;">
        © 2026 <a href="https://soulart.ge" style="color:#6366f1;text-decoration:none;">SoulArt</a> — ქართული ხელოვნება ერთ სივრცეში
      </p>
      <p style="color:#aaa;font-size:11px;margin:8px 0 0;">
        ეს წერილი გამოგზავნილია soulart.georgia@gmail.com-დან
      </p>
    </div>
  </div>
</body>
</html>`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log(`\n=== Send Notification to Batch Users ===`);
  console.log(`Mode: ${SEND ? '🔴 SENDING' : '🟢 DRY RUN'}\n`);

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  const batchUsers = await db.collection('users').find({
    createdAt: { $gte: BATCH_START, $lte: BATCH_END }
  }).sort({ email: 1 }).toArray();

  console.log(`Found ${batchUsers.length} batch users\n`);

  if (!SEND) {
    console.log('Emails that would receive notification:');
    batchUsers.forEach((u, i) => console.log(`  ${i + 1}. ${u.email} (${u.role})`));
    console.log(`\n🟡 DRY RUN. Run with --send to actually send emails.`);
    await client.close();
    return;
  }

  // Verify transporter
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified\n');
  } catch (err) {
    console.error('❌ SMTP verification failed:', err.message);
    await client.close();
    return;
  }

  let sent = 0, failed = 0;
  const failures = [];

  for (let i = 0; i < batchUsers.length; i++) {
    const user = batchUsers[i];
    const email = user.email;

    try {
      process.stdout.write(`[${i + 1}/${batchUsers.length}] ${email} ... `);

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'SoulArt Support <soulart.georgia@gmail.com>',
        to: email,
        subject: SUBJECT,
        html: buildHtml(email),
      });

      sent++;
      console.log('OK');

      // Rate limit: ~2 emails/sec to avoid Gmail throttling
      if (i < batchUsers.length - 1) {
        await sleep(500);
      }
    } catch (err) {
      failed++;
      console.log(`FAILED: ${err.message}`);
      failures.push({ email, error: err.message });
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Sent: ${sent}`);
  console.log(`Failed: ${failed}`);
  if (failures.length > 0) {
    console.log('Failures:');
    failures.forEach(f => console.log(`  ❌ ${f.email}: ${f.error}`));
  }

  await client.close();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
