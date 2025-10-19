import { SellerLoader } from '../common/dataloaders/seller.loader';

export interface GraphQLContext {
  req: any;
  sellerLoader: SellerLoader;
}
