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

interface MaterialDefinition {
  ge: string;
  en: string;
  variants: string[];
}

const MATERIAL_DEFINITIONS: MaterialDefinition[] = [
  {
    ge: 'ტილო',
    en: 'Canvas',
    variants: [
      'ტილო',
      'ტილოზე',
      'ტილოს',
      'ტილოთი',
      'ტილოდან',
      'კანვასი',
      'კანვასზე',
      'კანვასის',
      'canvas',
    ],
  },
  {
    ge: 'აკრილი',
    en: 'Acrylic',
    variants: [
      'აკრილი',
      'აკრილის',
      'აკრილით',
      'აკრილზე',
      'აკრილში',
      'აკრილთან',
      'acrylic',
    ],
  },
  {
    ge: 'ზეთი',
    en: 'Oil paint',
    variants: ['ზეთი', 'ზეთის', 'ზეთით', 'ზეთზე', 'ზეთში', 'oil', 'oil paint'],
  },
  {
    ge: 'ფანქარი',
    en: 'Pencil',
    variants: [
      'ფანქარი',
      'ფანქრის',
      'ფანქრით',
      'ფანქარზე',
      'ფანქარში',
      'pencil',
    ],
  },
  {
    ge: 'მუყაო',
    en: 'Cardboard',
    variants: [
      'მუყაო',
      'მუყაოზე',
      'მუყაოს',
      'მუყაოში',
      'მუყაოდან',
      'cardboard',
    ],
  },
  {
    ge: 'ხე',
    en: 'Wood',
    variants: ['ხე', 'ხის', 'ხეზე', 'ხიდან', 'ხეში', 'ხისგან', 'wood'],
  },
  {
    ge: 'აკვარელი',
    en: 'Watercolor',
    variants: [
      'აკვარელი',
      'აკვარელის',
      'აკვარელით',
      'აკვარელზე',
      'აკვარელში',
      'watercolor',
    ],
  },
  {
    ge: 'ქაღალდი',
    en: 'Paper',
    variants: ['ქაღალდი', 'ქაღალდის', 'ქაღალდზე', 'paper'],
  },
  {
    ge: 'კოლაჟი',
    en: 'Collage',
    variants: ['კოლაჟი', 'collage'],
  },
  {
    ge: 'პასტელი',
    en: 'Pastel',
    variants: ['პასტელი', 'pastel'],
  },
  {
    ge: 'ტემპერა',
    en: 'Tempera',
    variants: ['ტემპერა', 'tempera'],
  },
  {
    ge: 'გუაში',
    en: 'Gouache',
    variants: ['გუაში', 'gouache'],
  },
  {
    ge: 'ტუში',
    en: 'Ink',
    variants: ['ტუში', 'მელანი', 'ink'],
  },
  {
    ge: 'ქსოვილი',
    en: 'Fabric',
    variants: [
      'ქსოვილი',
      'ქსოვილით',
      'ქსოვილზე',
      'fabric',
      'textile',
      'ტექსტილი',
    ],
  },
  {
    ge: 'თიხა',
    en: 'Clay',
    variants: ['თიხა', 'თიხით', 'თიხაზე', 'clay'],
  },
  {
    ge: 'კერამიკა',
    en: 'Ceramic',
    variants: ['კერამიკა', 'კერამიკით', 'ceramic', 'porcelain', 'ფაიფური'],
  },
  {
    ge: 'ბრინჯაო',
    en: 'Bronze',
    variants: ['ბრინჯაო', 'bronze'],
  },
  {
    ge: 'ლითონი',
    en: 'Metal',
    variants: [
      'ლითონი',
      'ლითონით',
      'ლითონზე',
      'metal',
      'aluminium',
      'brass',
      'steel',
    ],
  },
  {
    ge: 'მინა',
    en: 'Glass',
    variants: ['მინა', 'მინაზე', 'glass'],
  },
  {
    ge: 'ქვა',
    en: 'Stone',
    variants: ['ქვა', 'ქვით', 'ქვაზე', 'stone'],
  },
  {
    ge: 'შერეული ტექნიკა',
    en: 'Mixed media',
    variants: [
      'შერეული ტექნიკა',
      'შერეული მასალა',
      'შერეული მასალები',
      'mixed media',
      'mixed materials',
    ],
  },
  {
    ge: 'ტილოზე ზეთი',
    en: 'Oil on canvas',
    variants: ['ზეთი ტილოზე', 'ზეთი ტილო', 'oil on canvas'],
  },
  {
    ge: 'ტილოზე აკრილი',
    en: 'Acrylic on canvas',
    variants: ['აკრილი ტილოზე', 'acrylic on canvas'],
  },
  {
    ge: 'ქაღალდზე აკვარელი',
    en: 'Watercolor on paper',
    variants: ['აკვარელი ქაღალდზე', 'watercolor on paper'],
  },
  {
    ge: 'ქაღალდზე ფანქარი',
    en: 'Pencil on paper',
    variants: ['ფანქარი ქაღალდზე', 'pencil on paper'],
  },
  {
    ge: 'ტილოზე აკვარელი',
    en: 'Watercolor on canvas',
    variants: ['აკვარელი ტილოზე', 'watercolor on canvas'],
  },
  {
    ge: 'ტილოზე ფანქარი',
    en: 'Pencil on canvas',
    variants: ['ფანქარი ტილოზე', 'pencil on canvas'],
  },
  {
    ge: 'ფურცელი',
    en: 'Sheet',
    variants: ['ფურცელი', 'sheet'],
  },
  {
    ge: 'ციფრული',
    en: 'Digital',
    variants: ['ციფრული', 'digital'],
  },
  {
    ge: 'pdf',
    en: 'PDF',
    variants: ['pdf', 'პდფ'],
  },
  {
    ge: 'ნაჭერი',
    en: 'Cloth',
    variants: ['ნაჭერი', 'cloth'],
  },
  {
    ge: 'ტექსტურული პასტა',
    en: 'Texture paste',
    variants: ['ტექსტურული პასტა', 'texture paste'],
  },
  {
    ge: 'ბამბა',
    en: 'Cotton',
    variants: ['ბამბა', 'cotton'],
  },
  {
    ge: 'ბამბის ძაფი',
    en: 'Cotton yarn',
    variants: ['ბამბის ძაფი', 'cotton yarn'],
  },
  {
    ge: 'მარგალიტის და შუშის მძივები',
    en: 'Pearl and glass beads',
    variants: ['მარგალიტის და შუშის მძივები'],
  },
  {
    ge: 'მეტალის დეტალი',
    en: 'Metal detail',
    variants: ['მეტალის დეტალი'],
  },
  {
    ge: 'მეტალი',
    en: 'Metal',
    variants: ['მეტალი', 'metal'],
  },
  {
    ge: 'მასტერხინი',
    en: 'Palette knife',
    variants: ['მასტერხინი'],
  },
  {
    ge: 'შიმერები',
    en: 'Shimmers',
    variants: ['შიმერები'],
  },
  {
    ge: 'კალამი',
    en: 'Pen',
    variants: ['კალამი', 'pen'],
  },
  {
    ge: 'ჩარჩო',
    en: 'Frame',
    variants: ['ჩარჩო', 'frame'],
  },
  {
    ge: 'ვატმანი',
    en: 'Whatman paper',
    variants: ['ვატმანი'],
  },
  {
    ge: 'ბისერები',
    en: 'Beads',
    variants: ['ბისერები', 'beads'],
  },
  {
    ge: 'აკრილის საღებავი',
    en: 'Acrylic paint',
    variants: ['acrylic paint', 'აკრილის საღებავი'],
  },
  {
    ge: 'ეპოქსი',
    en: 'Epoxy',
    variants: ['epoxy', 'ეპოქსი'],
  },
  {
    ge: 'კრისტალები',
    en: 'Crystals',
    variants: ['crystals', 'კრისტალები'],
  },
  {
    ge: 'უჟანგავი ფოლადის დეტალები',
    en: 'Stainless steel details',
    variants: ['უჟანგავი ფოლადის დეტალები'],
  },
  {
    ge: 'უჟანგავი რკინის დეტალები',
    en: 'Stainless iron details',
    variants: ['უჟანგავი რკინის დეტალები'],
  },
  {
    ge: 'ქაღალდის ფორმატზე ფანქრით ნახატი',
    en: 'Pencil drawing on paper',
    variants: ['ქაღალდის ფორმატზე ფანქრით ნახატი'],
  },
  {
    ge: 'ტილო აკრილი ჩარჩო',
    en: 'Canvas acrylic frame',
    variants: ['ტილო აკრილი  ჩარჩო', 'ტილო აკრილი ჩარჩო'],
  },
  {
    ge: 'ქვეჩარჩოზე',
    en: 'On subframe',
    variants: ['ქვეჩარჩოზე'],
  },
  {
    ge: 'ოქროს ფირფიტები',
    en: 'Gold leaf',
    variants: ['ოქროს ფირფიტები(პოტალი).', 'ოქროს ფირფიტები', 'პოტალი'],
  },
  {
    ge: 'ხელნაკეთი თიხა (წებო და ქაღალდი)',
    en: 'Handmade clay (glue and paper)',
    variants: [
      'ხელნაკეთი თიხა ( წებო და ქაღალდი',
      'ხელნაკეთი თიხა( ქაღალდი და წებო',
      'handmade clay',
    ],
  },
  {
    ge: '100 აკრილი',
    en: 'Acrylic',
    variants: ['100 აკრილი', '70 აკრილი'],
  },
];

