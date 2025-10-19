import { Injectable } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async getProduct(id: string) {
    const product = await this.prisma.products.findUnique({
      where: { id },
    });

    if (!product) {
      throw new GraphQLError('Product not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return product;
  }

  async getProductBySlug(sellerId: string, slug: string) {
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

    return product;
  }

  async listProducts(args: {
    filter?: any;
    sort?: any;
    first?: number;
    after?: string;
  }) {
    const { filter, sort, first = 20, after } = args;
    
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
      take: first + 1,
      ...(cursor && { skip: 1, cursor }),
    });

    const hasNextPage = items.length > first;
    const nodes = hasNextPage ? items.slice(0, first) : items;

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
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.price !== undefined) updateData.price = input.price;
    if (input.image !== undefined) updateData.image = input.image;
    if (input.images !== undefined) updateData.images = input.images;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.stock !== undefined) updateData.stock = input.stock;
    if (input.status !== undefined) updateData.status = input.status;

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

    return true;
  }
}
