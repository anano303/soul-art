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
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...collectJsonFiles(full));
    else if (e.isFile() && e.name.toLowerCase().endsWith('.json')) files.push(full);
  }
  return files;
}

function normalizePhone(rawPhone) {
  if (!rawPhone) return null;
  let value = String(rawPhone).trim().replace(/[^\d+]/g, '');
  if (!value) return null;
  if (value.startsWith('00')) value = `+${value.slice(2)}`;
  const digits = value.replace(/\D/g, '');
  if (/^5\d{8}$/.test(digits)) return `+995${digits}`;
  if (/^995\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

function phoneScore(phone) {
  if (!phone) return 0;
  let score = 0;
  if (phone.startsWith('+995')) score += 3;
  if (/\+9955\d{8}$/.test(phone)) score += 2;
  return score;
}

function detectRoleFromContext(context) {
  const t = context.toLowerCase();
  const isSeller = /\bseller\b|\bartist\b|\bstore\b|\bartistslug\b|სელერ|მხატვარ|არტისტ/.test(t);
  const isSales = /sales[_\s-]?manager|sales[_\s-]?ref|commission|კომისი|სეილ|რეფერ/.test(t);
  const isAdmin = /\badmin\b|ადმინ/.test(t);
  const isBlogger = /\bblogger\b|ბლოგერ/.test(t);

  if (isSeller && isSales) return 'seller_sales_manager';
  if (isSales) return 'sales_manager';
  if (isSeller) return 'seller';
  if (isAdmin) return 'admin';
  if (isBlogger) return 'blogger';
  return 'user';
}

function roleScore(role) {
  switch (role) {
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

function chooseRole(roleBag) {
  if (!roleBag) return 'user';
  const entries = Object.entries(roleBag);
  if (!entries.length) return 'user';
  entries.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return roleScore(b[0]) - roleScore(a[0]);
  });
  return entries[0][0] || 'user';
}

function chooseConfidentRole(roleBag) {
  if (!roleBag) return null;
  const entries = Object.entries(roleBag);
  if (!entries.length) return null;

  entries.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return roleScore(b[0]) - roleScore(a[0]);
  });

  const [topRole, topCount] = entries[0];
  const userCount = roleBag.user || 0;
  const secondCount = entries[1] ? entries[1][1] : 0;

  if (topRole === 'user' || topRole === 'customer') return null;

  // Conservative gating: require strong and dominant signal.
  const strongEnough = topCount >= 3;
  const dominantOverUser = topCount >= userCount + 2;
  const dominantOverSecond = topCount >= secondCount + 1;

  if (strongEnough && dominantOverUser && dominantOverSecond) {
    return topRole;
  }

  return null;
}

function extractHints(text) {
  const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const phoneRegex = /(?:\+?\d[\d\s().-]{7,}\d)/g;
  const windowChars = 260;
  const roleHints = new Map();
  const phoneHints = new Map();

  let match;
  while ((match = emailRegex.exec(text)) !== null) {
    const email = String(match[0]).toLowerCase();
    const idx = match.index;
    const around = text.slice(Math.max(0, idx - windowChars), Math.min(text.length, idx + email.length + windowChars));

    const role = detectRoleFromContext(around);
    if (!roleHints.has(email)) roleHints.set(email, {});
    const bag = roleHints.get(email);
    bag[role] = (bag[role] || 0) + 1;

    let pMatch;
    while ((pMatch = phoneRegex.exec(around)) !== null) {
      const p = normalizePhone(pMatch[0]);
      if (!p) continue;
      if (!phoneHints.has(email)) phoneHints.set(email, new Set());
      phoneHints.get(email).add(p);
    }
  }

  return { roleHints, phoneHints };
}

function isPlaceholderEmail(email) {
  const e = String(email || '').toLowerCase().trim();
  if (!e) return true;

  const patterns = [
    /^test/i,
    /^example/i,
    /^unknown@/,
    /^your[-_a-z0-9]*@/,
    /^no-?reply@/,
    /^pending@payment\.com$/,
    /^real@user\.com$/,
    /@x\.ai$/,
    /@.*mongodb\.net$/,
    /@your-project\.iam\.gserviceaccount\.com$/,
    /@soulart-analytics\.iam\.gserviceaccount\.com$/,
  ];

  return patterns.some((p) => p.test(e));
}

