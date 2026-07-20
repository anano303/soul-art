/**
 * Backfills `slug` on categories and subcategories for clean URLs
 * (/paintings, /paintings/<sub>, /handmade, /handmade/<sub>).
 *
 * Main categories get fixed English slugs (paintings / handmade); everything
 * else is generated from nameEn (fallback: transliterated Georgian name).
 * Uniqueness: categories globally, subcategories within their parent category.
 *
 * Dry-run: npx ts-node -r tsconfig-paths/register src/scripts/migrate-category-slugs.ts
 * Apply:   npx ts-node -r tsconfig-paths/register src/scripts/migrate-category-slugs.ts --apply
 */
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import {
  transliterateGeorgian,
  hasGeorgianCharacters,
} from '../utils/slug-generator';

dotenv.config();

function slugify(input?: string | null): string {
  let s = input || '';
  if (hasGeorgianCharacters(s)) s = transliterateGeorgian(s);
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

// Manual corrections for imperfect auto-generated slugs (never baked into a
// canonical URL with a typo).
const SLUG_OVERRIDES: Record<string, string> = {
  candels: 'candles',
  jewelery: 'jewelry',
};

function mainCategorySlug(name?: string, nameEn?: string): string {
  const n = (name || '').toLowerCase();
  if (n.includes('ნახატ')) return 'paintings'; // ნახატები
  if (n.includes('ხელნაკეთ')) return 'handmade'; // ხელნაკეთი ნივთები
  return slugify(nameEn) || slugify(name) || 'category';
}

function uniqueIn(set: Set<string>, base: string): string {
  const safe = base && base.length >= 2 ? base : 'category';
  if (!set.has(safe)) {
    set.add(safe);
    return safe;
  }
  let i = 2;
  while (set.has(`${safe}-${i}`)) i++;
  const s = `${safe}-${i}`;
  set.add(s);
  return s;
}

async function run() {
  const apply = process.argv.includes('--apply');
  const uri = process.env.MONGODB_URI || '';
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(uri.split('/').pop()?.split('?')[0]);
    const categories = db.collection('categories');
    const subcategories = db.collection('subcategories');
    const products = db.collection('products');

    console.log(`\n${apply ? 'APPLYING' : 'DRY-RUN'} — category slugs\n`);

    // ── Categories ── (skip junk categories with no usable name)
    const cats = await categories.find({}).toArray();
    const catSlugs = new Set<string>();
    const catSlugById = new Map<string, string>();
    for (const c of cats) {
      const name = (c.name ?? '').toString().trim();
      if (!name || name === 'undefined') {
        console.log(`CATEGORY  ${c._id} | "(no name)" -> SKIPPED (junk)`);
        continue;
      }
      const slug = uniqueIn(catSlugs, mainCategorySlug(name, c.nameEn));
      catSlugById.set(String(c._id), slug);
      console.log(`CATEGORY  ${c._id} | "${name}" -> /${slug}`);
      if (apply) {
        await categories.updateOne({ _id: c._id }, { $set: { slug } });
      }
    }

    // ── Subcategories (slug unique within parent; skip orphaned) ──
    console.log('');
    const subs = await subcategories.find({}).toArray();
    const perCat = new Map<string, Set<string>>();
    let liveCount = 0;
    let slugged = 0;
    const orphanLiveProducts: { id: string; name: string; sub: string }[] = [];

    for (const s of subs) {
      const catId = String(s.categoryId);
      const parentSlug = catSlugById.get(catId);
      const hasLive =
        (await products.countDocuments({
          subCategory: s._id,
          status: 'APPROVED',
        })) > 0;
      if (hasLive) liveCount++;

      // Orphaned: parent category was skipped/deleted → cannot form a route.
      if (!parentSlug) {
        if (hasLive) {
          const prods = await products
            .find(
              { subCategory: s._id, status: 'APPROVED' },
              { projection: { name: 1 } },
            )
            .toArray();
          prods.forEach((p) =>
            orphanLiveProducts.push({
              id: String(p._id),
              name: (p.name as string) ?? '(no name)',
              sub: s.name as string,
            }),
          );
        }
        console.log(
          `SUBCAT    ${s._id} | "${s.name}" -> SKIPPED (orphaned parent)` +
            (hasLive ? '  [HAS LIVE PRODUCTS]' : ''),
        );
        continue;
      }

      if (!perCat.has(catId)) perCat.set(catId, new Set());
      let base = slugify(s.nameEn) || slugify(s.name);
      base = SLUG_OVERRIDES[base] || base;
      const slug = uniqueIn(perCat.get(catId)!, base);
      slugged++;
      console.log(
        `SUBCAT    ${s._id} | "${s.name}" -> /${parentSlug}/${slug}` +
          (hasLive ? '  [LIVE PRODUCTS]' : '  [no live products]'),
      );
      if (apply) {
        await subcategories.updateOne({ _id: s._id }, { $set: { slug } });
      }
    }

    // Data-integrity report: live products stuck on orphaned subcategories.
    if (orphanLiveProducts.length) {
      console.log(
        `\n⚠️  ${orphanLiveProducts.length} LIVE products attached to ORPHANED subcategories (reassign manually):`,
      );
      for (const p of orphanLiveProducts) {
        console.log(`   ${p.id} | "${p.name}"  (orphaned sub: "${p.sub}")`);
      }
    }

    console.log(
      `\n${cats.length} categories, ${subs.length} subcategories — ${slugged} slugged (${liveCount} with live products).`,
    );
    console.log(
      apply
        ? 'Done — slugs written.'
        : 'Dry-run only — re-run with --apply to write.\n',
    );
  } finally {
    await client.close();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
