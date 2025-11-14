import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PortfolioPost,
  PortfolioPostDocument,
  PortfolioImage,
} from '../users/schemas/portfolio-post.schema';
import {
  Product,
  ProductDocument,
  ProductStatus,
} from '../products/schemas/product.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  GalleryLike,
  GalleryLikeDocument,
} from '../users/schemas/gallery-like.schema';
import {
  GalleryComment,
  GalleryCommentDocument,
} from '../users/schemas/gallery-comment.schema';

interface ImageMapEntry {
  postId: Types.ObjectId;
  artistId: Types.ObjectId;
  productId?: Types.ObjectId | null;
  imageIndex: number;
}

type LeanProduct = (Product & {
  _id: Types.ObjectId;
  user: Types.ObjectId | string;
  createdAt?: Date;
}) & Record<string, any>;

type LeanUser = (User & {
  _id: Types.ObjectId;
  artistGallery?: string[];
  createdAt?: Date;
}) & Record<string, any>;

interface PortfolioPostLean {
  _id: Types.ObjectId;
  artistId: Types.ObjectId;
  productId?: Types.ObjectId | null;
  images?: Array<PortfolioImage & { url?: string }>;
}

const BATCH_SIZE = 500;

function toObjectId(
  value:
    | Types.ObjectId
    | string
    | { _id?: Types.ObjectId | string }
    | null
    | undefined,
): Types.ObjectId {
  if (!value) {
    throw new Error('Cannot convert empty value to ObjectId');
  }

  if (value instanceof Types.ObjectId) {
    return value;
  }

  if (typeof value === 'string') {
    return new Types.ObjectId(value);
  }

  if (typeof value === 'object' && value._id) {
    return toObjectId(value._id);
  }

  throw new Error(`Unsupported ObjectId value: ${JSON.stringify(value)}`);
}

