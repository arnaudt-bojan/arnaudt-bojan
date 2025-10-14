import type { IStorage } from '../storage';
import Papa from 'papaparse';
import { logger } from '../logger';
import crypto from 'crypto';

interface BulkUploadInput {
  userId: string;
  fileContent: string;
}

interface UpdateProductInput {
  productId: string;
  userId: string;
  updates: any;
}

interface DeleteProductInput {
  productId: string;
  userId: string;
}

interface AcceptInvitationInput {
  token: string;
  userId: string;
}

interface GetBuyerProductInput {
  productId: string;
  userId: string;
}

export class WholesaleService {
  constructor(private storage: IStorage) {}

  // ============================================================================
  // Wholesale Products
  // ============================================================================

  async getAllProducts() {
    try {
      const products = await this.storage.getAllWholesaleProducts();
      return { success: true, data: products };
    } catch (error) {
      logger.error("WholesaleService: Error fetching all products", error);
      return { success: false, error: "Failed to fetch wholesale products" };
    }
  }

  async getProductsBySellerId(sellerId: string) {
    try {
      const products = await this.storage.getWholesaleProductsBySellerId(sellerId);
      return { success: true, data: products };
    } catch (error) {
      logger.error("WholesaleService: Error fetching seller products", error);
      return { success: false, error: "Failed to fetch seller wholesale products" };
    }
  }

  async getBuyerCatalog(buyerId: string, sellerId?: string) {
    try {
      // Get all wholesale access grants for this buyer
      const grants = await this.storage.getWholesaleAccessGrantsByBuyer(buyerId);
      
      if (!grants || grants.length === 0) {
        return { success: true, data: [] };
      }

      // Filter by sellerId if provided
      const activeGrants = grants.filter(g => 
        g.status === 'active' && (!sellerId || g.sellerId === sellerId)
      );

      if (activeGrants.length === 0) {
        return { success: true, data: [] };
      }

      // Get products from all sellers the buyer has access to
      const allProducts: any[] = [];
      for (const grant of activeGrants) {
        const products = await this.storage.getWholesaleProductsBySellerId(grant.sellerId);
        allProducts.push(...products);
      }

      return { success: true, data: allProducts };
    } catch (error) {
      logger.error("WholesaleService: Error fetching buyer catalog", error);
      return { success: false, error: "Failed to fetch wholesale catalog" };
    }
  }

  async getProduct(productId: string) {
    try {
      const product = await this.storage.getWholesaleProduct(productId);
      if (!product) {
        return { success: false, error: "Wholesale product not found", statusCode: 404 };
      }
      return { success: true, data: product };
    } catch (error) {
      logger.error("WholesaleService: Error fetching product", error);
      return { success: false, error: "Failed to fetch wholesale product", statusCode: 500 };
    }
  }

  async createProduct(productData: any, userId: string) {
    try {
      const dataWithSeller = {
        ...productData,
        sellerId: userId,
      };
      
      const product = await this.storage.createWholesaleProduct(dataWithSeller);
      return { success: true, data: product };
    } catch (error) {
      logger.error("WholesaleService: Error creating product", error);
      return { success: false, error: "Failed to create wholesale product" };
    }
  }

