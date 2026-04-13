const fs = require('fs');
const path = require('path');
const tls = require('tls');
const { MongoClient } = require('mongodb');
const argon2 = require('argon2');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const GRAPH_API = 'https://graph.facebook.com/v19.0';
const PAGE_ID = process.env.FACEBOOK_POSTS_PAGE_ID || process.env.FACEBOOK_PAGE_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_POSTS_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const CHAT_DIR = 'C:\\Users\\a.beroshvili\\AppData\\Roaming\\Code\\User\\workspaceStorage\\a8560dbf6b8949e67e43fa5dbceea9f5\\chatSessions';
const RECOVERED_USERS_FILE = path.join(__dirname, 'output', 'recovered-chat-users.json');
const APPLY = process.argv.includes('--apply');
const IMPORT = process.argv.includes('--import');
const DEFAULT_PASSWORD = '123456';
const MAX_SCAN = 700;
const SENT_SCAN = 2500;

function sanitizeMongoUri(uri) {
  return String(uri || '')
    .replace(/appName(?=&|$)/g, 'appName=SoulArt')
    .replace(/appName=&/g, 'appName=SoulArt&')
    .replace(/\?&/, '?')
    .replace(/&&/g, '&');
}

const MONGODB_URI = sanitizeMongoUri(process.env.MONGODB_URI || process.env.DATABASE_URL);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeSlug(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeLoose(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function decodeMimeWords(input) {
  if (!input) return '';
  return input.replace(/=\?([^?]+)\?([BbQq])\?([^?]+)\?=/g, (_, charset, encoding, text) => {
    try {
      let buf;
      if (encoding.toUpperCase() === 'B') buf = Buffer.from(text, 'base64');
      else {
        const qp = text.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (m, hex) => String.fromCharCode(parseInt(hex, 16)));
        buf = Buffer.from(qp, 'binary');
      }
      if (/utf-8/i.test(charset)) return buf.toString('utf8');
      return buf.toString();
    } catch {
      return text;
    }
  });
}

function normalizeSubject(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/([ა-ჰ])\s(?=[ა-ჰ])/g, '$1')
    .trim();
}

function georgianToLatin(input) {
  const map = {
    ა: 'a', ბ: 'b', გ: 'g', დ: 'd', ე: 'e', ვ: 'v', ზ: 'z', თ: 't', ი: 'i', კ: 'k', ლ: 'l', მ: 'm', ნ: 'n', ო: 'o', პ: 'p', ჟ: 'zh', რ: 'r', ს: 's', ტ: 't', უ: 'u', ფ: 'f', ქ: 'q', ღ: 'gh', ყ: 'y', შ: 'sh', ჩ: 'ch', ც: 'ts', ძ: 'dz', წ: 'ts', ჭ: 'ch', ხ: 'kh', ჯ: 'j', ჰ: 'h',
  };
  return String(input || '')
    .split('')
    .map((char) => map[char] || char)
    .join('');
}

function tokenize(value) {
  const latin = georgianToLatin(String(value || '').toLowerCase());
  return latin
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function extractEmails(text) {
  const matches = String(text || '').match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g);
  return matches ? [...new Set(matches.map(normalizeEmail))] : [];
}

function isSystemEmail(email) {
  const value = normalizeEmail(email);
  return (
    !value ||
    value.includes('example.com') ||
    value.includes('example.ge') ||
    value.includes('gserviceaccount.com') ||
    value.includes('your-project') ||
    value.includes('analytics') ||
    value.includes('cluster0') ||
    value.includes('mongodb.net') ||
    value.includes('noreply') ||
    value.includes('no-reply') ||
    value.includes('soulart.georgia@gmail.com') ||
    value.includes('soulartani@gmail.com') ||
    value.includes('nsoulart.georgia@gmail.com')
  );
}

