// SEO-friendly product URLs: /products/<latin-slug>-<mongoId>
// The trailing 24-hex Mongo id is always the source of truth; the slug is
// decorative, so old bare-id links (/products/<id>) keep working.

const georgianToLatin: Record<string, string> = {
  ა: "a", ბ: "b", გ: "g", დ: "d", ე: "e", ვ: "v", ზ: "z",
  თ: "t", ი: "i", კ: "k", ლ: "l", მ: "m", ნ: "n", ო: "o",
  პ: "p", ჟ: "zh", რ: "r", ს: "s", ტ: "t", უ: "u", ფ: "f",
  ქ: "q", ღ: "gh", ყ: "y", შ: "sh", ჩ: "ch", ც: "ts", ძ: "dz",
  წ: "w", ჭ: "j", ხ: "kh", ჯ: "j", ჰ: "h",
};

export function transliterateGeorgian(text: string): string {
  return text.replace(/[Ⴀ-ჿ]/g, (c) => georgianToLatin[c] || "");
}

export function slugify(text: string): string {
  return transliterateGeorgian(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

interface SlugProduct {
  _id?: string;
  id?: string;
  name?: string;
  nameEn?: string;
  slug?: string;
}

// Builds `/products/<slug>-<id>` (falls back to `/products/<id>`).
export function productHref(product: SlugProduct): string {
  const id = product._id || product.id || "";
  if (!id) return "/products";
  const slug = slugify(product.nameEn || product.name || "");
  return slug ? `/products/${slug}-${id}` : `/products/${id}`;
}

// Extracts the Mongo id from a `[id]` route param that may be `<slug>-<id>`.
export function extractProductId(param: string): string {
  if (!param) return param;
  const decoded = decodeURIComponent(param);
  if (OBJECT_ID.test(decoded)) return decoded;
  const tail = decoded.slice(-24);
  if (OBJECT_ID.test(tail)) return tail;
  // Fallback: last hyphen segment.
  const seg = decoded.split("-").pop() || decoded;
  return seg;
}
