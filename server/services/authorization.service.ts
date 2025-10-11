import { IStorage } from '../storage';
import {
  User,
  UserStoreMembership,
  WholesaleAccessGrant,
  Product,
  Order,
} from '@shared/schema';

export type Capability =
  // Storefront Management
  | 'view_storefront'
  | 'edit_store_settings'
  | 'edit_store_settings_limited'
  | 'upload_store_media'
  | 'manage_about_contact'
  // Product Management
  | 'create_products'
  | 'edit_products'
  | 'delete_products'
  | 'import_products'
  | 'create_wholesale_products'
  // Order Management
  | 'view_orders'
  | 'fulfill_orders'
  | 'process_refunds'
  | 'update_tracking'
  // Purchasing
  | 'purchase_retail'
  | 'purchase_wholesale'
  | 'guest_checkout'
  // Team Management
  | 'invite_collaborators'
  | 'remove_collaborators'
  // Wholesale Management
  | 'invite_wholesale_buyers'
  | 'manage_wholesale_invites'
  // Payment & Financial
  | 'connect_stripe'
  | 'manage_subscription'
  | 'view_analytics'
  | 'view_analytics_readonly'
  // Platform Admin
  | 'view_all_sellers'
  | 'platform_analytics';

export interface IAuthorizationService {
  hasCapability(userId: string, capability: Capability, resourceId?: string): Promise<boolean>;
  canAccessStore(userId: string, storeOwnerId: string): Promise<boolean>;
  canManageProduct(userId: string, productId: string): Promise<boolean>;
  canViewOrder(userId: string, orderId: string): Promise<boolean>;
  canPurchase(userId: string, productType: 'retail' | 'wholesale', sellerId?: string): Promise<boolean>;
  
  getUserCapabilities(userId: string): Promise<Capability[]>;
  getStoreMemberships(userId: string): Promise<UserStoreMembership[]>;
  getWholesaleAccess(userId: string): Promise<WholesaleAccessGrant[]>;
}

export class AuthorizationService implements IAuthorizationService {
  constructor(private storage: IStorage) {}

  async hasCapability(userId: string, capability: Capability, resourceId?: string): Promise<boolean> {
    const user = await this.storage.getUser(userId);
    if (!user) return false;

    if (user.isPlatformAdmin === 1) {
      return true;
    }

    const userType = user.userType;
    
    if (!userType) return false;

    switch (capability) {
      case 'view_storefront':
        if (userType === 'seller') {
          return true;
        }
        if (userType === 'collaborator' && resourceId) {
          const membership = await this.storage.getUserStoreMembership(userId, resourceId);
          return !!membership && membership.status === 'active';
        }
        return false;

      case 'edit_store_settings':
        return userType === 'seller';

      case 'edit_store_settings_limited':
        if (userType === 'seller') return true;
        if (userType === 'collaborator' && resourceId) {
          const membership = await this.storage.getUserStoreMembership(userId, resourceId);
          return !!membership && membership.status === 'active';
        }
        return false;

      case 'upload_store_media':
      case 'manage_about_contact':
        if (userType === 'seller') return true;
        if (userType === 'collaborator' && resourceId) {
          const membership = await this.storage.getUserStoreMembership(userId, resourceId);
          return !!membership && membership.status === 'active';
        }
        return false;

      case 'create_products':
      case 'edit_products':
      case 'delete_products':
      case 'import_products':
      case 'create_wholesale_products':
        if (userType === 'seller') return true;
        if (userType === 'collaborator' && resourceId) {
          const membership = await this.storage.getUserStoreMembership(userId, resourceId);
          if (!membership || membership.status !== 'active') return false;
          const caps = membership.capabilities as any;
          return caps?.manageProducts === true;
        }
        return false;

      case 'view_orders':
        if (userType === 'seller') return true;
        if (userType === 'buyer') return true;
        if (userType === 'collaborator' && resourceId) {
          const membership = await this.storage.getUserStoreMembership(userId, resourceId);
          if (!membership || membership.status !== 'active') return false;
          const caps = membership.capabilities as any;
          return caps?.manageOrders === true;
        }
        return false;

      case 'fulfill_orders':
      case 'process_refunds':
      case 'update_tracking':
        if (userType === 'seller') return true;
        if (userType === 'collaborator' && resourceId) {
          const membership = await this.storage.getUserStoreMembership(userId, resourceId);
          if (!membership || membership.status !== 'active') return false;
          const caps = membership.capabilities as any;
          return caps?.manageOrders === true;
        }
        return false;

      case 'purchase_retail':
      case 'guest_checkout':
        return userType === 'buyer';

      case 'purchase_wholesale':
        if (userType !== 'buyer') return false;
        if (!resourceId) return false;
        const grant = await this.storage.getWholesaleAccessGrant(userId, resourceId);
        return !!grant && grant.status === 'active';

      case 'invite_collaborators':
      case 'remove_collaborators':
      case 'invite_wholesale_buyers':
      case 'manage_wholesale_invites':
      case 'connect_stripe':
      case 'manage_subscription':
        return userType === 'seller';

      case 'view_analytics':
        return userType === 'seller';

      case 'view_analytics_readonly':
        if (userType === 'seller') return true;
        if (userType === 'collaborator' && resourceId) {
          const membership = await this.storage.getUserStoreMembership(userId, resourceId);
          if (!membership || membership.status !== 'active') return false;
          const caps = membership.capabilities as any;
          return caps?.viewAnalytics === true;
        }
        return false;

      case 'view_all_sellers':
      case 'platform_analytics':
        return user.isPlatformAdmin === 1;

      default:
        return false;
    }
  }