function extractAuthorInfo(message) {
  if (!message) return null;
  const text = String(message);
  const line = text.split('\n').find((row) => row.includes('✍️')) || '';
  const slugMatch = line.match(/\(([^)]+)\)/);
  const nameMatch = line.match(/✍️\s*ავტორი:\s*([^\(\n]+)/i) || line.match(/✍️\s*([^\(\n]+)/i);
  const slug = slugMatch ? normalizeSlug(slugMatch[1]) : null;
  const name = nameMatch ? nameMatch[1].trim() : '';
  if (!slug) return null;
  return { slug, name };
}

function isClearlyBrokenSlug(slug) {
  return /^https/.test(slug) || /^artist-\d+$/.test(slug) || slug.includes('facebookcomshare');
}

function looksSellerCampaign(subject) {
  const s = normalizeSubject(subject).toLowerCase();
  if (!s.startsWith('soulart:')) return false;
  if (s.includes('test')) return false;
  if (s.includes('ახალიგატანისმოთხოვნა')) return false;
  if (s.includes('პროდუქტისგანთავსება')) return false;
  if (s.includes('ნამუშევრისგანთავსებაშეცდომა')) return false;
  if (s.includes('ნახატისგანთავსება')) return false;
  if (s.includes('ზომისმითითებანამუშევრებზე')) return false;
  return true;
}

class ImapClient {
  constructor() {
    this.tagCounter = 1;
    this.pending = new Map();
    this.buffer = '';
    this.socket = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = tls.connect(993, 'imap.gmail.com', { servername: 'imap.gmail.com' }, () => {});
      this.socket.setEncoding('utf8');
      this.socket.on('data', (chunk) => this.onData(chunk, resolve));
      this.socket.on('error', reject);
    });
  }

  onData(chunk, connectResolve) {
    this.buffer += chunk;
    if (connectResolve && this.buffer.includes('\r\n')) {
      const lineEnd = this.buffer.indexOf('\r\n');
      const firstLine = this.buffer.slice(0, lineEnd);
      if (firstLine.startsWith('* OK')) {
        this.buffer = this.buffer.slice(lineEnd + 2);
        connectResolve();
      }
    }
    this.flushPending();
  }

  flushPending() {
    for (const [tag, pending] of [...this.pending.entries()]) {
      const idx = [
        this.buffer.indexOf(`\r\n${tag} OK`),
        this.buffer.indexOf(`\r\n${tag} NO`),
        this.buffer.indexOf(`\r\n${tag} BAD`),
      ].filter((n) => n >= 0).sort((a, b) => a - b)[0];
      if (idx == null) continue;
      const lineEnd = this.buffer.indexOf('\r\n', idx + 2);
      if (lineEnd < 0) continue;
      const payload = this.buffer.slice(0, lineEnd + 2);
      this.buffer = this.buffer.slice(lineEnd + 2);
      this.pending.delete(tag);
      if (payload.includes(`${tag} OK`)) pending.resolve(payload);
      else pending.reject(new Error(payload));
    }
  }

  command(command) {
    return new Promise((resolve, reject) => {
      const tag = `A${String(this.tagCounter++).padStart(4, '0')}`;
      this.pending.set(tag, { resolve, reject });
      this.socket.write(`${tag} ${command}\r\n`);
    });
  }

  close() {
    if (this.socket) this.socket.end();
  }
}

function parseListMailboxes(raw) {
  const boxes = [];
  const re = /\* LIST \([^)]*\) "[^"]*" (.+?)\r\n/g;
  let match;
  while ((match = re.exec(raw)) !== null) {
    let name = match[1].trim();
    if (name.startsWith('"') && name.endsWith('"')) name = name.slice(1, -1);
    boxes.push(name);
  }
  return boxes;
}

function parseSearchUids(raw) {
  const match = raw.match(/\* SEARCH(.*)\r\n/);
  if (!match) return [];
  return match[1].trim().split(/\s+/).filter(Boolean).map(Number).filter(Number.isFinite);
}

function parseFetchedHeaders(raw) {
  const entries = [];
  const re = /\* \d+ FETCH[\s\S]*?\{\d+\}\r\n([\s\S]*?)\r\n\)\r\n/g;
  let match;
  while ((match = re.exec(raw)) !== null) {
    const lines = match[1].split(/\r\n/);
    const headers = {};
    let currentKey = null;
    for (const line of lines) {
      if (!line) continue;
      if (/^[ \t]/.test(line) && currentKey) {
        headers[currentKey] += ` ${line.trim()}`;
        continue;
      }
      const idx = line.indexOf(':');
      if (idx < 0) continue;
      currentKey = line.slice(0, idx).trim().toLowerCase();
      headers[currentKey] = line.slice(idx + 1).trim();
    }
    entries.push({
      subject: normalizeSubject(decodeMimeWords(headers.subject || '')),
      to: decodeMimeWords(headers.to || ''),
      date: headers.date || '',
    });
  }
  return entries;
}

