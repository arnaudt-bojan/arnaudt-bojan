import { ObjectType, Field, Int } from '@nestjs/graphql';
import { PageInfo } from '../../../common/dto/pagination.dto';

/**
 * Product edge for Relay-style pagination
 */
@ObjectType()
export class ProductEdge {
  @Field()
  cursor!: string;

  @Field()
  node!: any; // Will be resolved as Product type
}

/**
 * Product connection for Relay-style cursor pagination
 */
@ObjectType()
export class ProductConnection {
  @Field(() => [ProductEdge])
  edges!: ProductEdge[];

  @Field(() => PageInfo)
  pageInfo!: PageInfo;

  @Field(() => Int)
  totalCount!: number;
}
