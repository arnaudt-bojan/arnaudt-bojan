import { Resolver, Query, Mutation, Args, ResolveField, Parent, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductPresentationService } from '../product-presentation/product-presentation.service';
import { GraphQLContext } from '../../types/context';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { UserTypeGuard } from '../auth/guards/user-type.guard';
import { RequireUserType } from '../auth/decorators/require-user-type.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateProductInput } from './dto/create-product.input';
import { UpdateProductInput } from './dto/update-product.input';
import { GqlRateLimitGuard, RateLimit } from '../auth/guards/gql-rate-limit.guard';

@Resolver('Product')
export class ProductResolver {
  constructor(
    private productService: ProductService,
    private productPresentationService: ProductPresentationService,
  ) {}

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
  @UseGuards(GqlRateLimitGuard)
  @RateLimit({ limit: 20, ttl: 60 })
  async listProducts(
    @Args('filter') filter?: any,
    @Args('sort') sort?: any,
    @Args('first') first?: number,
    @Args('after') after?: string,
  ) {
    return this.productService.listProducts({ filter, sort, first, after });
  }

  @Mutation('createProduct')
  @UseGuards(GqlAuthGuard, UserTypeGuard)
  @RequireUserType('seller')
  async createProduct(
    @Args('input') input: CreateProductInput,
    @CurrentUser() userId: string,
    @Context() context: GraphQLContext,
  ) {
    return this.productService.createProduct(input, userId);
  }

  @Mutation('updateProduct')
  @UseGuards(GqlAuthGuard, UserTypeGuard)
  @RequireUserType('seller')
  async updateProduct(
    @Args('id') id: string,
    @Args('input') input: UpdateProductInput,
    @CurrentUser() userId: string,
    @Context() context: GraphQLContext,
  ) {
    return this.productService.updateProduct(id, input, userId);
  }

  @Mutation('deleteProduct')
  @UseGuards(GqlAuthGuard, UserTypeGuard)
  @RequireUserType('seller')
  async deleteProduct(
    @Args('id') id: string,
    @CurrentUser() userId: string,
    @Context() context: GraphQLContext,
  ) {
    return this.productService.deleteProduct(id, userId);
  }

  @ResolveField('seller')
  async seller(@Parent() product: any, @Context() context: GraphQLContext) {
    return context.sellerLoader.load(product.seller_id);
  }

  @ResolveField('presentation')
  async presentation(@Parent() product: any) {
    return this.productPresentationService.getProductPresentation(product);
  }
}
