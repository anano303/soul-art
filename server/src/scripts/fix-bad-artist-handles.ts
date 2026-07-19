/**
 * Repairs artist profiles whose artistSlug is a mangled URL. For each flagged
 * record it regenerates a clean slug from storeName / name / email and ensures
 * uniqueness. Dry-run by default — pass --apply to actually write.
 *
 * Dry-run: npx ts-node -r tsconfig-paths/register src/scripts/fix-bad-artist-handles.ts
 * Apply:   npx ts-node -r tsconfig-paths/register src/scripts/fix-bad-artist-handles.ts --apply
 */
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { generateBaseArtistSlug } from '../utils/slug-generator';

dotenv.config();

const URL_SIGNALS = /(https?|www\.?|instagram|facebook|\.com|\.ge|tiktok|\/\/)/i;
const looksLikeUrl = (v?: string | null) => !!v && URL_SIGNALS.test(v);

async function run() {
  const apply = process.argv.includes('--apply');
  const uri = process.env.MONGODB_URI || '';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(uri.split('/').pop()?.split('?')[0]);
    const users = db.collection('users');

    // Build the set of slugs already in use (to guarantee uniqueness).
    const allSlugs = new Set<string>(
      (
        await users
          .find({ artistSlug: { $exists: true, $ne: null } }, { projection: { artistSlug: 1 } })
          .toArray()
      )
        .map((u) => (u.artistSlug as string) || '')
        .filter(Boolean),
    );

    const sellers = await users
      .find(
        { role: { $in: ['seller', 'admin'] } },
        { projection: { email: 1, name: 1, storeName: 1, artistSlug: 1 } },
      )
      .toArray();

    const bad = sellers.filter(
      (u) =>
        looksLikeUrl(u.artistSlug) ||
        looksLikeUrl(u.storeName) ||
        looksLikeUrl(u.name),
    );

    console.log(`\n${apply ? 'APPLYING' : 'DRY-RUN'} — ${bad.length} records to repair:\n`);

    const uniqueSlug = (base: string): string => {
      const safe = base && base.length >= 3 ? base : 'artist';
      if (!allSlugs.has(safe)) {
        allSlugs.add(safe);
        return safe;
      }
      let i = 1;
      while (allSlugs.has(`${safe}${i}`)) i++;
      const s = `${safe}${i}`;
      allSlugs.add(s);
      return s;
    };

    for (const u of bad) {
      // Never derive the new slug from a URL-ish field.
      const cleanStore = looksLikeUrl(u.storeName) ? undefined : u.storeName;
      const cleanName = looksLikeUrl(u.name) ? undefined : u.name;
      const base = generateBaseArtistSlug(cleanStore, u.email, cleanName);
      const newSlug = uniqueSlug(base);

      console.log(
        `- ${u.email}\n    old: ${u.artistSlug}\n    new: ${newSlug}`,
      );

      if (apply) {
        await users.updateOne(
          { _id: u._id },
          { $set: { artistSlug: newSlug } },
        );
      }
    }

    console.log(
      `\n${apply ? 'Done — records updated.' : 'Dry-run only — re-run with --apply to write.'}\n`,
    );
  } finally {
    await client.close();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
