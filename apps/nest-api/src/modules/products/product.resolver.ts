import { Resolver, Query, Mutation, Args, ResolveField, Parent, Context } from '@nestjs/graphql';
import { ProductService } from './product.service';
import { GraphQLContext } from '../../types/context';

@Resolver('Product')
export class ProductResolver {
  constructor(private productService: ProductService) {}

  @Query('getProduct')
  async getProduct(@Args('id') id: string) {
    return this.productService.getProduct(id);
  }

  @Query('getProductBySlug')
  async getProductBySlug(
    @Args('sellerId') sellerId: string,
    @Args('slug') slug: string,
  ) {
    return this.productService.getProductBySlug(sellerId, slug);
  }

  @Query('listProducts')
  async listProducts(
    @Args('filter') filter?: any,
    @Args('sort') sort?: any,
    @Args('first') first?: number,
    @Args('after') after?: string,
  ) {
    return this.productService.listProducts({ filter, sort, first, after });
  }

  @Mutation('createProduct')
  async createProduct(
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    const sellerId = 'e2e-seller1';
    return this.productService.createProduct(input, sellerId);
  }

  @Mutation('updateProduct')
  async updateProduct(
    @Args('id') id: string,
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    const sellerId = 'e2e-seller1';
    return this.productService.updateProduct(id, input, sellerId);
  }

  @Mutation('deleteProduct')
  async deleteProduct(
    @Args('id') id: string,
    @Context() context: GraphQLContext,
  ) {
    const sellerId = 'e2e-seller1';
    return this.productService.deleteProduct(id, sellerId);
  }

  @ResolveField('seller')
  async seller(@Parent() product: any, @Context() context: GraphQLContext) {
    return context.sellerLoader.load(product.seller_id);
  }
}
