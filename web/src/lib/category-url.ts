// Clean category URLs (/paintings, /handmade). Prefer the category's own slug
// (returned by the API); fall back to the known main-category IDs; and, for any
// unknown category, keep the legacy ?mainCategory= URL so nothing breaks.
const MAIN_ID_TO_SLUG: Record<string, string> = {
  "68768f6f0b55154655a8e882": "paintings",
  "68768f850b55154655a8e88f": "handmade",
};

export function categoryPath(id?: string, slug?: string | null): string {
  if (slug) return `/${slug}`;
  if (id && MAIN_ID_TO_SLUG[id]) return `/${MAIN_ID_TO_SLUG[id]}`;
  return id ? `/shop?mainCategory=${id}` : "/shop";
}
