import { describe, it, expect } from 'vitest';
import { generateProductSchema, generateBreadcrumbSchema } from '@/lib/product-schema';

describe('lib/product-schema', () => {
  const mockProduct = {
    _id: 'prod-123',
    name: 'ლამაზი ნახატი',
    description: 'ზეთის საღებავით შესრულებული',
    price: 200,
    brand: 'TestArtist',
    images: ['https://soulart-s3.s3.eu-north-1.amazonaws.com/test.jpg'],
    countInStock: 5,
    rating: 4.5,
    numReviews: 10,
    mainCategory: { name: 'ნახატები' },
    hashtags: ['#art', 'painting'],
  } as any;

  it('generates valid schema.org Product structure', () => {
    const schema = generateProductSchema(mockProduct, 'prod-123');
    expect(schema['@context']).toBe('https://schema.org/');
    expect(schema['@type']).toBe('Product');
    expect(schema.name).toBe('ლამაზი ნახატი');
  });

  it('includes brand info', () => {
    const schema = generateProductSchema(mockProduct, 'prod-123');
    expect(schema.brand['@type']).toBe('Brand');
    expect(schema.brand.name).toBe('TestArtist');
  });

  it('includes offer with price', () => {
    const schema = generateProductSchema(mockProduct, 'prod-123');
    expect(schema.offers['@type']).toBe('Offer');
    expect(schema.offers.price).toBe(200);
    expect(schema.offers.priceCurrency).toBe('GEL');
  });

  it('shows InStock when countInStock > 0', () => {
    const schema = generateProductSchema(mockProduct, 'prod-123');
    expect(schema.offers.availability).toContain('InStock');
  });

  it('shows OutOfStock when countInStock = 0', () => {
    const outOfStock = { ...mockProduct, countInStock: 0 };
    const schema = generateProductSchema(outOfStock, 'prod-123');
    expect(schema.offers.availability).toContain('OutOfStock');
  });

  it('includes aggregate rating when reviews exist', () => {
    const schema = generateProductSchema(mockProduct, 'prod-123');
    expect(schema.aggregateRating).toBeDefined();
    expect(schema.aggregateRating?.ratingValue).toBe(4.5);
    expect(schema.aggregateRating?.reviewCount).toBe(10);
  });

  it('omits aggregate rating when no reviews', () => {
    const noReviews = { ...mockProduct, numReviews: 0, rating: 0 };
    const schema = generateProductSchema(noReviews, 'prod-123');
    expect(schema.aggregateRating).toBeUndefined();
  });

  it('uses images array from product', () => {
    const schema = generateProductSchema(mockProduct, 'prod-123');
    expect(schema.image).toEqual(mockProduct.images);
  });

  it('falls back to logo when no images', () => {
    const noImages = { ...mockProduct, images: [] };
    const schema = generateProductSchema(noImages, 'prod-123');
    expect(schema.image).toEqual(['/logo.png']);
  });

  it('includes hashtags in description', () => {
    const schema = generateProductSchema(mockProduct, 'prod-123');
    expect(schema.description).toContain('#art');
    expect(schema.description).toContain('#painting');
  });

  it('includes category', () => {
    const schema = generateProductSchema(mockProduct, 'prod-123');
    expect(schema.category).toBe('ნახატები');
  });

  describe('generateBreadcrumbSchema', () => {
    it('generates BreadcrumbList schema', () => {
      const schema = generateBreadcrumbSchema(mockProduct, 'prod-123');
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('BreadcrumbList');
    });

    it('includes home and shop items', () => {
      const schema = generateBreadcrumbSchema(mockProduct, 'prod-123');
      expect(schema.itemListElement[0].name).toBe('მთავარი');
      expect(schema.itemListElement[1].name).toBe('მაღაზია');
    });

    it('includes category when present', () => {
      const schema = generateBreadcrumbSchema(mockProduct, 'prod-123');
      const categoryItem = schema.itemListElement.find((i: any) => i.name === 'ნახატები');
      expect(categoryItem).toBeDefined();
    });

    it('includes product name as last item', () => {
      const schema = generateBreadcrumbSchema(mockProduct, 'prod-123');
      const last = schema.itemListElement[schema.itemListElement.length - 1];
      expect(last.name).toBe('ლამაზი ნახატი');
    });

    it('handles string category', () => {
      const stringCat = { ...mockProduct, mainCategory: 'paintings' };
      const schema = generateBreadcrumbSchema(stringCat, 'prod-123');
      const categoryItem = schema.itemListElement.find((i: any) => i.name === 'paintings');
      expect(categoryItem).toBeDefined();
    });

    it('handles no category', () => {
      const noCat = { ...mockProduct, mainCategory: null };
      const schema = generateBreadcrumbSchema(noCat, 'prod-123');
      // Should have home, shop, product (no category)
      expect(schema.itemListElement.length).toBe(3);
    });
  });
});