async function fetchPosts(after = null) {
  const url = new URL(`${GRAPH_API}/${PAGE_ID}/published_posts`);
  url.searchParams.set('access_token', ACCESS_TOKEN);
  url.searchParams.set('limit', '100');
  url.searchParams.set('fields', 'id,message,created_time');
  if (after) url.searchParams.set('after', after);
  const response = await fetch(url.toString());
  return response.json();
}

async function fetchAllPosts() {
  const posts = [];
  let after = null;
  while (posts.length < MAX_SCAN) {
    const data = await fetchPosts(after);
    if (!data.data || !data.data.length) break;
    posts.push(...data.data);
    if (!data.paging?.cursors?.after) break;
    after = data.paging.cursors.after;
    await sleep(120);
  }
  return posts.slice(0, MAX_SCAN);
}

async function collectSentRecipients() {
  if (!EMAIL_USER || !EMAIL_PASS) return [];
  const client = new ImapClient();
  await client.connect();
  try {
    await client.command(`LOGIN "${EMAIL_USER}" "${EMAIL_PASS}"`);
    const listRaw = await client.command('LIST "" "*"');
    const mailboxes = parseListMailboxes(listRaw);
    const sentMailbox = mailboxes.find((name) => /sent mail/i.test(name)) || mailboxes.find((name) => /sent/i.test(name)) || '"[Gmail]/Sent Mail"';
    await client.command(`SELECT ${sentMailbox.includes(' ') && !sentMailbox.startsWith('"') ? `"${sentMailbox}"` : sentMailbox}`);
    const searchRaw = await client.command('UID SEARCH ALL');
    const uids = parseSearchUids(searchRaw).slice(-SENT_SCAN);
    const recipients = new Set();

    for (let i = 0; i < uids.length; i += 50) {
      const batch = uids.slice(i, i + 50);
      const fetchRaw = await client.command(`UID FETCH ${batch.join(',')} (BODY.PEEK[HEADER.FIELDS (SUBJECT TO DATE TO)])`);
      const entries = parseFetchedHeaders(fetchRaw);
      for (const entry of entries) {
        if (!looksSellerCampaign(entry.subject)) continue;
        extractEmails(entry.to).forEach((email) => recipients.add(email));
      }
    }

    return [...recipients].sort();
  } finally {
    try { await client.command('LOGOUT'); } catch {}
    client.close();
  }
}

function collectJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectJsonFiles(full));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) out.push(full);
  }
  return out;
}

function loadRecoveredUsers() {
  if (!fs.existsSync(RECOVERED_USERS_FILE)) return [];
  const parsed = JSON.parse(fs.readFileSync(RECOVERED_USERS_FILE, 'utf8'));
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.existingUsers)) return parsed.existingUsers;
  if (Array.isArray(parsed.users)) return parsed.users;
  return [];
}

function scoreEmailAgainstTarget(email, slug, names) {
  const local = normalizeLoose(email.split('@')[0]);
  const localTokens = tokenize(email.split('@')[0]).filter((token) => token.length >= 3);
  const slugLoose = normalizeLoose(slug);
  const nameTokens = names.flatMap((name) => tokenize(name));
  const uniqueTokens = [...new Set(nameTokens.filter((token) => token.length >= 3))];
  let score = 0;

  if (!local) return 0;
  if (slugLoose && local === slugLoose) score += 20;
  if (slugLoose && local.includes(slugLoose)) score += 14;
  if (slugLoose && slugLoose.includes(local) && local.length >= 5) score += 8;

  let matchedTokens = 0;
  for (const token of uniqueTokens) {
    if (localTokens.includes(token) || (token.length >= 5 && local.includes(token))) {
      matchedTokens += 1;
      score += token.length >= 5 ? 6 : 3;
    }
  }
  if (matchedTokens >= 2) score += 8;

  if (local.includes('art') && slugLoose.includes('art')) score += 2;
  if (local.includes('shop') && slugLoose.includes('shop')) score += 2;
  if (local.includes('gift') && slugLoose.includes('gift')) score += 2;
  if (local.includes('beads') && slugLoose.includes('beads')) score += 2;

  return score;
}

