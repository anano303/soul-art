/**
 * Recover missing users from local VS Code chat session history.
 *
 * Default behavior is DRY-RUN.
 *
 * Usage:
 *   node scripts/recover-users-from-vscode-chats.js --chat-dir "C:\\...\\chatSessions" --mongo-uri "mongodb+srv://..." --db-name "soulart" --output "./scripts/output/recovered-chat-users.json"
 *   node scripts/recover-users-from-vscode-chats.js --chat-dir "C:\\...\\chatSessions" --mongo-uri "mongodb+srv://..." --apply
 */

const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const argv = process.argv.slice(2);

function getArg(name, fallback = null) {
  const idx = argv.indexOf(name);
  if (idx === -1) return fallback;
  return argv[idx + 1] || fallback;
}

function hasFlag(name) {
  return argv.includes(name);
}

function collectJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsonFiles(full));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
      files.push(full);
    }
  }

  return files;
}

function extractEmailsFromText(text) {
  const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const matches = text.match(emailRegex) || [];
  return matches.map((m) => m.toLowerCase());
}

function normalizePhone(rawPhone) {
  if (!rawPhone) return null;

  let value = String(rawPhone).trim();
  value = value.replace(/[^\d+]/g, '');

  if (!value) return null;
  if (value.startsWith('00')) value = `+${value.slice(2)}`;
  const digits = value.replace(/\D/g, '');

  // Georgia local mobile format: 5XXXXXXXX
  if (/^5\d{8}$/.test(digits)) {
    return `+995${digits}`;
  }

  // Georgia international mobile/landline format: +995XXXXXXXXX
  if (/^995\d{9}$/.test(digits)) {
    return `+${digits}`;
  }

  return null;
}

function phoneScore(phone) {
  if (!phone) return 0;
  let score = 0;
  if (phone.startsWith('+995')) score += 3;
  if (/\+9955\d{8}$/.test(phone)) score += 2;
  if (/^\+\d{10,15}$/.test(phone)) score += 1;
  return score;
}

function extractEmailPhonePairs(text) {
  const pairs = new Map();
  const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const phoneRegex = /(?:\+?\d[\d\s().-]{7,}\d)/g;
  const windowChars = 260;

  let match;
  while ((match = emailRegex.exec(text)) !== null) {
    const email = String(match[0]).toLowerCase();
    const idx = match.index;
    const start = Math.max(0, idx - windowChars);
    const end = Math.min(text.length, idx + email.length + windowChars);
    const around = text.slice(start, end);

    const candidatePhones = [];
    let phoneMatch;
    while ((phoneMatch = phoneRegex.exec(around)) !== null) {
      const normalized = normalizePhone(phoneMatch[0]);
      if (normalized) candidatePhones.push(normalized);
    }

    if (!candidatePhones.length) continue;

    candidatePhones.sort((a, b) => phoneScore(b) - phoneScore(a));

    if (!pairs.has(email)) pairs.set(email, new Set());
    pairs.get(email).add(candidatePhones[0]);
  }

  return pairs;
}

function roleScore(baseRole) {
  switch (baseRole) {
    case 'seller_sales_manager':
      return 5;
    case 'sales_manager':
      return 4;
    case 'seller':
      return 3;
    case 'admin':
      return 2;
    case 'blogger':
      return 1;
    default:
      return 0;
  }
}

function detectRoleFromContext(context) {
  const t = context.toLowerCase();

  const isSeller =
    /\bseller\b|\bsellers\b|\bartist\b|\bstore\b|\bartistslug\b|სელერ|მხატვარ|არტისტ/.test(t);
  const isSales =
    /sales[_\s-]?manager|sales[_\s-]?ref|commission|კომისი|სეილ|რეფერ/.test(t);
  const isAdmin = /\badmin\b|ადმინ/.test(t);
  const isBlogger = /\bblogger\b|ბლოგერ/.test(t);

  if (isSeller && isSales) return 'seller_sales_manager';
  if (isSales) return 'sales_manager';
  if (isSeller) return 'seller';
  if (isAdmin) return 'admin';
  if (isBlogger) return 'blogger';
  return 'user';
}

function extractEmailRoleHints(text) {
  const hints = new Map();
  const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const windowChars = 260;

  let match;
  while ((match = emailRegex.exec(text)) !== null) {
    const email = String(match[0]).toLowerCase();
    const idx = match.index;
    const start = Math.max(0, idx - windowChars);
    const end = Math.min(text.length, idx + email.length + windowChars);
    const around = text.slice(start, end);

    const role = detectRoleFromContext(around);
    if (!hints.has(email)) hints.set(email, {});

    const bag = hints.get(email);
    bag[role] = (bag[role] || 0) + 1;
  }

  return hints;
}

