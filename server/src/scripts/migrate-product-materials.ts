import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app/app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Product, ProductStatus } from '../products/schemas/product.schema';

const MATERIAL_LABELS = [
  'material',
  'materials',
  'material used',
  'materials used',
  'used material',
  'used materials',
  'medium',
  'mediums',
  'medium used',
  'medium type',
  'technique',
  'techniques',
  'mixed media',
  'mixed materials',
  'mixed technique',
  'painting technique',
  'art medium',
  'painting medium',
  'materials list',
  'materials info',
  'composition',
  'components',
  'ingredients',
  'made with',
  'crafted from',
  'support',
  'surface',
  'base material',
  'base',
  'substrate',
  'ground',
  'collage',
  'ink',
  'pen',
  'pencil',
  'charcoal',
  'pastel',
  'chalk',
  'marker',
  'spray',
  'spray paint',
  'gouache',
  'tempera',
  'enamel',
  'resin',
  'clay',
  'ceramic',
  'porcelain',
  'stone',
  'wood',
  'metal',
  'aluminium',
  'bronze',
  'brass',
  'steel',
  'glass',
  'leather',
  'silk',
  'fabric',
  'textile',
  'paper',
  'canvas',
  'oil on canvas',
  'acrylic on canvas',
  'watercolor on paper',
  'oil on wood',
  'acrylic on paper',
  'watercolor on canvas',
  'მასალა',
  'მასალები',
  'მასალის',
  'მასალების',
  'გამოყენებული მასალა',
  'გამოყენებული მასალები',
  'შერეული მასალა',
  'შერეული მასალები',
  'შერეული ტექნიკა',
  'შეურ. მასალები',
  'ტექნიკა',
  'ტექნიკები',
  'ტილო',
  'მელანი',
  'ტუში',
  'ფანქარი',
  'გრაფიტი',
  'აკვარელი',
  'აკვარელი ქაღალდზე',
  'აკვარელი ტილოზე',
  'აკრილი',
  'აკრილი ტილოზე',
  'ზეთი',
  'ზეთი ხეზე',
  'ზეთის საღებავი',
  'გუაში',
  'ტემპერა',
  'პასტელი',
  'ცარცი',
  'მარკერი',
  'სპრეი',
  'სპრეი საღებავი',
  'კოლაჟი',
  'თექა',
  'ტექსტილი',
  'ქსოვილი',
  'ტყავი',
  'თიხა',
  'შავი თიხა',
  'კერამიკა',
  'ფაიფური',
  'რეზინი',
  'ხის ფირფიტა',
  'მუყაო',
  'ქვა',
  'ბრინჯაო',
  'ლითონი',
  'მინა',
  'კანვასი',
  'ტილო ზეთში',
];

const IGNORED_LABELS = new Set<string>([
  'size',
  'sizes',
  'ზომა',
  'ზომები',
  'dimensions',
  'dimension',
  'format',
  'formats',
  'digital',
  'digital file',
  'digital files',
  'digital download',
  'digital printable electronic pdf file. quality',
  'quality',
  'file',
  'files',
  'print',
  'printing',
  'prints',
  'dpi',
  'px',
  'pixel',
  'pixels',
  'resolution',
  'download',
  'downloads',
  'hand',
  'handmade',
]);

const IGNORED_LABEL_KEYWORDS = [
  'size',
  'ზომ',
  'dimension',
  'ზომა',
  'digital',
  'pdf',
  'dpi',
  'pixel',
  'px',
  'print',
  'file',
  'download',
  'quality',
  'resolution',
];

const INVALID_EXACT_PATTERN = /^(?:n\/a|none|null|no)$/i;
const MEASUREMENT_ONLY_PATTERN = /^\s*\d+(?:[.,]\d+)?\s*(?:cm|mm|სმ|მმ)?\s*$/i;
const GEORGIAN_CHAR_PATTERN = /[ა-ჰ]/;

function prepareDescription(raw?: string | null): string {
  if (!raw) {
    return '';
  }

  const withoutHtml = raw
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ');

  return withoutHtml
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/[ ]{2,}/g, ' '))
    .join('\n')
    .trim();
}

function normalizeLabel(label: string): string {
  return label.replace(/\s+/g, ' ').trim().toLowerCase();
}

function shouldIgnoreLabel(label: string): boolean {
  if (!label) {
    return true;
  }
  if (IGNORED_LABELS.has(label)) {
    return true;
  }
  return IGNORED_LABEL_KEYWORDS.some((keyword) => label.includes(keyword));
}

