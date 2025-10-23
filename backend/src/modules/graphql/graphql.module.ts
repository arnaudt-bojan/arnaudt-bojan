import { Module } from '@nestjs/common';
import { GraphQLModule as NestGraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { SellerLoader } from '../../common/dataloaders/seller.loader';
import { BuyerLoader } from '../../common/dataloaders/buyer.loader';
import { UserLoader } from '../../common/dataloaders/user.loader';
import { BuyerProfileLoader } from '../../common/dataloaders/buyer-profile.loader';
import { OrderItemsLoader } from '../../common/dataloaders/order-items.loader';
import { WholesaleOrderItemsLoader } from '../../common/dataloaders/wholesale-order-items.loader';
import { WholesaleOrderEventsLoader } from '../../common/dataloaders/wholesale-order-events.loader';
import { QuotationLineItemsLoader } from '../../common/dataloaders/quotation-line-items.loader';
import { QuotationActivitiesLoader } from '../../common/dataloaders/quotation-activities.loader';
import { QuotationPaymentsLoader } from '../../common/dataloaders/quotation-payments.loader';
import { DataloaderModule } from '../../common/dataloaders/dataloader.module';

@Module({
  imports: [
    DataloaderModule,
    NestGraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [DataloaderModule],
      inject: [
        SellerLoader,
        BuyerLoader,
        UserLoader,
        BuyerProfileLoader,
        OrderItemsLoader,
        WholesaleOrderItemsLoader,
        WholesaleOrderEventsLoader,
        QuotationLineItemsLoader,
        QuotationActivitiesLoader,
        QuotationPaymentsLoader,
      ],
      useFactory: (
        sellerLoader: SellerLoader,
        buyerLoader: BuyerLoader,
        userLoader: UserLoader,
        buyerProfileLoader: BuyerProfileLoader,
        orderItemsLoader: OrderItemsLoader,
        wholesaleOrderItemsLoader: WholesaleOrderItemsLoader,
        wholesaleOrderEventsLoader: WholesaleOrderEventsLoader,
        quotationLineItemsLoader: QuotationLineItemsLoader,
        quotationActivitiesLoader: QuotationActivitiesLoader,
        quotationPaymentsLoader: QuotationPaymentsLoader,
      ) => ({
        typePaths: [join(__dirname, '../../../../../docs/graphql-schema.graphql')],
        playground: true,
        introspection: true,
        autoSchemaFile: false,
        sortSchema: false,
        path: '/graphql',
        context: ({ req }) => ({
          req,
          sellerLoader,
          buyerLoader,
          userLoader,
          buyerProfileLoader,
          orderItemsLoader,
          wholesaleOrderItemsLoader,
          wholesaleOrderEventsLoader,
          quotationLineItemsLoader,
          quotationActivitiesLoader,
          quotationPaymentsLoader,
        }),
      }),
    }),
  ],
})
export class GraphQLConfigModule {}