async function migratePortfolioPosts(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const portfolioPostModel = app.get<Model<PortfolioPostDocument>>(
      getModelToken(PortfolioPost.name),
    );
    const productModel = app.get<Model<ProductDocument>>(
      getModelToken(Product.name),
    );
    const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
    const likeModel = app.get<Model<GalleryLikeDocument>>(
      getModelToken(GalleryLike.name),
    );
    const commentModel = app.get<Model<GalleryCommentDocument>>(
      getModelToken(GalleryComment.name),
    );

    console.log('Starting portfolio post migration...');

    const productPostsCreated = await createProductBackedPosts(
      portfolioPostModel,
      productModel,
    );
    console.log(`Created ${productPostsCreated} product-backed portfolio posts.`);

    let imageMap = await buildImageMap(portfolioPostModel);

    const legacyPostsCreated = await createLegacyGalleryPosts(
      portfolioPostModel,
      userModel,
      imageMap,
    );
    console.log(
      `Created ${legacyPostsCreated} legacy gallery portfolio posts for unmatched images.`,
    );

    // Rebuild map to include any newly created posts
    imageMap = await buildImageMap(portfolioPostModel);

    const {
      updated: likesUpdated,
      unmatched: likesUnmatched,
    } = await updateGalleryLikes(likeModel, imageMap);
    console.log(
      `Updated ${likesUpdated} gallery likes with portfolio references.${likesUnmatched ? ` Unmatched likes: ${likesUnmatched}.` : ''}`,
    );

    const {
      updated: commentsUpdated,
      unmatched: commentsUnmatched,
    } = await updateGalleryComments(commentModel, imageMap);
    console.log(
      `Updated ${commentsUpdated} gallery comments with portfolio references.${commentsUnmatched ? ` Unmatched comments: ${commentsUnmatched}.` : ''}`,
    );

    await refreshAggregateCounters(
      portfolioPostModel,
      likeModel,
      commentModel,
    );
    console.log('Portfolio posts counters refreshed.');

    console.log('Portfolio post migration completed successfully.');
  } catch (error) {
    console.error('Portfolio post migration failed:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

async function createProductBackedPosts(
  portfolioPostModel: Model<PortfolioPostDocument>,
  productModel: Model<ProductDocument>,
): Promise<number> {
  const existingProductPosts = await portfolioPostModel
    .find({ productId: { $ne: null } })
    .select(['productId'])
    .lean();

  const existingProductIdSet = new Set(
    existingProductPosts
      .map((post) => post.productId)
      .filter((id): id is Types.ObjectId => Boolean(id))
      .map((id) => id.toString()),
  );

  const productsCursor = productModel
    .find({ images: { $exists: true, $ne: [] } })
    .select([
      'user',
      'images',
      'description',
      'category',
      'categoryStructure',
      'materials',
      'sizes',
      'colors',
      'ageGroups',
      'price',
      'countInStock',
      'status',
      'hashtags',
      'name',
      'dimensions',
      'createdAt',
    ])
    .lean()
    .cursor();

  let created = 0;

  for await (const productDoc of productsCursor) {
    const product = productDoc as unknown as LeanProduct;
    const productId = product._id.toString();
    if (existingProductIdSet.has(productId)) {
      continue;
    }

    const imageEntries = buildProductImages(product.images ?? []);
    if (!imageEntries.length) {
      continue;
    }

    const artistId = toObjectId(product.user as any);

    const caption = buildCaption(product);

    await portfolioPostModel.create({
      artistId,
      productId: product._id,
      images: imageEntries,
      caption,
      tags: Array.isArray(product.hashtags) ? product.hashtags.slice(0, 20) : [],
      isFeatured: false,
      isSold: typeof product.countInStock === 'number' ? product.countInStock <= 0 : false,
      hideBuyButton: product.status !== ProductStatus.APPROVED,
      likesCount: 0,
      commentsCount: 0,
      publishedAt: product.createdAt ?? new Date(),
    });

    created += 1;
    existingProductIdSet.add(productId);
  }

  return created;
}

function buildProductImages(images: string[]): PortfolioImage[] {
  return images
    .filter((url) => typeof url === 'string' && url.trim().length > 0)
    .map((url, index) => ({
      url,
      order: index,
      metadata: {
        source: 'product',
        order: String(index),
      },
    }));
}

function buildCaption(product: LeanProduct): string | null {
  const parts: string[] = [];
  const description = typeof product.description === 'string' ? product.description.trim() : '';

  if (description) {
    parts.push(description);
  }

  const details: string[] = [];

  if (product.categoryStructure?.main || product.categoryStructure?.sub) {
    const main = product.categoryStructure?.main ?? product.category ?? '';
    const sub = product.categoryStructure?.sub ?? '';
    const categoryLine = sub ? `${main} / ${sub}` : main;
    if (categoryLine) {
      details.push(`Category: ${categoryLine}`);
    }
  } else if (product.category) {
    details.push(`Category: ${product.category}`);
  }

  if (Array.isArray(product.materials) && product.materials.length) {
    details.push(`Materials: ${product.materials.join(', ')}`);
  }

  const dimensionsText = formatDimensions(product.dimensions);
  if (dimensionsText) {
    details.push(`Dimensions: ${dimensionsText}`);
  }

  if (Array.isArray(product.sizes) && product.sizes.length) {
    details.push(`Sizes: ${product.sizes.join(', ')}`);
  }

  if (Array.isArray(product.colors) && product.colors.length) {
    details.push(`Colors: ${product.colors.join(', ')}`);
  }

  if (Array.isArray(product.ageGroups) && product.ageGroups.length) {
    details.push(`Age groups: ${product.ageGroups.join(', ')}`);
  }

  if (details.length) {
    if (parts.length) {
      parts.push('');
    }
    parts.push('Listing Details:');
    details.forEach((detail) => parts.push(`- ${detail}`));
  }

  if (!parts.length) {
    return null;
  }

  let caption = parts.join('\n');
  if (caption.length > 4000) {
    caption = `${caption.slice(0, 3997)}...`;
  }

  return caption;
}

function formatDimensions(dimensions?: {
  width?: number;
  height?: number;
  depth?: number;
}): string | null {
  if (!dimensions) {
    return null;
  }

  const { width, height, depth } = dimensions;
  const numeric = [width, height, depth].filter(
    (value) => typeof value === 'number' && !Number.isNaN(value),
  );

  if (!numeric.length) {
    return null;
  }

  if (
    typeof width === 'number' &&
    typeof height === 'number' &&
    typeof depth === 'number'
  ) {
    return `${width} x ${height} x ${depth} cm`;
  }

  if (typeof width === 'number' && typeof height === 'number') {
    return `${width} x ${height} cm`;
  }

  if (typeof height === 'number') {
    return `${height} cm (height)`;
  }

  if (typeof width === 'number') {
    return `${width} cm (width)`;
  }

  if (typeof depth === 'number') {
    return `${depth} cm (depth)`;
  }

  return null;
}

async function createLegacyGalleryPosts(
  portfolioPostModel: Model<PortfolioPostDocument>,
  userModel: Model<UserDocument>,
  imageMap: Map<string, ImageMapEntry>,
): Promise<number> {
  const usersCursor = userModel
    .find({ artistGallery: { $exists: true, $ne: [] } })
    .select(['artistGallery', 'createdAt'])
    .lean()
    .cursor();

  let created = 0;

  for await (const userDoc of usersCursor) {
    const user = userDoc as unknown as LeanUser;
    const artistId = user._id;
    const gallery = Array.isArray(user.artistGallery)
      ? user.artistGallery.filter((url) => typeof url === 'string' && url.trim())
      : [];

    if (!gallery.length) {
      continue;
    }

    for (const url of gallery) {
      const key = makeImageKey(artistId, url);
      if (imageMap.has(key)) {
        continue;
      }

      await portfolioPostModel.create({
        artistId,
        productId: null,
        images: [
          {
            url,
            order: 0,
            metadata: {
              source: 'legacy-gallery',
            },
          },
        ],
        caption: null,
        tags: [],
        isFeatured: false,
        isSold: false,
        hideBuyButton: true,
        likesCount: 0,
        commentsCount: 0,
        publishedAt: user.createdAt ?? new Date(),
      });

      created += 1;
    }
  }

  return created;
}

async function buildImageMap(
  portfolioPostModel: Model<PortfolioPostDocument>,
): Promise<Map<string, ImageMapEntry>> {
  const posts = (await portfolioPostModel
    .find()
    .select(['artistId', 'productId', 'images'])
    .lean()) as unknown as PortfolioPostLean[];

  const map = new Map<string, ImageMapEntry>();

  posts.forEach((post) => {
    (post.images ?? []).forEach((image, index) => {
      const url = image?.url;
      if (!url) {
        return;
      }

      const key = makeImageKey(post.artistId, url);
      if (!map.has(key)) {
        map.set(key, {
          postId: post._id,
          artistId: post.artistId,
          productId: post.productId ?? null,
          imageIndex: index,
        });
      }
    });
  });

  return map;
}

function makeImageKey(artistId: Types.ObjectId | string, imageUrl: string): string {
  return `${artistId.toString()}::${imageUrl}`;
}

async function updateGalleryLikes(
  likeModel: Model<GalleryLikeDocument>,
  imageMap: Map<string, ImageMapEntry>,
): Promise<{ updated: number; unmatched: number }> {
  const cursor = likeModel
    .find({
      $or: [
        { portfolioPostId: { $exists: false } },
        { portfolioPostId: null },
      ],
    })
    .select(['artistId', 'imageUrl'])
    .lean()
    .cursor();

  const bulkOps: Parameters<typeof likeModel.bulkWrite>[0] = [];
  let processed = 0;
  let unmatched = 0;

  for await (const likeDoc of cursor) {
    const like = likeDoc as unknown as {
      _id: Types.ObjectId;
      artistId: Types.ObjectId | string;
      imageUrl: string;
    };
    const artistId = like.artistId as Types.ObjectId | string;
    const key = makeImageKey(artistId, like.imageUrl);
    const mapping = imageMap.get(key);

    if (!mapping) {
      unmatched += 1;
      continue;
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: like._id },
        update: {
          $set: {
            portfolioPostId: mapping.postId,
            imageIndex: mapping.imageIndex,
            productId: mapping.productId ?? null,
          },
        },
      },
    });

    if (bulkOps.length >= BATCH_SIZE) {
      await likeModel.bulkWrite(bulkOps, { ordered: false });
      processed += bulkOps.length;
      bulkOps.length = 0;
    }
  }

  if (bulkOps.length) {
    await likeModel.bulkWrite(bulkOps, { ordered: false });
    processed += bulkOps.length;
  }

  return { updated: processed, unmatched };
}

