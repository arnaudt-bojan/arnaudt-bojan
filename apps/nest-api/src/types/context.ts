import { SellerLoader } from '../common/dataloaders/seller.loader';
import { BuyerLoader } from '../common/dataloaders/buyer.loader';

export interface GraphQLContext {
  req: any;
  sellerLoader: SellerLoader;
  buyerLoader: BuyerLoader;
}
