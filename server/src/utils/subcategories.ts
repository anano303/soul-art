export const CLOTHING_CATEGORIES = ['მაისურები', 'კაბები', 'ჰუდები', 'სხვა'];

export const ACCESSORIES_CATEGORIES = ['კეპები', 'პანამები', 'სხვა'];

export const FOOTWEAR_CATEGORIES = ['სპორტული', 'ყოველდღიური', 'სხვა'];

export const SWIMWEAR_CATEGORIES = ['საცურაო კოსტუმები', 'სხვა'];

// Age groups for all categories
export const AGE_GROUPS = ['ბავშვები', 'მოზრდილები'];

// Common sizes
export const SIZES = {
  CLOTHING: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  FOOTWEAR: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
  ACCESSORIES: ['უნივერსალური', 'S', 'M', 'L'],
  SWIMWEAR: ['XS', 'S', 'M', 'L', 'XL'],
};

// Common colors
export const COLORS = [
  'შავი',
  'თეთრი',
  'წითელი',
  'ლურჯი',
  'მწვანე',
  'ყვითელი',
  'ნაცრისფერი',
  'ვარდისფერი',
  'იისფერი',
  'ყავისფერი',
  'ნარინჯისფერი',
  'სხვა',
];

// Legacy categories (keeping for backward compatibility)
export const HANDMADE_CATEGORIES = [
  'კერამიკა',
  'ხის ნაკეთობები',
  'სამკაულები',
  'ტექსტილი',
  'მინანქარი',
  'სკულპტურები',
  'სხვა',
];

export const PAINTING_CATEGORIES = [
  'აბსტრაქცია',
  'პეიზაჟი',
  'პორტრეტი',
  'შავ-თეთრი',
  'ანიმაციური',
  'ციფრული ილუსტრაციები',
  'მინიატურა',
  'სხვა',
];

// Legacy categories mapping to new categories (for data migration)
export const CATEGORY_MAPPING = {
  // Map HANDMADE categories to ACCESSORIES
  კერამიკა: 'კეპები',
  'ხის ნაკეთობები': 'პანამები',
  სამკაულები: 'სხვა',
  ტექსტილი: 'სხვა',
  მინანქარი: 'სხვა',
  სკულპტურები: 'სხვა',

  // Map PAINTINGS categories to CLOTHING
  აბსტრაქცია: 'მაისურები',
  პეიზაჟი: 'მაისურები',
  პორტრეტი: 'მაისურები',
  'შავ-თეთრი': 'მაისურები',
  ანიმაციური: 'მაისურები',
  'ციფრული ილუსტრაციები': 'მაისურები',
  მინიატურა: 'მაისურები',
};