  async bulkUploadProducts(input: BulkUploadInput) {
    try {
      const { userId, fileContent } = input;

      // Parse CSV using papaparse
      const parsed = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0) {
        return {
          success: false,
          error: "CSV parsing failed",
          details: parsed.errors,
        };
      }

      const products = parsed.data as any[];
      const created: any[] = [];
      const errors: any[] = [];

      // Process each row
      for (let i = 0; i < products.length; i++) {
        const row = products[i];
        
        try {
          // Map and coerce CSV columns to product data with proper types
          const rawData = {
            sellerId: userId,
            name: (row['Name'] || row['name'] || '').trim(),
            description: (row['Description'] || row['description'] || '').trim(),
            image: (row['Image URL'] || row['image'] || row['Image'] || '').trim(),
            category: (row['Category'] || row['category'] || '').trim(),
            rrp: row['RRP'] || row['rrp'],
            wholesalePrice: row['Wholesale Price'] || row['wholesalePrice'] || row['wholesale_price'],
            moq: row['MOQ'] || row['moq'],
            stock: row['Stock'] || row['stock'] || '0',
            depositAmount: row['Deposit Amount'] || row['depositAmount'] || null,
            requiresDeposit: row['Requires Deposit'] || row['requiresDeposit'] || '0',
            readinessDays: row['Readiness Days'] || row['readinessDays'] || null,
          };

          // Validate required fields first
          if (!rawData.name || !rawData.description || !rawData.image || 
              !rawData.category || !rawData.rrp || !rawData.wholesalePrice || !rawData.moq) {
            errors.push({
              row: i + 2, // +2 because header is row 1
              error: "Missing required fields",
              data: row
            });
            continue;
          }

          // Convert to proper numeric types (round to 2 decimals for prices)
          const rrpNum = parseFloat(rawData.rrp.toString().replace(/[^0-9.]/g, ''));
          const wholesalePriceNum = parseFloat(rawData.wholesalePrice.toString().replace(/[^0-9.]/g, ''));
          const depositNum = rawData.depositAmount ? parseFloat(rawData.depositAmount.toString().replace(/[^0-9.]/g, '')) : null;
          
          const productData = {
            sellerId: rawData.sellerId,
            name: rawData.name,
            description: rawData.description,
            image: rawData.image,
            category: rawData.category,
            rrp: (Math.round(rrpNum * 100) / 100).toString(), // Convert to 2 decimal string for schema
            wholesalePrice: (Math.round(wholesalePriceNum * 100) / 100).toString(),
            moq: parseInt(rawData.moq.toString().replace(/[^0-9]/g, '')) || 1,
            stock: parseInt(rawData.stock.toString().replace(/[^0-9]/g, '')) || 0,
            depositAmount: depositNum ? (Math.round(depositNum * 100) / 100).toString() : null,
            requiresDeposit: parseInt(rawData.requiresDeposit.toString().replace(/[^0-9]/g, '')) || 0,
            readinessDays: rawData.readinessDays ? parseInt(rawData.readinessDays.toString().replace(/[^0-9]/g, '')) : null,
          };

          // Validate numeric conversions
          if (isNaN(rrpNum) || isNaN(wholesalePriceNum) || isNaN(productData.moq) || productData.moq < 1) {
            errors.push({
              row: i + 2,
              error: "Invalid numeric values for RRP, Wholesale Price, or MOQ",
              data: row
            });
            continue;
          }

          const product = await this.storage.createWholesaleProduct(productData);
          created.push(product);
        } catch (error: any) {
          errors.push({
            row: i + 2,
            error: error.message || "Failed to create product",
            data: row
          });
        }
      }

      return {
        success: true,
        data: {
          created: created.length,
          errors: errors.length > 0 ? errors : undefined,
          message: `Successfully created ${created.length} products${errors.length > 0 ? `, ${errors.length} errors` : ''}`,
        },
      };
    } catch (error: any) {
      logger.error("WholesaleService: Bulk upload error", error);
      return {
        success: false,
        error: error.message || "Bulk upload failed",
      };
    }
  }

  async updateProduct(input: UpdateProductInput) {
    try {
      const { productId, userId, updates } = input;
      
      const existingProduct = await this.storage.getWholesaleProduct(productId);
      if (!existingProduct) {
        return { success: false, error: "Wholesale product not found" };
      }
      
      if (existingProduct.sellerId !== userId) {
        return { success: false, error: "Unauthorized to update this product" };
      }

      const updatedProduct = await this.storage.updateWholesaleProduct(productId, updates);
      return { success: true, data: updatedProduct };
    } catch (error) {
      logger.error("WholesaleService: Error updating product", error);
      return { success: false, error: "Failed to update wholesale product" };
    }
  }

  async deleteProduct(input: DeleteProductInput) {
    try {
      const { productId, userId } = input;
      
      const existingProduct = await this.storage.getWholesaleProduct(productId);
      if (!existingProduct) {
        return { success: false, error: "Wholesale product not found" };
      }
      
      if (existingProduct.sellerId !== userId) {
        return { success: false, error: "Unauthorized to delete this product" };
      }

      await this.storage.deleteWholesaleProduct(productId);
      return { success: true, data: { message: "Wholesale product deleted successfully" } };
    } catch (error) {
      logger.error("WholesaleService: Error deleting product", error);
      return { success: false, error: "Failed to delete wholesale product" };
    }
  }

  // ============================================================================
  // Wholesale Invitations
  // ============================================================================

  async getInvitationsBySeller(sellerId: string) {
    try {
      const invitations = await this.storage.getWholesaleInvitationsBySellerId(sellerId);
      return { success: true, data: invitations };
    } catch (error) {
      logger.error("WholesaleService: Error fetching invitations", error);
      return { success: false, error: "Failed to fetch wholesale invitations" };
    }
  }

  async createInvitation(invitationData: any, sellerId: string) {
    try {
      // Generate secure random token for invitation URL
      const token = crypto.randomBytes(32).toString('hex');
      
      // Set expiration to 7 days from now
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      const dataWithSeller = {
        ...invitationData,
        sellerId,
        token,
        expiresAt,
        status: invitationData.status || 'pending',
      };

      const invitation = await this.storage.createWholesaleInvitation(dataWithSeller);
      return { success: true, data: invitation };
    } catch (error) {
      logger.error("WholesaleService: Error creating invitation", error);
      return { success: false, error: "Failed to create wholesale invitation" };
    }
  }

  async getInvitationByToken(token: string) {
    try {
      const invitation = await this.storage.getWholesaleInvitationByToken(token);
      if (!invitation) {
        return { success: false, error: "Invitation not found" };
      }
      return { success: true, data: invitation };
    } catch (error) {
      logger.error("WholesaleService: Error fetching invitation", error);
      return { success: false, error: "Failed to fetch wholesale invitation" };
    }
  }

  async acceptInvitation(input: AcceptInvitationInput) {
    try {
      const { token, userId } = input;
      
      const invitation = await this.storage.getWholesaleInvitationByToken(token);
      if (!invitation) {
        return { success: false, error: "Invitation not found" };
      }
      
      if (invitation.status !== "pending") {
        return { success: false, error: "Invitation has already been processed" };
      }

      const updated = await this.storage.acceptWholesaleInvitation(token, userId);
      return { success: true, data: updated };
    } catch (error) {
      logger.error("WholesaleService: Error accepting invitation", error);
      return { success: false, error: "Failed to accept wholesale invitation" };
    }
  }

  async deleteInvitation(invitationId: string) {
    try {
      await this.storage.deleteWholesaleInvitation(invitationId);
      return { success: true, data: { message: "Wholesale invitation deleted successfully" } };
    } catch (error) {
      logger.error("WholesaleService: Error deleting invitation", error);
      return { success: false, error: "Failed to delete wholesale invitation" };
    }
  }

  // ============================================================================
  // Wholesale Buyer Access
  // ============================================================================

  async checkBuyerAccess(userId: string) {
    try {
      const user = await this.storage.getUser(userId);
      
      if (!user || !user.email) {
        return { success: true, data: { hasAccess: false } };
      }

      // Check if user has any accepted invitations
      const allInvitations = await this.storage.getAllWholesaleInvitations();
      const hasAcceptedInvitations = allInvitations.some(
        inv => inv.buyerEmail === user.email && inv.status === "accepted"
      );

      return { success: true, data: { hasAccess: hasAcceptedInvitations } };
    } catch (error) {
      logger.error("WholesaleService: Error checking buyer access", error);
      return { success: false, error: "Failed to check wholesale access" };
    }
  }

  async getBuyerCatalog(userId: string) {
    try {
      const user = await this.storage.getUser(userId);
      
      if (!user || !user.email) {
        return { success: false, error: "User not found" };
      }

      // Check if user has any accepted invitations
      const allInvitations = await this.storage.getAllWholesaleInvitations();
      const userInvitations = allInvitations.filter(
        inv => inv.buyerEmail === user.email && inv.status === "accepted"
      );

      if (userInvitations.length === 0) {
        // No invitations - return empty catalog
        return { success: true, data: [] };
      }

      // Get all wholesale products from sellers who invited this buyer
      const sellerIds = userInvitations.map(inv => inv.sellerId);
      const allProducts = await this.storage.getAllWholesaleProducts();
      const invitedProducts = allProducts.filter(p => sellerIds.includes(p.sellerId));

      return { success: true, data: invitedProducts };
    } catch (error) {
      logger.error("WholesaleService: Error fetching buyer catalog", error);
      return { success: false, error: "Failed to fetch catalog" };
    }
  }

  async getBuyerProduct(input: GetBuyerProductInput) {
    try {
      const { productId, userId } = input;
      
      const user = await this.storage.getUser(userId);
      if (!user || !user.email) {
        return { success: false, error: "User not found" };
      }

      // Get the product
      const product = await this.storage.getWholesaleProduct(productId);
      if (!product) {
        return { success: false, error: "Product not found" };
      }

      // Check if user has accepted invitation from this seller
      const allInvitations = await this.storage.getAllWholesaleInvitations();
      const hasInvitation = allInvitations.some(
        inv => inv.buyerEmail === user.email && 
               inv.sellerId === product.sellerId && 
               inv.status === "accepted"
      );

      if (!hasInvitation) {
        return { success: false, error: "Access denied. Invitation required." };
      }

      return { success: true, data: product };
    } catch (error) {
      logger.error("WholesaleService: Error fetching buyer product", error);
      return { success: false, error: "Failed to fetch product" };
    }
  }
}
