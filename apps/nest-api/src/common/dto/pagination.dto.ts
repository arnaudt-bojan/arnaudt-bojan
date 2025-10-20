import { Field, ObjectType, Int, ArgsType } from '@nestjs/graphql';
import { IsOptional, IsInt, Min, Max } from 'class-validator';

/**
 * Relay-style cursor pagination arguments
 * Follows the pattern from OrderDomainService
 */
@ArgsType()
export class ConnectionArgs {
  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  first?: number = 20;

  @Field({ nullable: true })
  @IsOptional()
  after?: string;
}

/**
 * Relay-style page info for cursor pagination
 */
@ObjectType()
export class PageInfo {
  @Field()
  hasNextPage!: boolean;

  @Field()
  hasPreviousPage!: boolean;

  @Field({ nullable: true })
  startCursor?: string | null;

  @Field({ nullable: true })
  endCursor?: string | null;
}
