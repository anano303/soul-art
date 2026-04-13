'use strict';

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const APPLY = process.argv.includes('--apply');
const DB_NAME = 'test';
const CHAT_DIR = 'C:\\Users\\a.beroshvili\\AppData\\Roaming\\Code\\User\\workspaceStorage\\a8560dbf6b8949e67e43fa5dbceea9f5\\chatSessions';

const SM_LIST = [
  'anakvirikashvili055@gmail.com',
  'earjevanidzee@gmail.com',
  'georgeavsa1@gmail.com',
  'hr.higia@gmail.com',
  'iamageorgiansoldier@gmail.com',
  'iingushka@gmail.com',
  'kristina.kupunia.kris@mail.ru',
  'mariammiqo@gmail.com',
  'mariamsadgobelashvili09@gmail.com',
  'mayabekauri@gmail.com',
  'mirandasulamanidze2018@gmail.com',
  'mrmgoletiani@gmail.com',
  'ninanm777@gmail.com',
  'sales@gmail.com',
  'salesani@gmail.com',
  'salesanni@gmail.com',
  'salokhozrevanidze21@gmail.com',
  'tabatadzedali33@gmail.com',
  'tamari.dardaganidze.1@gmail.com',
  'tamtanarimanidze8@gmail.com',
  'tamuna777@yahoo.com',
  'teasamadashvili1980@gmail.com',
  'temurimakaradze@gmail.com',
  'teonazarandia29@gmail.com',
  'text2sale@gmail.com',
  'tony.johnes@ymail.com',
  'torchinavasophio@gmail.com',
  'tsuladzekato@gmail.com',
  'x.kilasonia97@gmail.com',
];

function collectJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...collectJsonFiles(full));
    else if (e.isFile() && e.name.toLowerCase().endsWith('.json')) out.push(full);
  }
  return out;
}

function normalizePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (/^5\d{8}$/.test(digits)) return `+995${digits}`;
  if (/^9955\d{8}$/.test(digits)) return `+${digits}`;
  return null;
}

function safeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function chooseTop(scored) {
  const entries = [...scored.entries()].sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  return { value: entries[0][0], score: entries[0][1] };
}

