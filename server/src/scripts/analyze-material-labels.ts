import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app/app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Product } from '../products/schemas/product.schema';

type ProductDoc = Product & {
  description?: string;
  descriptionEn?: string;
  summary?: string;
  summaryEn?: string;
};

type LabelStats = {
  totalOccurrences: number;
  lineSamples: Set<string>;
};

const MAX_LABEL_LENGTH = 60;
const MIN_LABEL_CHARACTERS = 3;

function sanitizeSource(raw?: string | null): string {
  if (!raw) {
    return '';
  }

  const withoutHtml = raw
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|li|ul|ol)>/gi, '\n')
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

function extractLabelFromLine(line: string): string | null {
  const separators = [':', '-', '–', '—', '‐'];
  const separatorIndex = separators
    .map((sep) => ({ sep, index: line.indexOf(sep) }))
    .filter(({ index }) => index > 0)
    .sort((a, b) => a.index - b.index)[0];

  if (!separatorIndex) {
    return null;
  }

  const rawLabel = line.slice(0, separatorIndex.index).trim();

  if (!rawLabel) {
    return null;
  }

  if (
    rawLabel.length < MIN_LABEL_CHARACTERS ||
    rawLabel.length > MAX_LABEL_LENGTH
  ) {
    return null;
  }

  // Reject entries that clearly look like values instead of labels (e.g., start with a digit)
  if (/^[0-9]/.test(rawLabel)) {
    return null;
  }

  // Remove leading bullet characters
  const cleanedLabel = rawLabel.replace(/^[*•·\-]+\s*/, '').trim();

  if (!cleanedLabel) {
    return null;
  }

  return cleanedLabel;
}

async function analyzeMaterialLabels() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const productModel = app.get<Model<ProductDoc>>(getModelToken(Product.name));

  try {
    const products = await productModel
      .find({}, { description: 1, descriptionEn: 1, summary: 1, summaryEn: 1 })
      .lean();

    console.log(
      `Analyzing ${products.length} products for potential material labels...`,
    );

    const labelMap = new Map<string, LabelStats>();

    const recordLabel = (label: string, line: string) => {
      const normalized = label.trim().toLowerCase();
      if (!normalized) {
        return;
      }

      if (!labelMap.has(normalized)) {
        labelMap.set(normalized, {
          totalOccurrences: 0,
          lineSamples: new Set<string>(),
        });
      }

      const stats = labelMap.get(normalized)!;
      stats.totalOccurrences += 1;
      if (stats.lineSamples.size < 5) {
        stats.lineSamples.add(line.slice(0, 180));
      }
    };

    products.forEach((product) => {
      const sources = [
        product.description,
        product.descriptionEn,
        product.summary,
        product.summaryEn,
      ];

      sources
        .map((source) => sanitizeSource(source))
        .filter(Boolean)
        .forEach((source) => {
          source.split('\n').forEach((line) => {
            const label = extractLabelFromLine(line);
            if (label) {
              recordLabel(label, line);
            }
          });
        });
    });

    const results = Array.from(labelMap.entries())
      .map(([label, stats]) => ({ label, ...stats }))
      .filter((entry) => entry.totalOccurrences > 1)
      .sort((a, b) => b.totalOccurrences - a.totalOccurrences)
      .slice(0, 100);

    console.log('\nTop potential labels (min 2 occurrences):');
    results.forEach((entry, index) => {
      console.log(
        `\n${index + 1}. "${entry.label}" — ${entry.totalOccurrences} hits`,
      );
      entry.lineSamples.forEach((sample) => {
        console.log(`   · ${sample}`);
      });
    });

    if (results.length === 0) {
      console.log('\nNo repeated label patterns were detected.');
    }
  } catch (error) {
    console.error('Failed to analyze materials:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

analyzeMaterialLabels()
  .then(() => {
    if (process.exitCode !== 1) {
      console.log('\n🔍 Material label analysis finished.');
    }
  })
  .catch((error) => {
    console.error('Unexpected error during analysis:', error);
    process.exit(1);
  });