async function updateGalleryComments(
  commentModel: Model<GalleryCommentDocument>,
  imageMap: Map<string, ImageMapEntry>,
): Promise<{ updated: number; unmatched: number }> {
  const cursor = commentModel
    .find({
      $or: [
        { portfolioPostId: { $exists: false } },
        { portfolioPostId: null },
      ],
    })
    .select(['artistId', 'imageUrl'])
    .lean()
    .cursor();

  const bulkOps: Parameters<typeof commentModel.bulkWrite>[0] = [];
  let processed = 0;
  let unmatched = 0;

  for await (const commentDoc of cursor) {
    const comment = commentDoc as unknown as {
      _id: Types.ObjectId;
      artistId: Types.ObjectId | string;
      imageUrl: string;
    };
    const artistId = comment.artistId as Types.ObjectId | string;
    const key = makeImageKey(artistId, comment.imageUrl);
    const mapping = imageMap.get(key);

    if (!mapping) {
      unmatched += 1;
      continue;
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: comment._id },
        update: {
          $set: {
            portfolioPostId: mapping.postId,
            imageIndex: mapping.imageIndex,
            productId: mapping.productId ?? null,
          },
        },
      },
    });

    if (bulkOps.length >= BATCH_SIZE) {
      await commentModel.bulkWrite(bulkOps, { ordered: false });
      processed += bulkOps.length;
      bulkOps.length = 0;
    }
  }

  if (bulkOps.length) {
    await commentModel.bulkWrite(bulkOps, { ordered: false });
    processed += bulkOps.length;
  }

  return { updated: processed, unmatched };
}

