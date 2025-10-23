import { ObjectType, Field, Int } from '@nestjs/graphql';
import { PageInfo } from '../../../common/dto/pagination.dto';

/**
 * WholesaleOrder edge for Relay-style pagination
 */
@ObjectType()
export class WholesaleOrderEdge {
  @Field()
  cursor!: string;

  @Field()
  node!: any; // Will be resolved as WholesaleOrder type
}

/**
 * WholesaleOrder connection for Relay-style cursor pagination
 */
@ObjectType()
export class WholesaleOrderConnection {
  @Field(() => [WholesaleOrderEdge])
  edges!: WholesaleOrderEdge[];

  @Field(() => PageInfo)
  pageInfo!: PageInfo;

  @Field(() => Int)
  totalCount!: number;
}
