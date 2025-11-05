import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app/app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Product, ProductStatus } from '../products/schemas/product.schema';

interface ParsedDimensions {
  width?: number;
  height?: number;
  depth?: number;
}

const DIMENSION_PATTERNS: RegExp[] = [
  /ზომ(?:ა|ები)?[^0-9]*?(\d+(?:[.,]\d+)?)(?:\s*(?:cm|სმ|mm|მმ))?\s*[x×X/]\s*(\d+(?:[.,]\d+)?)(?:\s*(?:cm|სმ|mm|მმ))?(?:\s*[x×X/]\s*(\d+(?:[.,]\d+)?)(?:\s*(?:cm|სმ|mm|მმ))?)?/i,
  /(\d+(?:[.,]\d+)?)(?:\s*(?:cm|სმ|mm|მმ))?\s*[x×X/]\s*(\d+(?:[.,]\d+)?)(?:\s*(?:cm|სმ|mm|მმ))?(?:\s*[x×X/]\s*(\d+(?:[.,]\d+)?)(?:\s*(?:cm|სმ|mm|მმ))?)?/i,
];

function sanitizeValue(raw?: string): number | undefined {
  if (!raw) {
    return undefined;
  }

  const normalized = raw.replace(/,/g, '.');
  const numeric = parseFloat(normalized);

  return Number.isFinite(numeric)
    ? Number(Number(numeric).toFixed(2))
    : undefined;
}

function parseDimensions(description?: string | null): ParsedDimensions | null {
  if (!description) {
    return null;
  }

  const collapsed = description.replace(/\s+/g, ' ');

  for (const pattern of DIMENSION_PATTERNS) {
    const match = collapsed.match(pattern);
    if (match) {
      const width = sanitizeValue(match[1]);
      const height = sanitizeValue(match[2]);
      const depth = sanitizeValue(match[3]);

      if (width && height) {
        return { width, height, ...(depth ? { depth } : {}) };
      }
    }
  }

  return null;
}

async function migrateProductDimensions() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const productModel = app.get<Model<Product>>(getModelToken(Product.name));

  console.log('📐 Starting product dimensions migration...\n');

  try {
    const products = await productModel
      .find({ status: ProductStatus.APPROVED })
      .select(['description', 'dimensions'])
      .lean();

    console.log(`Found ${products.length} approved products to inspect.\n`);

    const bulkOperations: Parameters<Model<Product>['bulkWrite']>[0] = [];
    let updatedCount = 0;
    let skippedCount = 0;

    products.forEach((product: any) => {
      const parsed = parseDimensions(product.description);

      if (!parsed) {
        skippedCount += 1;
        return;
      }

      const existing = product.dimensions ?? {};
      const needsUpdate =
        !existing.width ||
        !existing.height ||
        existing.width !== parsed.width ||
        existing.height !== parsed.height ||
        (parsed.depth !== undefined && existing.depth !== parsed.depth);

      if (!needsUpdate) {
        skippedCount += 1;
        return;
      }

      bulkOperations.push({
        updateOne: {
          filter: { _id: product._id },
          update: {
            $set: {
              dimensions: parsed,
            },
          },
        },
      });
      updatedCount += 1;
    });

    if (bulkOperations.length === 0) {
      console.log('No dimension updates were required.');
      console.log(`Skipped products: ${skippedCount}`);
      await app.close();
      return;
    }

    const chunks = 100;
    for (let i = 0; i < bulkOperations.length; i += chunks) {
      const slice = bulkOperations.slice(i, i + chunks);
      await productModel.bulkWrite(slice);
      console.log(
        `Processed ${Math.min(i + chunks, bulkOperations.length)} / ${bulkOperations.length} updates...`,
      );
    }

    console.log('\nMigration summary:');
    console.log(`  ✅ Updated products: ${updatedCount}`);
    console.log(`  ⏭️  Skipped products: ${skippedCount}`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

migrateProductDimensions()
  .then(() => {
    if (process.exitCode !== 1) {
      console.log('\n✅ Product dimensions migration completed successfully.');
    }
  })
  .catch((error) => {
    console.error('Unexpected error during migration:', error);
    process.exit(1);
  });