function scoreNameAgainstTarget(candidateName, targetNames) {
  const candidateTokens = tokenize(candidateName).filter((token) => token.length >= 3);
  const targetTokens = [...new Set(targetNames.flatMap((name) => tokenize(name)).filter((token) => token.length >= 3))];
  if (!candidateTokens.length || !targetTokens.length) return 0;
  let score = 0;
  for (const token of targetTokens) {
    if (candidateTokens.includes(token)) score += token.length >= 5 ? 8 : 4;
  }
  if (score >= 8 && candidateTokens.length >= 2) score += 6;
  return score;
}

function pickBestCandidates(target, candidateEmails, sourceLabel) {
  return candidateEmails
    .filter((email) => !isSystemEmail(email))
    .map((email) => ({
      email,
      score: scoreEmailAgainstTarget(email, target.slug, target.authorNames),
      source: sourceLabel,
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.email.localeCompare(b.email));
}

async function ensureSeller(usersCol, match) {
  const emailRegex = new RegExp(`^${match.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  const existing = await usersCol.findOne({ email: emailRegex }, { projection: { _id: 1, email: 1, role: 1, artistSlug: 1, name: 1, storeName: 1 } });
  if (existing) {
    if (String(existing.role || '').toLowerCase() === 'seller') {
      return { action: 'exists', userId: String(existing._id), email: existing.email, artistSlug: existing.artistSlug || '', role: existing.role };
    }

    await usersCol.updateOne(
      { _id: existing._id },
      {
        $set: {
          role: 'seller',
          artistSlug: match.slug,
          storeName: existing.storeName || match.displayName,
          name: existing.name || match.displayName,
          ownerFirstName: existing.name || match.displayName,
          sellerApprovedAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );
    return { action: 'promoted', userId: String(existing._id), email: existing.email, artistSlug: match.slug, role: 'seller' };
  }

  const hashedPassword = await argon2.hash(DEFAULT_PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const now = new Date();
  const doc = {
    name: match.displayName,
    email: match.email,
    password: hashedPassword,
    role: 'seller',
    storeName: match.displayName,
    ownerFirstName: match.displayName,
    ownerLastName: '',
    artistSlug: match.slug,
    sellerApprovedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  const result = await usersCol.insertOne(doc);
  return { action: 'created', userId: String(result.insertedId), email: match.email, artistSlug: match.slug, role: 'seller' };
}

async function main() {
  if (!PAGE_ID || !ACCESS_TOKEN) throw new Error('Missing Facebook credentials');
  if (!MONGODB_URI) throw new Error('Missing MongoDB URI');

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  try {
    const dbName = process.env.DB_NAME || new URL(MONGODB_URI).pathname.replace(/^\//, '') || 'test';
    const db = client.db(dbName);
    const usersCol = db.collection('users');

    const sellers = await usersCol.find(
      { role: 'seller', artistSlug: { $exists: true, $nin: [null, ''] } },
      { projection: { _id: 1, artistSlug: 1, email: 1, name: 1, storeName: 1 } },
    ).toArray();
    const sellerSlugs = new Set(sellers.map((seller) => normalizeSlug(seller.artistSlug)).filter(Boolean));
    const existingUsers = await usersCol.find({}, { projection: { _id: 1, email: 1, role: 1, artistSlug: 1, name: 1, storeName: 1 } }).toArray();
    const userByEmail = new Map(existingUsers.map((user) => [normalizeEmail(user.email), user]));

    const posts = await fetchAllPosts();
    const missingBySlug = new Map();
    for (const post of posts) {
      const author = extractAuthorInfo(post.message);
      if (!author) continue;
      if (sellerSlugs.has(author.slug)) continue;
      if (!missingBySlug.has(author.slug)) {
        missingBySlug.set(author.slug, {
          slug: author.slug,
          authorNames: new Set(),
          count: 0,
          latestPost: post.created_time,
          samplePostIds: [],
        });
      }
      const rec = missingBySlug.get(author.slug);
      rec.count += 1;
      if (author.name) rec.authorNames.add(author.name);
      if (new Date(post.created_time) > new Date(rec.latestPost)) rec.latestPost = post.created_time;
      if (rec.samplePostIds.length < 5) rec.samplePostIds.push(post.id);
    }

    const missingSlugs = [...missingBySlug.values()]
      .map((item) => ({
        slug: item.slug,
        authorNames: [...item.authorNames],
        count: item.count,
        latestPost: item.latestPost,
        samplePostIds: item.samplePostIds,
      }))
      .filter((item) => !isClearlyBrokenSlug(item.slug))
      .sort((a, b) => b.count - a.count || new Date(b.latestPost) - new Date(a.latestPost));

    const sentRecipients = await collectSentRecipients();
    const recoveredUsers = loadRecoveredUsers();

    const evaluated = [];
    for (const target of missingSlugs) {
      const sentCandidates = pickBestCandidates(target, sentRecipients, 'sent-mail');
      const recoveredCandidates = recoveredUsers
        .filter((entry) => {
          if (isSystemEmail(entry.email)) return false;
          const emailScore = scoreEmailAgainstTarget(entry.email, target.slug, target.authorNames);
          const nameScore = scoreNameAgainstTarget(entry.name || '', target.authorNames);
          return nameScore > 0 || emailScore >= 14;
        })
        .map((entry) => ({
          email: normalizeEmail(entry.email),
          score:
            scoreEmailAgainstTarget(entry.email, target.slug, target.authorNames) +
            scoreNameAgainstTarget(entry.name || '', target.authorNames) +
            4,
          source: 'recovered-chat-users',
          recoveredName: entry.name || '',
        }))
        .sort((a, b) => b.score - a.score || a.email.localeCompare(b.email));

      const merged = new Map();
      for (const candidate of [...sentCandidates, ...recoveredCandidates]) {
        const email = normalizeEmail(candidate.email);
        if (!merged.has(email)) merged.set(email, { email, score: 0, sources: new Set(), recoveredName: candidate.recoveredName || '' });
        const rec = merged.get(email);
        rec.score += candidate.score;
        rec.sources.add(candidate.source);
        if (!rec.recoveredName && candidate.recoveredName) rec.recoveredName = candidate.recoveredName;
      }

      const candidates = [...merged.values()]
        .map((item) => ({ ...item, sources: [...item.sources].sort() }))
        .sort((a, b) => b.score - a.score || a.email.localeCompare(b.email))
        .slice(0, 8);

      const best = candidates[0] || null;
      const confidence = best ? (best.score >= 24 ? 'high' : best.score >= 14 ? 'medium' : 'low') : 'none';
      const matchedExistingUser = best ? userByEmail.get(normalizeEmail(best.email)) || null : null;

      evaluated.push({
        slug: target.slug,
        authorNames: target.authorNames,
        count: target.count,
        latestPost: target.latestPost,
        bestCandidate: best,
        confidence,
        matchedExistingUser: matchedExistingUser
          ? {
              email: matchedExistingUser.email,
              role: matchedExistingUser.role,
              artistSlug: matchedExistingUser.artistSlug || '',
              name: matchedExistingUser.storeName || matchedExistingUser.name || '',
            }
          : null,
        candidates,
      });
    }

    const highConfidence = evaluated.filter((item) => item.confidence === 'high' && item.bestCandidate);
    const applied = [];

    if (APPLY) {
      for (const item of highConfidence) {
        const match = {
          slug: item.slug,
          email: item.bestCandidate.email,
          displayName: item.authorNames[0] || item.bestCandidate.recoveredName || item.slug,
        };
        const result = await ensureSeller(usersCol, match);
        applied.push({ slug: item.slug, email: match.email, displayName: match.displayName, result });

        if (IMPORT && ['created', 'promoted', 'exists'].includes(result.action)) {
          // Intentionally left as a separate manual run step; this report identifies safe import targets first.
        }
      }
    }

    const noEmail = evaluated.filter((item) => !item.bestCandidate || item.confidence === 'low');
    const report = {
      scannedPosts: posts.length,
      existingSellerSlugCount: sellers.length,
      missingSlugCount: evaluated.length,
      highConfidenceCount: highConfidence.length,
      highConfidence,
      mediumConfidence: evaluated.filter((item) => item.confidence === 'medium'),
      noEmail: noEmail.map((item) => ({ slug: item.slug, authorNames: item.authorNames, count: item.count, latestPost: item.latestPost })),
      applied,
    };

    const outPath = path.join(__dirname, 'output', 'fb-missing-seller-recovery-report.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});