  async canAccessStore(userId: string, storeOwnerId: string): Promise<boolean> {
    const user = await this.storage.getUser(userId);
    if (!user) return false;

    if (user.isPlatformAdmin === 1) return true;

    if (user.id === storeOwnerId && user.userType === 'seller') {
      return true;
    }

    if (user.userType === 'collaborator') {
      const membership = await this.storage.getUserStoreMembership(userId, storeOwnerId);
      return !!membership && membership.status === 'active';
    }

    return false;
  }

  async canManageProduct(userId: string, productId: string): Promise<boolean> {
    const user = await this.storage.getUser(userId);
    if (!user) return false;

    if (user.isPlatformAdmin === 1) return true;

    const product = await this.storage.getProduct(productId);
    if (!product) return false;

    if (user.id === product.sellerId && user.userType === 'seller') {
      return true;
    }

    if (user.userType === 'collaborator') {
      const membership = await this.storage.getUserStoreMembership(userId, product.sellerId);
      if (!membership || membership.status !== 'active') return false;
      const caps = membership.capabilities as any;
      return caps?.manageProducts === true;
    }

    return false;
  }

  async canViewOrder(userId: string, orderId: string): Promise<boolean> {
    const user = await this.storage.getUser(userId);
    if (!user) return false;

    if (user.isPlatformAdmin === 1) return true;

    const order = await this.storage.getOrder(orderId);
    if (!order) return false;

    if (user.userType === 'buyer' && order.userId === userId) {
      return true;
    }

    const orderItems = await this.storage.getOrderItems(orderId);
    if (!orderItems || orderItems.length === 0) return false;

    const firstProduct = await this.storage.getProduct(orderItems[0].productId);
    if (!firstProduct) return false;

    const sellerId = firstProduct.sellerId;

    if (user.userType === 'seller' && sellerId === userId) {
      return true;
    }

    if (user.userType === 'collaborator') {
      const membership = await this.storage.getUserStoreMembership(userId, sellerId);
      if (!membership || membership.status !== 'active') return false;
      const caps = membership.capabilities as any;
      return caps?.manageOrders === true;
    }

    return false;
  }

  async canPurchase(userId: string, productType: 'retail' | 'wholesale', sellerId?: string): Promise<boolean> {
    const user = await this.storage.getUser(userId);
    if (!user) return false;

    if (user.userType !== 'buyer') {
      return false;
    }

    if (productType === 'retail') {
      return true;
    }

    if (productType === 'wholesale') {
      if (!sellerId) return false;
      const grant = await this.storage.getWholesaleAccessGrant(userId, sellerId);
      return !!grant && grant.status === 'active';
    }

    return false;
  }

  async getUserCapabilities(userId: string): Promise<Capability[]> {
    const user = await this.storage.getUser(userId);
    if (!user) return [];

    if (user.isPlatformAdmin === 1) {
      return ['view_all_sellers', 'platform_analytics'];
    }

    const capabilities: Capability[] = [];
    const userType = user.userType;

    if (!userType) return [];

    switch (userType) {
      case 'seller':
        capabilities.push(
          'view_storefront',
          'edit_store_settings',
          'upload_store_media',
          'manage_about_contact',
          'create_products',
          'edit_products',
          'delete_products',
          'import_products',
          'create_wholesale_products',
          'view_orders',
          'fulfill_orders',
          'process_refunds',
          'update_tracking',
          'invite_collaborators',
          'remove_collaborators',
          'invite_wholesale_buyers',
          'manage_wholesale_invites',
          'connect_stripe',
          'manage_subscription',
          'view_analytics'
        );
        break;

      case 'buyer':
        capabilities.push(
          'purchase_retail',
          'guest_checkout',
          'view_orders'
        );
        
        const grants = await this.storage.getWholesaleAccessGrantsByBuyer(userId);
        if (grants.length > 0) {
          capabilities.push('purchase_wholesale');
        }
        break;

      case 'collaborator':
        const memberships = await this.storage.getUserStoreMembershipsByUser(userId);
        if (memberships.length > 0) {
          capabilities.push(
            'view_storefront',
            'edit_store_settings_limited',
            'upload_store_media',
            'manage_about_contact'
          );
          
          const hasProductManagement = memberships.some(m => {
            const caps = m.capabilities as any;
            return caps?.manageProducts === true;
          });
          
          if (hasProductManagement) {
            capabilities.push(
              'create_products',
              'edit_products',
              'delete_products',
              'import_products',
              'create_wholesale_products'
            );
          }

          const hasOrderManagement = memberships.some(m => {
            const caps = m.capabilities as any;
            return caps?.manageOrders === true;
          });

          if (hasOrderManagement) {
            capabilities.push(
              'view_orders',
              'fulfill_orders',
              'process_refunds',
              'update_tracking'
            );
          }

          const hasAnalytics = memberships.some(m => {
            const caps = m.capabilities as any;
            return caps?.viewAnalytics === true;
          });

          if (hasAnalytics) {
            capabilities.push('view_analytics_readonly');
          }
        }
        break;
    }

    return capabilities;
  }

  async getStoreMemberships(userId: string): Promise<UserStoreMembership[]> {
    return await this.storage.getUserStoreMembershipsByUser(userId);
  }

  async getWholesaleAccess(userId: string): Promise<WholesaleAccessGrant[]> {
    return await this.storage.getWholesaleAccessGrantsByBuyer(userId);
  }
}
