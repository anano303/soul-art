import {
  AGE_GROUPS,
  SIZES,
  COLORS,
  CLOTHING_CATEGORIES,
  ACCESSORIES_CATEGORIES,
  FOOTWEAR_CATEGORIES,
  SWIMWEAR_CATEGORIES,
} from '../utils/subcategories';

export { AGE_GROUPS, SIZES, COLORS };

// Default category structure for new categories
export const DEFAULT_CATEGORY_STRUCTURE = {
  ageGroups: AGE_GROUPS,
  sizes: SIZES,
  colors: COLORS,
};

// Main category codes and their subcategories
export const MAIN_CATEGORIES = [
  {
    code: 'CLOTHING',
    name: 'ტანსაცმელი',
    subcategories: CLOTHING_CATEGORIES,
  },
  {
    code: 'ACCESSORIES',
    name: 'აქსესუარები',
    subcategories: ACCESSORIES_CATEGORIES,
  },
  {
    code: 'FOOTWEAR',
    name: 'ფეხსაცმელი',
    subcategories: FOOTWEAR_CATEGORIES,
  },
  {
    code: 'SWIMWEAR',
    name: 'საცურაო კოსტუმები',
    subcategories: SWIMWEAR_CATEGORIES,
  },
];
