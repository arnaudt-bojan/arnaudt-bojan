import { SellerLoader } from '../common/dataloaders/seller.loader';
import { BuyerLoader } from '../common/dataloaders/buyer.loader';
import { UserLoader } from '../common/dataloaders/user.loader';
import { BuyerProfileLoader } from '../common/dataloaders/buyer-profile.loader';
import { OrderItemsLoader } from '../common/dataloaders/order-items.loader';
import { WholesaleOrderItemsLoader } from '../common/dataloaders/wholesale-order-items.loader';
import { WholesaleOrderEventsLoader } from '../common/dataloaders/wholesale-order-events.loader';
import { QuotationLineItemsLoader } from '../common/dataloaders/quotation-line-items.loader';
import { QuotationActivitiesLoader } from '../common/dataloaders/quotation-activities.loader';
import { QuotationPaymentsLoader } from '../common/dataloaders/quotation-payments.loader';

export interface GraphQLContext {
  req: any;
  sellerLoader: SellerLoader;
  buyerLoader: BuyerLoader;
  userLoader: UserLoader;
  buyerProfileLoader: BuyerProfileLoader;
  orderItemsLoader: OrderItemsLoader;
  wholesaleOrderItemsLoader: WholesaleOrderItemsLoader;
  wholesaleOrderEventsLoader: WholesaleOrderEventsLoader;
  quotationLineItemsLoader: QuotationLineItemsLoader;
  quotationActivitiesLoader: QuotationActivitiesLoader;
  quotationPaymentsLoader: QuotationPaymentsLoader;
}
