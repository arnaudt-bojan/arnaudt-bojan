import { Module } from '@nestjs/common';
import { SellerLoader } from './seller.loader';
import { BuyerLoader } from './buyer.loader';
import { OrderItemsLoader } from './order-items.loader';
import { WholesaleOrderItemsLoader } from './wholesale-order-items.loader';
import { WholesaleOrderEventsLoader } from './wholesale-order-events.loader';
import { QuotationLineItemsLoader } from './quotation-line-items.loader';
import { QuotationActivitiesLoader } from './quotation-activities.loader';
import { QuotationPaymentsLoader } from './quotation-payments.loader';
import { PrismaModule } from '../../modules/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [
    SellerLoader,
    BuyerLoader,
    OrderItemsLoader,
    WholesaleOrderItemsLoader,
    WholesaleOrderEventsLoader,
    QuotationLineItemsLoader,
    QuotationActivitiesLoader,
    QuotationPaymentsLoader,
  ],
  exports: [
    SellerLoader,
    BuyerLoader,
    OrderItemsLoader,
    WholesaleOrderItemsLoader,
    WholesaleOrderEventsLoader,
    QuotationLineItemsLoader,
    QuotationActivitiesLoader,
    QuotationPaymentsLoader,
  ],
})
export class DataloaderModule {}