function isMaterialLabel(label: string): boolean {
  const normalized = normalizeLabel(label);
  if (!normalized || shouldIgnoreLabel(normalized)) {
    return false;
  }
  return MATERIAL_LABELS.some((keyword) => normalized.startsWith(keyword));
}

function extractMaterialSegments(description: string): string[] {
  if (!description) {
    return [];
  }

  const segments: string[] = [];

  const directPatterns: RegExp[] = [
    /(materials?(?: used)?|material|mediums?|medium|technique|techniques?)\s*(?:[:\-–]\s*)([^.\n\r;]+)/gi,
    /(მასალ(?:ა|ები|ის|ებში)?(?:\s*გამოყენებული)?|ტექნიკა|ტექნიკები)\s*(?:[:\-–]\s*)([^.\n\r;]+)/gi,
  ];

  directPatterns.forEach((pattern) => {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(description)) !== null) {
      const value = match[2]?.trim();
      if (value) {
        segments.push(value);
      }
    }
  });

  const lines = description.split(/\n+/);
  lines.forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      return;
    }

    const withoutBullets = trimmedLine.replace(/^[\*\-•·]+/, '').trim();
    if (!withoutBullets) {
      return;
    }

    const colonIndex = withoutBullets.indexOf(':');
    if (colonIndex !== -1) {
      const label = withoutBullets.slice(0, colonIndex);
      if (isMaterialLabel(label)) {
        const value = withoutBullets.slice(colonIndex + 1).trim();
        if (value) {
          segments.push(value);
        }
        return;
      }
    }

    const dashIndex = withoutBullets.indexOf('-');
    if (dashIndex !== -1) {
      const label = withoutBullets.slice(0, dashIndex);
      if (isMaterialLabel(label)) {
        const value = withoutBullets.slice(dashIndex + 1).trim();
        if (value) {
          segments.push(value);
        }
      }
    }
  });

  return segments;
}

function normalizeMaterialValue(raw: string): string | null {
  let value = raw.replace(/\s{2,}/g, ' ').trim();

  value = value.replace(/^[\-–—•·:]+/, '').trim();
  value = value.replace(/\.$/, '').trim();

  // Remove surrounding quotes or parentheses
  const wrappedMatch = value.match(/^['"“”„«»\(\[](.+?)['"“”„«»\)\]]$/);
  if (wrappedMatch) {
    value = wrappedMatch[1].trim();
  }

  value = value.replace(
    /^(made of|using|uses|consists of|contains|includes)\s+/i,
    '',
  );
  value = value.replace(
    /^(დამზადებულია|შემადგენლობა|შეიცავს|გამოყენებულია)\s+/i,
    '',
  );

  if (!value) {
    return null;
  }

  // Trim trailing punctuation or unmatched symbols
  value = value.replace(/[\s]*[\.,;:!?)\]\}]+$/g, '').trim();
  value = value.replace(/^[\(\[\{]+/g, '').trim();

  if (INVALID_EXACT_PATTERN.test(value)) {
    return null;
  }

  if (!GEORGIAN_CHAR_PATTERN.test(value)) {
    return null;
  }

  if (MEASUREMENT_ONLY_PATTERN.test(value)) {
    return null;
  }

  const lower = value.toLowerCase();
  const invalidKeywords = [
    'size',
    'dimension',
    'dimensions',
    'width',
    'height',
    'depth',
    'length',
    'weight',
    'price',
    'quality',
    'print',
    'printing',
    'pdf',
    'file',
    'download',
    'dpi',
    'pixel',
    'pixels',
    'px',
    'ზომ',
    'სიგანე',
    'სიმაღლ',
    'სიღრმ',
    'ფასი',
    'წონა',
  ];

  if (invalidKeywords.some((keyword) => lower.includes(keyword))) {
    return null;
  }

  return value;
}

function normalizeMaterials(segments: string[]): string[] {
  if (!segments.length) {
    return [];
  }

  const candidates: string[] = [];

  segments.forEach((segment) => {
    const replaced = segment
      .replace(/\s*\b(and|with|on|amp|და)\b\s*/gi, ',')
      .replace(/\s*&\s*/g, ',')
      .replace(/[\/;|\\•·\u2022\+]/g, ',')
      .replace(/\r|\n/g, ',')
      .replace(/\s+([ა-ჰ]+)ზე\b/g, ',$1')
      .replace(/,+/g, ',');

    replaced
      .split(',')
      .map((part) => extractValueCandidate(part))
      .map((candidate) => (candidate ? normalizeMaterialValue(candidate) : null))
      .forEach((value) => {
        if (value) {
          candidates.push(value);
        }
      });
  });

  const unique: string[] = [];
  const seen = new Set<string>();

  candidates.forEach((candidate) => {
    const key = candidate.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(candidate);
    }
  });

  return unique;
}

function extractValueCandidate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const colonIndex = trimmed.indexOf(':');
  if (colonIndex !== -1) {
    const label = trimmed.slice(0, colonIndex);
    const remainder = trimmed.slice(colonIndex + 1);
    const normalizedLabel = normalizeLabel(label);

    if (shouldIgnoreLabel(normalizedLabel)) {
      return null;
    }

    if (remainder.trim()) {
      return remainder.trim();
    }
    return null;
  }

  return trimmed;
}

