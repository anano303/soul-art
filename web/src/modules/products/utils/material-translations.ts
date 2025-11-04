const MATERIAL_TRANSLATIONS: Record<string, string> = {
  ტილო: "Canvas",
  "ტილო ზეთში": "Oil on Canvas",
  ზეთი: "Oil Paint",
  "ზეთის საღებავი": "Oil Paint",
  აკრილი: "Acrylic",
  "აკრილი ტილოზე": "Acrylic on Canvas",
  აკვარელი: "Watercolor",
  გუაში: "Gouache",
  ტემპერა: "Tempera",
  პასტელი: "Pastel",
  მელანი: "Ink",
  ტუში: "Ink",
  ფანქარი: "Pencil",
  მარკერი: "Marker",
  სპრეი: "Spray Paint",
  "სპრეი საღებავი": "Spray Paint",
  გრაფიტი: "Graphite",
  "შალის ძაფი": "Wool Yarn",
  "ბამბის ძაფი": "Cotton Yarn",
  ტექსტილი: "Textile",
  ქსოვილი: "Fabric",
  ტყავი: "Leather",
  თექა: "Felt",
  ბამბა: "Cotton",
  კანვასი: "Canvas",
  "ხის ფირფიტა": "Wooden Panel",
  ხე: "Wood",
  მინა: "Glass",
  ქვა: "Stone",
  მარმარილო: "Marble",
  ბრინჯაო: "Bronze",
  ლითონი: "Metal",
  თიხა: "Clay",
  "შავი თიხა": "Black Clay",
  კერამიკა: "Ceramics",
  ფაიფური: "Porcelain",
  რეზინი: "Rubber",
  "მარგალიტის მძივები": "Pearl Beads",
  "შუშის მძივები": "Glass Beads",
  მეტალი: "Metal",
  "მეტალის დეტალი": "Metal Detail",
  "მარგალიტის და შუშის მძივები": "Pearl and Glass Beads",
  "ბამბა, მეტალი, მინა": "Cotton, Metal, Glass",
};

export function getMaterialLabel(material: string, language: string): string {
  if (language === "en") {
    const normalized = material.trim();
    const translation = MATERIAL_TRANSLATIONS[normalized];
    if (translation) {
      return translation;
    }
  }

  return material;
}