async function refreshAggregateCounters(
  portfolioPostModel: Model<PortfolioPostDocument>,
  likeModel: Model<GalleryLikeDocument>,
  commentModel: Model<GalleryCommentDocument>,
): Promise<void> {
  const likeCounts = await likeModel.aggregate<{
    _id: Types.ObjectId;
    count: number;
  }>([
    {
      $match: {
        portfolioPostId: { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: '$portfolioPostId',
        count: { $sum: 1 },
      },
    },
  ]);

  const commentCounts = await commentModel.aggregate<{
    _id: Types.ObjectId;
    count: number;
  }>([
    {
      $match: {
        portfolioPostId: { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: '$portfolioPostId',
        count: { $sum: 1 },
      },
    },
  ]);

  const likeMap = new Map<string, number>();
  likeCounts.forEach((entry) => likeMap.set(entry._id.toString(), entry.count));

  const commentMap = new Map<string, number>();
  commentCounts.forEach((entry) =>
    commentMap.set(entry._id.toString(), entry.count),
  );

  const posts = await portfolioPostModel
    .find()
    .select(['_id'])
    .lean<{ _id: Types.ObjectId }[]>();

  const updateOps: Parameters<typeof portfolioPostModel.bulkWrite>[0] = [];

  posts.forEach((post) => {
    const postId = post._id.toString();
    updateOps.push({
      updateOne: {
        filter: { _id: post._id },
        update: {
          $set: {
            likesCount: likeMap.get(postId) ?? 0,
            commentsCount: commentMap.get(postId) ?? 0,
          },
        },
      },
    });
  });

  if (updateOps.length) {
    await portfolioPostModel.bulkWrite(updateOps, { ordered: false });
  }
}

migratePortfolioPosts()
  .then(() => {
    if (!process.exitCode) {
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('Unexpected migration error:', error);
    process.exit(1);
  });