const MATERIAL_TRANSLATION_MAP: Record<string, string> = {};

MATERIAL_DEFINITIONS.forEach(({ ge, en, variants }) => {
  MATERIAL_TRANSLATION_MAP[ge.toLowerCase()] = en;
  variants.forEach((variant) => {
    MATERIAL_TRANSLATION_MAP[variant.toLowerCase()] = en;
  });
});

const KEYWORD_MATERIAL_RULES = MATERIAL_DEFINITIONS.map(({ ge, variants }) => ({
  material: ge,
  variants: variants.map((variant) => variant.toLowerCase()),
}));

const missingTranslations = new Map<string, number>();

function resolveMaterialTranslation(value: string): {
  translation: string;
  found: boolean;
} {
  const trimmed = value?.trim();
  if (!trimmed) {
    return { translation: '', found: false };
  }

  const normalized = trimmed.toLowerCase();

  if (MATERIAL_TRANSLATION_MAP[normalized]) {
    return {
      translation: MATERIAL_TRANSLATION_MAP[normalized],
      found: true,
    };
  }

  const cleaned = normalized.replace(/["'“”„«»]/g, '');
  if (cleaned !== normalized && MATERIAL_TRANSLATION_MAP[cleaned]) {
    return {
      translation: MATERIAL_TRANSLATION_MAP[cleaned],
      found: true,
    };
  }

  const tokenCandidates = normalized
    .split(/[\s+\-/]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokenCandidates.length > 1) {
    const translatedTokens = tokenCandidates.map(
      (token) => MATERIAL_TRANSLATION_MAP[token] || null,
    );

    if (translatedTokens.every((token): token is string => Boolean(token))) {
      return {
        translation: translatedTokens.join(' '),
        found: true,
      };
    }
  }

  return {
    translation: trimmed,
    found: false,
  };
}

function translateMaterial(value: string): string {
  const { translation, found } = resolveMaterialTranslation(value);
  if (!found) {
    const key = value.trim();
    const current = missingTranslations.get(key) ?? 0;
    missingTranslations.set(key, current + 1);
  }
  return translation;
}

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
      .map((candidate) =>
        candidate ? normalizeMaterialValue(candidate) : null,
      )
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

function tokenizeForKeywordMatching(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[,.;:!?'"“”„«»()\[\]{}\r\n\t]+/g, ' ')
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean);
}

function extractMaterialsFromKeywords(description?: string | null): string[] {
  if (!description) {
    return [];
  }

  const prepared = prepareDescription(description);
  if (!prepared) {
    return [];
  }

  const tokens = tokenizeForKeywordMatching(prepared);
  if (!tokens.length) {
    return [];
  }

  const tokenSet = new Set(tokens);
  const matches: string[] = [];

  KEYWORD_MATERIAL_RULES.forEach(({ material, variants }) => {
    const hasMatch = variants.some((variant) => tokenSet.has(variant));
    if (hasMatch) {
      matches.push(material);
    }
  });

  return matches;
}

function collectMaterials(product: any): string[] {
  const sources = [
    product.description,
    product.descriptionEn,
    product.summary,
    product.summaryEn,
  ];

  const collected = new Map<string, string>();

  if (Array.isArray(product.materials)) {
    product.materials
      .filter((material) => typeof material === 'string')
      .map((material) => material.trim())
      .filter((material) => material.length > 0)
      .forEach((material) => {
        const key = material.toLowerCase();
        if (!collected.has(key)) {
          collected.set(key, material);
        }
      });
  }

  sources.forEach((source) => {
    const parsed = parseMaterials(source);
    parsed.forEach((material) => {
      const key = material.toLowerCase();
      if (!collected.has(key)) {
        collected.set(key, material);
      }
    });

    const keywordMatches = extractMaterialsFromKeywords(source);
    keywordMatches.forEach((material) => {
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
        'materialsEn',
      ])
      .lean();

    console.log(`Found ${products.length} approved products to inspect.\n`);

    const bulkOperations: Parameters<Model<Product>['bulkWrite']>[0] = [];
    let updatedCount = 0;
    let skippedNoChange = 0;
    let skippedNoMatch = 0;
    const uniqueMaterials = new Map<string, number>();

    products.forEach((product: any) => {
      const parsedMaterials = collectMaterials(product);

      parsedMaterials.forEach((material) => {
        uniqueMaterials.set(material, (uniqueMaterials.get(material) ?? 0) + 1);
      });

      if (!parsedMaterials.length) {
        skippedNoMatch += 1;
        return;
      }

      const translatedMaterials = parsedMaterials.map(translateMaterial);

      const materialsChanged = !materialsAreEqual(
        product.materials,
        parsedMaterials,
      );
      const materialsEnChanged = !materialsAreEqual(
        product.materialsEn,
        translatedMaterials,
      );

      if (!materialsChanged && !materialsEnChanged) {
        skippedNoChange += 1;
        return;
      }

      const updatePayload: Record<string, unknown> = {};

      if (materialsChanged) {
        updatePayload.materials = parsedMaterials;
        updatePayload.materialsEn = translatedMaterials;
      } else if (materialsEnChanged) {
        updatePayload.materialsEn = translatedMaterials;
      }

      if (Object.keys(updatePayload).length === 0) {
        skippedNoChange += 1;
        return;
      }

      bulkOperations.push({
        updateOne: {
          filter: { _id: product._id },
          update: {
            $set: updatePayload,
          },
        },
      });
      updatedCount += 1;
    });

    const sortedUniqueMaterials = Array.from(uniqueMaterials.entries()).sort(
      ([a], [b]) => a.localeCompare(b, 'ka', { sensitivity: 'base' }),
    );

    if (sortedUniqueMaterials.length) {
      console.log('Detected material vocabulary (KA → EN):');
      sortedUniqueMaterials.forEach(([material, count]) => {
        const { translation } = resolveMaterialTranslation(material);
        console.log(`  • ${material} (${count}) → ${translation || '—'}`);
      });
      console.log('');
    } else {
      console.log('No materials detected in the current dataset.');
    }

    if (missingTranslations.size > 0) {
      console.log('⚠️ Missing translation entries:');
      Array.from(missingTranslations.entries())
        .sort(([, a], [, b]) => b - a)
        .forEach(([material, count]) => {
          console.log(
            `  - ${material} (${count} occurrence${count > 1 ? 's' : ''})`,
          );
        });
      console.log('');
    } else {
      console.log('✅ All detected materials have English translations.');
      console.log('');
    }

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