async function main() {
  const chatDir =
    getArg('--chat-dir') ||
    process.env.CHAT_SESSIONS_DIR ||
    path.join(process.env.APPDATA || '', 'Code', 'User', 'workspaceStorage', 'a8560dbf6b8949e67e43fa5dbceea9f5', 'chatSessions');
  const outputPath = getArg('--output') || path.join(process.cwd(), 'scripts', 'output', 'corrected-imported-chat-users.json');
  const apply = hasFlag('--apply');

  const uri = process.env.MONGODB_URI || getArg('--mongo-uri');
  if (!uri) throw new Error('MONGODB_URI/--mongo-uri is required');

  // Build hints from chat files
  const files = collectJsonFiles(chatDir);
  const roleHints = new Map();
  const phoneHints = new Map();
  for (const f of files) {
    let raw = '';
    try {
      raw = fs.readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    const hints = extractHints(raw);
    for (const [email, bag] of hints.roleHints.entries()) {
      if (!roleHints.has(email)) roleHints.set(email, {});
      const target = roleHints.get(email);
      for (const [r, c] of Object.entries(bag)) target[r] = (target[r] || 0) + c;
    }
    for (const [email, set] of hints.phoneHints.entries()) {
      if (!phoneHints.has(email)) phoneHints.set(email, new Set());
      const target = phoneHints.get(email);
      for (const p of set) target.add(p);
    }
  }

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = process.env.DB_NAME ? client.db(process.env.DB_NAME) : client.db();
    const users = db.collection('users');

    // Find imported cohort safely: biggest same-createdAt bucket among recent NO_PASS generic users.
    const since = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const buckets = await users
      .aggregate([
        {
          $match: {
            createdAt: { $gte: since },
            $or: [{ password: { $exists: false } }, { password: null }, { password: '' }],
            $or: [{ role: 'user' }, { role: 'customer' }, { role: { $exists: false } }, { role: null }],
          },
        },
        { $group: { _id: '$createdAt', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ])
      .toArray();

    if (!buckets.length) throw new Error('Could not detect imported cohort bucket');

    const cohortDate = buckets[0]._id;
    const imported = await users
      .find(
        {
          createdAt: cohortDate,
          $or: [{ password: { $exists: false } }, { password: null }, { password: '' }],
          $or: [{ role: 'user' }, { role: 'customer' }, { role: { $exists: false } }, { role: null }],
        },
        { projection: { _id: 1, email: 1, role: 1, phoneNumber: 1, name: 1, createdAt: 1 } },
      )
      .toArray();

    const importedIds = new Set(imported.map((u) => String(u._id)));
    const importedEmails = new Set(imported.map((u) => String(u.email).toLowerCase()));

    const allUsers = await users.find({}, { projection: { _id: 1, email: 1, role: 1 } }).toArray();
    const nonImportedByEmail = new Map();
    for (const u of allUsers) {
      const id = String(u._id);
      const email = String(u.email || '').toLowerCase();
      if (!email || importedIds.has(id)) continue;
      nonImportedByEmail.set(email, u);
    }

    const toDelete = [];
    const toUpdate = [];

    for (const u of imported) {
      const email = String(u.email || '').toLowerCase();

      if (isPlaceholderEmail(email)) {
        toDelete.push({ _id: String(u._id), email, reason: 'placeholder/system email' });
        continue;
      }

      if (email.startsWith('n') && email.length > 5) {
        const stripped = email.slice(1);
        const hasReal = nonImportedByEmail.has(stripped) || importedEmails.has(stripped);
        if (hasReal) {
          toDelete.push({ _id: String(u._id), email, reason: `prefixed duplicate of ${stripped}` });
          continue;
        }
      }

      const inferredRole = chooseConfidentRole(roleHints.get(email));
      const bestPhone = phoneHints.has(email)
        ? [...phoneHints.get(email)].sort((a, b) => phoneScore(b) - phoneScore(a))[0]
        : null;

      const patch = {};
      if (inferredRole) patch.role = inferredRole;
      if (!u.phoneNumber && bestPhone) patch.phoneNumber = bestPhone;
      if (Object.keys(patch).length > 0) {
        patch.updatedAt = new Date();
        toUpdate.push({ _id: String(u._id), email, patch });
      }
    }

    const summary = {
      scannedChatFiles: files.length,
      detectedCohortCreatedAt: cohortDate,
      importedCohortCount: imported.length,
      deleteCandidates: toDelete,
      updateCandidates: toUpdate,
      deletedCount: 0,
      updatedCount: 0,
      mode: apply ? 'APPLY' : 'DRY_RUN',
    };

    if (apply) {
      if (toDelete.length) {
        const ids = toDelete.map((d) => new ObjectId(d._id));
        const delRes = await users.deleteMany({ _id: { $in: ids } });
        summary.deletedCount = delRes.deletedCount || 0;
      }

      let updated = 0;
      for (const item of toUpdate) {
        const res = await users.updateOne({ _id: new ObjectId(item._id) }, { $set: item.patch });
        if (res.modifiedCount > 0) updated += 1;
      }
      summary.updatedCount = updated;
    }

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2), 'utf8');

    console.log('cohort:', imported.length);
    console.log('deleteCandidates:', toDelete.length);
    console.log('updateCandidates:', toUpdate.length);
    if (apply) {
      console.log('deleted:', summary.deletedCount);
      console.log('updated:', summary.updatedCount);
    }
    console.log('wrote:', outputPath);
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