async function main() {
  const files = collectJsonFiles(CHAT_DIR);
  const perEmail = new Map();

  for (const email of SM_LIST) {
    perEmail.set(email, {
      phoneScores: new Map(),
      accountScores: new Map(),
      idScores: new Map(),
      snippets: [],
    });
  }

  for (const file of files) {
    let raw = '';
    try {
      raw = fs.readFileSync(file, 'utf8');
    } catch (_) {
      continue;
    }

    if (!raw) continue;

    for (const email of SM_LIST) {
      if (!raw.toLowerCase().includes(email)) continue;

      const record = perEmail.get(email);
      const emailRe = new RegExp(safeRegex(email), 'gi');
      let m;

      while ((m = emailRe.exec(raw)) !== null) {
        const idx = m.index;
        const start = Math.max(0, idx - 350);
        const end = Math.min(raw.length, idx + email.length + 350);
        const ctx = raw.slice(start, end);
        const lower = ctx.toLowerCase();

        if (record.snippets.length < 3) {
          record.snippets.push(ctx.replace(/\s+/g, ' ').slice(0, 220));
        }

        // Phone candidates
        const phoneMatches = ctx.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) || [];
        for (const p of phoneMatches) {
          const norm = normalizePhone(p);
          if (!norm) continue;
          const score = norm.startsWith('+9955') ? 4 : 2;
          record.phoneScores.set(norm, (record.phoneScores.get(norm) || 0) + score);
        }

        // Account candidates
        const ibanMatches = ctx.match(/GE\d{2}[A-Z]{2}\d{16}/g) || [];
        for (const a of ibanMatches) {
          record.accountScores.set(a, (record.accountScores.get(a) || 0) + 6);
        }

        const accountWithKeyword = /(?:account|ანგარიშ|საბანკო|iban)[^A-Z0-9]{0,25}([A-Z0-9]{16,34})/gi;
        let am;
        while ((am = accountWithKeyword.exec(ctx)) !== null) {
          const val = am[1].toUpperCase();
          if (val.length < 16) continue;
          record.accountScores.set(val, (record.accountScores.get(val) || 0) + 3);
        }

        // Personal ID candidates (strict: keyword must be near)
        const idWithKeyword = /(?:პირადი\s*ნომერი|საიდენტიფიკაციო\s*(?:ნომერი|კოდი)|identificationnumber|identification\s*number|personal\s*number|passport\s*number|პასპორტის\s*ნომერი)[^0-9]{0,16}(\d{11})/gi;
        let im;
        while ((im = idWithKeyword.exec(ctx)) !== null) {
          const val = im[1];
          if (/objectid|toolid|messageid|_id|seller id|order id|transaction id|uniquekey/i.test(lower)) continue;
          record.idScores.set(val, (record.idScores.get(val) || 0) + 5);
        }

        // Bare 11-digit number only if strong keywords appear in the same context
        if (/(პირადი\s*ნომერი|საიდენტიფიკაციო\s*(ნომერი|კოდი)|identification\s*number|personal\s*number|passport\s*number|პასპორტის\s*ნომერი)/i.test(lower) && !/objectid|toolid|messageid|_id|seller id|order id|transaction id|uniquekey/i.test(lower)) {
          const bare = ctx.match(/\b\d{11}\b/g) || [];
          for (const b of bare) {
            record.idScores.set(b, (record.idScores.get(b) || 0) + 1);
          }
        }
      }
    }
  }

  const uri = process.env.MONGODB_URI;
  const client = await MongoClient.connect(uri);
  const db = client.db(DB_NAME);
  const users = db.collection('users');

  const updates = [];
  const report = [];

  for (const email of SM_LIST) {
    const rec = perEmail.get(email);
    const topPhone = chooseTop(rec.phoneScores);
    const topAccount = chooseTop(rec.accountScores);
    const topId = chooseTop(rec.idScores);

    const user = await users.findOne(
      { email: new RegExp(`^${safeRegex(email)}$`, 'i') },
      {
        projection: {
          email: 1,
          role: 1,
          phoneNumber: 1,
          accountNumber: 1,
          identificationNumber: 1,
        },
      }
    );

    const patch = {};

    if (user && !user.phoneNumber && topPhone && topPhone.score >= 4) {
      patch.phoneNumber = topPhone.value;
    }

    if (user && !user.accountNumber && topAccount && topAccount.score >= 6) {
      patch.accountNumber = topAccount.value;
    }

    if (user && !user.identificationNumber && topId && topId.score >= 6) {
      patch.identificationNumber = topId.value;
    }

    report.push({
      email,
      role: user ? user.role : 'NOT_FOUND',
      dbPhone: user ? user.phoneNumber || null : null,
      dbAccountNumber: user ? user.accountNumber || null : null,
      dbIdentificationNumber: user ? user.identificationNumber || null : null,
      foundPhone: topPhone,
      foundAccount: topAccount,
      foundIdentification: topId,
      snippets: rec.snippets,
      patch,
    });

    if (user && Object.keys(patch).length) {
      updates.push({ email: user.email, patch });
    }
  }

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`Potential SM detail updates: ${updates.length}`);

  for (const u of updates) {
    console.log(`  ${APPLY ? 'UPDATING' : 'WOULD UPDATE'} ${u.email} -> ${JSON.stringify(u.patch)}`);
    if (APPLY) {
      await users.updateOne(
        { email: new RegExp(`^${safeRegex(u.email)}$`, 'i') },
        { $set: u.patch }
      );
    }
  }

  const outDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'sm-details-recovery-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Report saved: ${outPath}`);

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