function chooseRole(roleHintBag) {
  if (!roleHintBag) return 'user';

  const entries = Object.entries(roleHintBag);
  if (!entries.length) return 'user';

  entries.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return roleScore(b[0]) - roleScore(a[0]);
  });

  return entries[0][0] || 'user';
}

function isLikelyRealUserEmail(email) {
  if (!email || !email.includes('@')) return false;

  const blockedPatterns = [
    /@example\./i,
    /@users\.noreply\.github\.com$/i,
    /@cluster0\..*mongodb\.net$/i,
    /^admin@cluster0\./i,
    /^integration@/i,
    /^api@/i,
    /^hello@ollama\.com$/i,
  ];

  return !blockedPatterns.some((p) => p.test(email));
}

function generateNameFromEmail(email) {
  const local = email.split('@')[0] || 'User';
  const cleaned = local.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Recovered User';

  return cleaned
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .slice(0, 80);
}

async function main() {
  const chatDir =
    getArg('--chat-dir') ||
    process.env.CHAT_SESSIONS_DIR ||
    path.join(
      process.env.APPDATA || '',
      'Code',
      'User',
      'workspaceStorage',
      'a8560dbf6b8949e67e43fa5dbceea9f5',
      'chatSessions',
    );

  const mongoUri = getArg('--mongo-uri') || process.env.MONGODB_URI;
  const dbName = getArg('--db-name') || process.env.DB_NAME || undefined;
  const outputPath =
    getArg('--output') || path.join(process.cwd(), 'scripts', 'output', 'recovered-chat-users.json');
  const apply = hasFlag('--apply');

  console.log('=== Recover Users From VS Code Chats ===');
  console.log('chatDir:', chatDir);
  console.log('mode:', apply ? 'APPLY' : 'DRY-RUN');

  const jsonFiles = collectJsonFiles(chatDir);
  if (!jsonFiles.length) {
    throw new Error(`No .json files found in: ${chatDir}`);
  }

  const rawEmails = new Set();
  const emailToPhones = new Map();
  const emailRoleHints = new Map();

  for (const file of jsonFiles) {
    let content = '';
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const emails = extractEmailsFromText(content);
    for (const email of emails) rawEmails.add(email);

    const localPairs = extractEmailPhonePairs(content);
    for (const [email, phones] of localPairs.entries()) {
      if (!emailToPhones.has(email)) emailToPhones.set(email, new Set());
      const target = emailToPhones.get(email);
      for (const p of phones) target.add(p);
    }

    const localRoleHints = extractEmailRoleHints(content);
    for (const [email, bag] of localRoleHints.entries()) {
      if (!emailRoleHints.has(email)) emailRoleHints.set(email, {});
      const target = emailRoleHints.get(email);
      for (const [role, count] of Object.entries(bag)) {
        target[role] = (target[role] || 0) + count;
      }
    }
  }

  const allEmails = [...rawEmails].sort();
  const filteredEmails = allEmails.filter(isLikelyRealUserEmail);

  const summary = {
    scannedFiles: jsonFiles.length,
    extractedEmails: allEmails.length,
    filteredEmails: filteredEmails.length,
    emailsWithPhoneCandidates: 0,
    filteredOut: allEmails.filter((e) => !filteredEmails.includes(e)),
    missingUsers: [],
    existingUsers: [],
    insertedUsers: 0,
    phoneUpdatesForExistingUsers: [],
    appliedPhoneUpdates: 0,
    roleUpdatesForExistingUsers: [],
    appliedRoleUpdates: 0,
  };

  summary.emailsWithPhoneCandidates = filteredEmails.filter((e) => emailToPhones.has(e)).length;

  if (!mongoUri) {
    console.log('\nNo Mongo URI provided. Skipping DB comparison.');
    console.log(`Found ${filteredEmails.length} filtered emails.`);
    console.log('Tip: pass --mongo-uri or set MONGODB_URI to compare and restore.');

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(
      outputPath,
      JSON.stringify({ ...summary, candidates: filteredEmails }, null, 2),
      'utf8',
    );
    console.log('Wrote:', outputPath);
    return;
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = dbName ? client.db(dbName) : client.db();
    const users = db.collection('users');

    const existing = await users
      .find(
        { email: { $in: filteredEmails } },
        { projection: { _id: 1, email: 1, name: 1, role: 1, phoneNumber: 1 } },
      )
      .toArray();

    const existingSet = new Set(existing.map((u) => String(u.email).toLowerCase()));

    summary.existingUsers = existing
      .map((u) => ({
        _id: String(u._id),
        email: u.email,
        name: u.name,
        role: u.role,
        phoneNumber: u.phoneNumber || null,
      }))
      .sort((a, b) => a.email.localeCompare(b.email));

    summary.missingUsers = filteredEmails
      .filter((email) => !existingSet.has(email))
      .map((email) => ({
        email,
        name: generateNameFromEmail(email),
        role: chooseRole(emailRoleHints.get(email)),
        phoneNumber: emailToPhones.has(email)
          ? [...emailToPhones.get(email)].sort((a, b) => phoneScore(b) - phoneScore(a))[0]
          : null,
      }));

    const phoneTargetRoles = new Set(['seller', 'sales_manager', 'seller_sales_manager']);
    const phoneUpdates = [];
    for (const u of summary.existingUsers) {
      if (!phoneTargetRoles.has(u.role)) continue;
      if (u.phoneNumber) continue;
      const phones = emailToPhones.get(String(u.email).toLowerCase());
      if (!phones || phones.size === 0) continue;
      const bestPhone = [...phones].sort((a, b) => phoneScore(b) - phoneScore(a))[0];
      if (!bestPhone) continue;
      phoneUpdates.push({
        _id: u._id,
        email: u.email,
        role: u.role,
        phoneNumber: bestPhone,
      });
    }
    summary.phoneUpdatesForExistingUsers = phoneUpdates;

    const roleUpdates = [];
    for (const u of summary.existingUsers) {
      const inferred = chooseRole(emailRoleHints.get(String(u.email).toLowerCase()));
      if (!inferred || inferred === 'user') continue;
      if (u.role === inferred) continue;

      // Update only generic users/customers to avoid overriding already specialized roles.
      if (u.role === 'user' || u.role === 'customer' || !u.role) {
        roleUpdates.push({
          _id: u._id,
          email: u.email,
          oldRole: u.role || 'user',
          newRole: inferred,
        });
      }
    }
    summary.roleUpdatesForExistingUsers = roleUpdates;

    console.log('\nDB comparison done:');
    console.log('- Existing:', summary.existingUsers.length);
    console.log('- Missing:', summary.missingUsers.length);
    console.log('- Existing sellers/sales phone candidates:', summary.phoneUpdatesForExistingUsers.length);
    console.log('- Existing role updates candidates:', summary.roleUpdatesForExistingUsers.length);

    if (apply && summary.missingUsers.length) {
      const now = new Date();
      const docs = summary.missingUsers.map((u) => ({
        name: u.name,
        email: u.email,
        role: 'user',
        knownDevices: [],
        followers: [],
        following: [],
        followersCount: 0,
        followingCount: 0,
        balance: 0,
        referralBalance: 0,
        salesCommissionBalance: 0,
        totalSalesCommissions: 0,
        totalEarnings: 0,
        totalReferrals: 0,
        monthlyWithdrawals: 0,
        ...(u.phoneNumber ? { phoneNumber: u.phoneNumber } : {}),
        createdAt: now,
        updatedAt: now,
      }));

      const res = await users.insertMany(docs, { ordered: false });
      summary.insertedUsers = res.insertedCount || 0;
      console.log('\nInserted users:', summary.insertedUsers);
    }

    if (apply && summary.phoneUpdatesForExistingUsers.length) {
      let applied = 0;
      for (const upd of summary.phoneUpdatesForExistingUsers) {
        const result = await users.updateOne(
          {
            _id: new ObjectId(upd._id),
            $or: [{ phoneNumber: { $exists: false } }, { phoneNumber: null }, { phoneNumber: '' }],
          },
          {
            $set: {
              phoneNumber: upd.phoneNumber,
              updatedAt: new Date(),
            },
          },
        );
        if (result.modifiedCount > 0) applied += 1;
      }
      summary.appliedPhoneUpdates = applied;
      console.log('Applied phone updates:', summary.appliedPhoneUpdates);
    }

    if (apply && summary.roleUpdatesForExistingUsers.length) {
      let applied = 0;
      for (const upd of summary.roleUpdatesForExistingUsers) {
        const result = await users.updateOne(
          {
            _id: new ObjectId(upd._id),
            $or: [{ role: 'user' }, { role: 'customer' }, { role: { $exists: false } }, { role: null }],
          },
          {
            $set: {
              role: upd.newRole,
              updatedAt: new Date(),
            },
          },
        );

        if (result.modifiedCount > 0) applied += 1;
      }
      summary.appliedRoleUpdates = applied;
      console.log('Applied role updates:', summary.appliedRoleUpdates);
    }
  } finally {
    await client.close();
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log('Wrote:', outputPath);
}

main().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