function parseMaterials(description?: string | null): string[] {
  const prepared = prepareDescription(description);
  if (!prepared) {
    return [];
  }

  const segments = extractMaterialSegments(prepared);
  return normalizeMaterials(segments);
}

function collectMaterials(product: any): string[] {
  const sources = [
    product.description,
    product.descriptionEn,
    product.summary,
    product.summaryEn,
  ];

  const collected = new Map<string, string>();

  sources.forEach((source) => {
    const parsed = parseMaterials(source);
    parsed.forEach((material) => {
      const key = material.toLowerCase();
      if (!collected.has(key)) {
        collected.set(key, material);
      }
    });
  });

  return Array.from(collected.values());
}

function sortForComparison(values?: string[] | null): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .sort();
}

function materialsAreEqual(
  current: string[] | undefined,
  next: string[],
): boolean {
  const currentNormalized = sortForComparison(current);
  const nextNormalized = sortForComparison(next);

  if (currentNormalized.length !== nextNormalized.length) {
    return false;
  }

  return currentNormalized.every(
    (value, index) => value === nextNormalized[index],
  );
}

async function migrateProductMaterials() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const productModel = app.get<Model<Product>>(getModelToken(Product.name));

  console.log('🧵 Starting product materials migration...\n');

  try {
    const products = await productModel
      .find({ status: ProductStatus.APPROVED })
      .select([
        'description',
        'descriptionEn',
        'summary',
        'summaryEn',
        'materials',
      ])
      .lean();

    console.log(`Found ${products.length} approved products to inspect.\n`);

    const bulkOperations: Parameters<Model<Product>['bulkWrite']>[0] = [];
    let updatedCount = 0;
    let skippedNoChange = 0;
    let skippedNoMatch = 0;

    products.forEach((product: any) => {
      const parsedMaterials = collectMaterials(product);

      if (!parsedMaterials.length) {
        skippedNoMatch += 1;
        return;
      }

      if (materialsAreEqual(product.materials, parsedMaterials)) {
        skippedNoChange += 1;
        return;
      }

      bulkOperations.push({
        updateOne: {
          filter: { _id: product._id },
          update: {
            $set: { materials: parsedMaterials },
          },
        },
      });
      updatedCount += 1;
    });

    if (!bulkOperations.length) {
      console.log('No material updates were required.');
      console.log(`Skipped (no change): ${skippedNoChange}`);
      console.log(`Skipped (no match): ${skippedNoMatch}`);
      await app.close();
      return;
    }

    const chunkSize = 100;
    for (let i = 0; i < bulkOperations.length; i += chunkSize) {
      const slice = bulkOperations.slice(i, i + chunkSize);
      await productModel.bulkWrite(slice);
      console.log(
        `Processed ${Math.min(i + chunkSize, bulkOperations.length)} / ${bulkOperations.length} updates...`,
      );
    }

    console.log('\nMigration summary:');
    console.log(`  ✅ Updated products: ${updatedCount}`);
    console.log(`  ⏭️  Skipped (no change): ${skippedNoChange}`);
    console.log(`  🚫 Skipped (no match): ${skippedNoMatch}`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

migrateProductMaterials()
  .then(() => {
    if (process.exitCode !== 1) {
      console.log('\n✅ Product materials migration completed successfully.');
    }
  })
  .catch((error) => {
    console.error('Unexpected error during migration:', error);
    process.exit(1);
  });
