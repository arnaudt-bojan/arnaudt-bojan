import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { AppWebSocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    @Inject(forwardRef(() => AppWebSocketGateway))
    private readonly websocketGateway: AppWebSocketGateway,
  ) {}

  async getProduct(id: string) {
    // Cache key: product:{id}
    const cacheKey = `product:${id}`;
    
    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // Cache miss - fetch from DB
    const product = await this.prisma.products.findUnique({
      where: { id },
    });

    if (!product) {
      throw new GraphQLError('Product not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Store in cache (5min TTL)
    await this.cacheService.set(cacheKey, product, 300);

    return product;
  }

  async getProductBySlug(sellerId: string, slug: string) {
    // Cache key: product:slug:{sellerId}:{slug}
    const cacheKey = `product:slug:${sellerId}:${slug}`;
    
    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // Cache miss - fetch from DB
    const product = await this.prisma.products.findFirst({
      where: { 
        seller_id: sellerId,
        slug: slug,
      },
    });

    if (!product) {
      throw new GraphQLError('Product not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Store in cache (5min TTL)
    await this.cacheService.set(cacheKey, product, 300);

    return product;
  }

  async listProducts(args: {
    filter?: any;
    sort?: any;
    first?: number;
    after?: string;
  }) {
    const { filter, sort, first = 20, after } = args;
    
    // Enforce max 100 limit (Relay pagination best practice)
    const take = Math.min(first, 100);
    
    let cursor;
    if (after) {
      try {
        const decoded = JSON.parse(Buffer.from(after, 'base64').toString('utf-8'));
        cursor = { id: decoded.id };
      } catch (e) {
        throw new GraphQLError('Invalid cursor', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }
    }

    const where: any = {};
    if (filter?.sellerId) where.seller_id = filter.sellerId;
    if (filter?.category) where.category = filter.category;
    if (filter?.status) where.status = filter.status;
    if (filter?.inStock) where.stock = { gt: 0 };
    if (filter?.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }
    if (filter?.priceMin || filter?.priceMax) {
      where.price = {};
      if (filter.priceMin) where.price.gte = filter.priceMin;
      if (filter.priceMax) where.price.lte = filter.priceMax;
    }

    const orderBy: any = {};
    if (sort?.field) {
      const field = sort.field.toLowerCase();
      orderBy[field === 'created_at' ? 'createdAt' : field] = sort.direction.toLowerCase();
    } else {
      orderBy.createdAt = 'desc';
    }

    const items = await this.prisma.products.findMany({
      where,
      orderBy,
      take: take + 1,
      ...(cursor && { skip: 1, cursor }),
    });

    const hasNextPage = items.length > take;
    const nodes = hasNextPage ? items.slice(0, take) : items;

    const totalCount = await this.prisma.products.count({ where });

    const edges = nodes.map(node => ({
      cursor: Buffer.from(JSON.stringify({ id: node.id })).toString('base64'),
      node,
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: !!after,
        startCursor: edges[0]?.cursor || null,
        endCursor: edges[edges.length - 1]?.cursor || null,
      },
      totalCount,
    };
  }

  async createProduct(input: any, sellerId: string) {
    const productData = {
      seller_id: sellerId,
      name: input.name,
      description: input.description,
      price: input.price,
      image: input.image,
      images: input.images || [input.image],
      category: input.category,
      product_type: input.productType,
      stock: input.stock,
      sku: input.sku || null,
      variants: input.variants || null,
      shipping_type: input.shippingType || 'flat',
      flat_shipping_rate: input.flatShippingRate || null,
      status: 'ACTIVE',
      promotion_active: 0,
      requires_deposit: 0,
      slug: input.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, ''),
    };

    const product = await this.prisma.products.create({
      data: productData,
    });

    // Cache invalidation: Clear product list caches for this seller
    await this.cacheService.delPattern(`products:seller:${sellerId}`);

    // External API calls (Socket.IO) - OUTSIDE transaction
    this.websocketGateway.emitProductCreated(sellerId, {
      productId: product.id,
      sellerId: product.seller_id,
      name: product.name,
      price: product.price.toString(),
      stock: product.stock || 0,
    });

    return product;
  }

  async updateProduct(id: string, input: any, sellerId: string) {
    const existing = await this.prisma.products.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new GraphQLError('Product not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (existing.seller_id !== sellerId) {
      throw new GraphQLError('Unauthorized', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const updateData: any = {};
    const changes: any = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
      changes.name = input.name;
    }
    if (input.description !== undefined) updateData.description = input.description;
    if (input.price !== undefined) {
      updateData.price = input.price;
      changes.price = input.price.toString();
    }
    if (input.image !== undefined) updateData.image = input.image;
    if (input.images !== undefined) updateData.images = input.images;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.stock !== undefined) {
      updateData.stock = input.stock;
      changes.stock = input.stock;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
      changes.status = input.status;
    }

    if (input.name !== undefined) {
      updateData.slug = input.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    }

    const product = await this.prisma.products.update({
      where: { id },
      data: updateData,
    });

    // Cache invalidation: Clear product caches
    await this.cacheService.del(`product:${id}`);
    await this.cacheService.del(`product:slug:${sellerId}:${existing.slug}`);
    if (updateData.slug && updateData.slug !== existing.slug) {
      await this.cacheService.del(`product:slug:${sellerId}:${updateData.slug}`);
    }
    await this.cacheService.delPattern(`products:seller:${sellerId}`);

    // External API calls (Socket.IO) - OUTSIDE transaction
    this.websocketGateway.emitProductUpdated(sellerId, {
      productId: product.id,
      sellerId: product.seller_id,
      changes,
    });

    if (input.stock !== undefined && input.stock !== existing.stock) {
      this.websocketGateway.emitProductStockChanged(sellerId, {
        productId: product.id,
        sellerId: product.seller_id,
        oldStock: existing.stock || 0,
        newStock: input.stock,
      });

      if (input.stock <= 10 && input.stock > 0) {
        this.websocketGateway.emitProductLowStock(sellerId, {
          productId: product.id,
          sellerId: product.seller_id,
          name: product.name,
          currentStock: input.stock,
          threshold: 10,
        });
      }

      if (input.stock === 0) {
        this.websocketGateway.emitStockOut(sellerId, {
          productId: product.id,
          sellerId: product.seller_id,
          productName: product.name,
        });
      }

      if (existing.stock === 0 && input.stock > 0) {
        this.websocketGateway.emitStockRestocked(sellerId, {
          productId: product.id,
          sellerId: product.seller_id,
          productName: product.name,
          newStock: input.stock,
        });
      }
    }

    if (input.price !== undefined && input.price.toString() !== existing.price.toString()) {
      this.websocketGateway.emitProductPriceChanged(sellerId, {
        productId: product.id,
        sellerId: product.seller_id,
        oldPrice: existing.price.toString(),
        newPrice: input.price.toString(),
      });
    }

    return product;
  }

  async deleteProduct(id: string, sellerId: string) {
    const existing = await this.prisma.products.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new GraphQLError('Product not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (existing.seller_id !== sellerId) {
      throw new GraphQLError('Unauthorized', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    await this.prisma.products.delete({
      where: { id },
    });

    this.websocketGateway.emitProductDeleted(sellerId, {
      productId: existing.id,
      sellerId: existing.seller_id,
    });

    return true;
  }
}
