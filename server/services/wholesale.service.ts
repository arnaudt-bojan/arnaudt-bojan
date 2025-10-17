import type { IStorage } from '../storage';
import Papa from 'papaparse';
import { logger } from '../logger';
import crypto from 'crypto';
import type { NotificationService } from '../notifications';
import type { WholesaleCartValidationService } from './wholesale-cart-validation.service';
import type { CartReservationService } from './cart-reservation.service';
import type { InventoryService } from './inventory.service';
import { insertWholesaleProductSchema } from '@shared/schema';
import { fromZodError } from 'zod-validation-error';

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
  constructor(
    private storage: IStorage,
    private notificationService?: NotificationService,
    private wholesaleCartValidationService?: WholesaleCartValidationService,
    private cartReservationService?: CartReservationService,
    private inventoryService?: InventoryService
  ) {}

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

  async getBuyerCatalog(buyerId: string, sellerId?: string, filters?: any) {
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
      let allProducts: any[] = [];
      for (const grant of activeGrants) {
        const products = await this.storage.getWholesaleProductsBySellerId(grant.sellerId);
        allProducts.push(...products);
      }

      // Apply filters server-side (Architecture 3) with defensive checks
      if (filters) {
        allProducts = allProducts.filter(p => {
          // Search query
          if (filters.search && filters.search.trim()) {
            const query = filters.search.toLowerCase();
            const matchesSearch = 
              p.name.toLowerCase().includes(query) ||
              p.description.toLowerCase().includes(query) ||
              p.sku?.toLowerCase().includes(query) ||
              p.category.toLowerCase().includes(query);
            if (!matchesSearch) return false;
          }

          // Parse category levels
          const categoryParts = p.category.split('>').map((c: string) => c.trim());
          const [catL1, catL2, catL3] = categoryParts;

          // Category filters with defensive array checks
          const catL1Filters = filters.categoryL1 || [];
          const catL2Filters = filters.categoryL2 || [];
          const catL3Filters = filters.categoryL3 || [];
          
          if (catL1Filters.length > 0 && !catL1Filters.includes(catL1)) return false;
          if (catL2Filters.length > 0 && !catL2Filters.includes(catL2)) return false;
          if (catL3Filters.length > 0 && !catL3Filters.includes(catL3)) return false;

          // Price filter
          if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
            const price = parseFloat(p.wholesalePrice);
            if (filters.minPrice !== undefined && price < filters.minPrice) return false;
            if (filters.maxPrice !== undefined && price > filters.maxPrice) return false;
          }

          // MOQ filter
          if (filters.minMoq !== undefined && p.moq < filters.minMoq) return false;
          if (filters.maxMoq !== undefined && p.moq > filters.maxMoq) return false;

          // Deposit filter
          if (filters.requiresDeposit !== undefined) {
            const hasDeposit = p.requiresDeposit === 1;
            if (filters.requiresDeposit !== hasDeposit) return false;
          }

          // Stock filter (stock=0 means unlimited/made-to-order in B2B)
          if (filters.inStock && p.stock === 0) return false;

          // Payment terms filter with defensive array check
          const paymentTermsFilters = filters.paymentTerms || [];
          if (paymentTermsFilters.length > 0 && !paymentTermsFilters.includes(p.balancePaymentTerms || '')) return false;

          // Readiness type filter with defensive array check
          const readinessFilters = filters.readinessType || [];
          if (readinessFilters.length > 0 && !readinessFilters.includes(p.readinessType || '')) return false;

          return true;
        });

        // Apply sorting server-side
        allProducts.sort((a, b) => {
          switch (filters.sortBy) {
            case "price-low":
              return parseFloat(a.wholesalePrice) - parseFloat(b.wholesalePrice);
            case "price-high":
              return parseFloat(b.wholesalePrice) - parseFloat(a.wholesalePrice);
            case "moq-low":
              return a.moq - b.moq;
            case "moq-high":
              return b.moq - a.moq;
            case "margin-high": {
              const marginA = ((parseFloat(a.rrp) - parseFloat(a.wholesalePrice)) / parseFloat(a.rrp)) * 100;
              const marginB = ((parseFloat(b.rrp) - parseFloat(b.wholesalePrice)) / parseFloat(b.rrp)) * 100;
              return marginB - marginA;
            }
            case "newest":
            default:
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
        });
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
      // Step 1: Add sellerId to product data
      const dataWithSeller = {
        ...productData,
        sellerId: userId,
      };
      
      // Step 2: Sync image and images fields (match B2C pattern)
      // If images array is provided but no single image, use first image from array
      if (dataWithSeller.images && dataWithSeller.images.length > 0 && !dataWithSeller.image) {
        dataWithSeller.image = dataWithSeller.images[0];
      }
      // If single image is provided but no images array, create array with single image
      else if (dataWithSeller.image && (!dataWithSeller.images || dataWithSeller.images.length === 0)) {
        dataWithSeller.images = [dataWithSeller.image];
      }
      
      // Step 3: Validate with enhanced schema
      const validationResult = insertWholesaleProductSchema.safeParse(dataWithSeller);
      
      if (!validationResult.success) {
        const error = fromZodError(validationResult.error);
        logger.error("WholesaleService: Validation failed", { error: error.message });
        return { success: false, error: error.message };
      }
      
      // Step 4: Create product with validated data
      const product = await this.storage.createWholesaleProduct(validationResult.data);
      
      logger.info("WholesaleService: Product created successfully", { 
        productId: product.id, 
        sellerId: userId,
        imageCount: product.images?.length || 0
      });
      
      return { success: true, data: product };
    } catch (error: any) {
      logger.error("WholesaleService: Error creating product", error);
      return { 
        success: false, 
        error: error.message || "Failed to create wholesale product" 
      };
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
            depositAmount: depositNum ? (Math.round(depositNum * 100) / 100).toString() : undefined,
            requiresDeposit: parseInt(rawData.requiresDeposit.toString().replace(/[^0-9]/g, '')) || 0,
            readinessDays: rawData.readinessDays ? parseInt(rawData.readinessDays.toString().replace(/[^0-9]/g, '')) : undefined,
            status: 'active' as const,
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
      
      // Send confirmation emails to both seller and buyer
      if (this.notificationService) {
        try {
          const buyer = await this.storage.getUser(userId);
          const seller = await this.storage.getUser(invitation.sellerId);
          
          if (buyer && seller) {
            // Send confirmation to buyer
            await this.sendBuyerAcceptanceConfirmation(buyer, seller);
            
            // Send notification to seller
            await this.sendSellerAcceptanceNotification(seller, buyer);
          }
        } catch (emailError) {
          logger.error("WholesaleService: Failed to send acceptance confirmation emails", emailError);
          // Don't fail the whole operation if emails fail
        }
      }
      
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

  // ============================================================================
  // Wholesale Cart Methods
  // ============================================================================

  async addToCart(buyerId: string, itemData: any, currency?: string) {
    try {
      const { productId, quantity, variant } = itemData;

      // Validate product and MOQ using WholesaleCartValidationService
      if (this.wholesaleCartValidationService) {
        const validation = await this.wholesaleCartValidationService.validateProduct(
          productId,
          quantity,
          variant
        );

        if (!validation.valid) {
          return { 
            success: false, 
            error: validation.moqError || validation.error || 'Validation failed' 
          };
        }
      }

      // Get or create cart
      let cart = await this.storage.getWholesaleCart(buyerId);
      
      // Get product to determine seller
      const product = await this.storage.getWholesaleProduct(productId);
      if (!product) {
        return { success: false, error: "Product not found" };
      }

      if (!cart) {
        cart = await this.storage.createWholesaleCart(buyerId, product.sellerId, currency);
      }

      // Normalize variants to handle null/undefined/empty object equivalence
      const normalizeVariant = (v: any) => {
        if (!v || (typeof v === 'object' && Object.keys(v).length === 0)) {
          return null;
        }
        return v;
      };
      
      // Normalize ALL existing items first
      const items = ((cart.items as any[]) || []).map((item: any) => ({
        ...item,
        variant: normalizeVariant(item.variant)
      }));
      
      const normalizedVariant = normalizeVariant(variant);
      
      const existingItemIndex = items.findIndex((item: any) => {
        return item.productId === productId && 
               JSON.stringify(item.variant) === JSON.stringify(normalizedVariant);
      });

      const isNewItem = existingItemIndex < 0;
      const oldQuantity = existingItemIndex >= 0 ? items[existingItemIndex].quantity : 0;

      if (existingItemIndex >= 0) {
        items[existingItemIndex].quantity = quantity;
      } else {
        items.push({ productId, quantity, variant: normalizedVariant });
      }

      // Update cart (with currency if provided)
      const updatedCart = await this.storage.updateWholesaleCart(buyerId, items, currency);
      
      // Create/Update inventory reservation (30-min expiry for wholesale)
      if (this.inventoryService) {
        try {
          // Generate variant ID for inventory service
          const variantId = normalizedVariant 
            ? `${normalizedVariant.size || ''}-${normalizedVariant.color || ''}`.trim() || undefined
            : undefined;

          // Use buyerId as sessionId for wholesale (each buyer has one cart/session)
          const sessionId = `wholesale_${buyerId}`;

          // CRITICAL FIX: Use atomic pattern to prevent race conditions
          // Check for existing reservation first
          const sessionReservations = await this.storage.getStockReservationsBySession(sessionId);
          const existingReservation = sessionReservations.find(
            (r) =>
              r.status === 'active' &&
              r.productId === productId &&
              r.variantId === (variantId || null)
          );

          if (existingReservation) {
            // Update existing reservation atomically (prevents race condition)
            logger.info('[WholesaleService] Updating reservation atomically', {
              reservationId: existingReservation.id,
              productId,
              variantId,
              oldQuantity: existingReservation.quantity,
              newQuantity: quantity,
              sessionId,
            });

            const updateResult = await this.storage.updateReservationQuantityAtomic(
              existingReservation.id,
              quantity
            );

            if (!updateResult.success) {
              logger.error('[WholesaleService] Failed to update reservation atomically', {
                reservationId: existingReservation.id,
                error: updateResult.error,
              });
              // Note: We don't fail the cart add operation if reservation fails
              // The item is still added to cart, but without reservation
            } else {
              logger.info('[WholesaleService] Reservation updated atomically', {
                reservationId: existingReservation.id,
                newQuantity: quantity,
              });
            }
          } else {
            // Create new reservation (no existing reservation found)
            const reservationResult = await this.inventoryService.reserveStock(
              productId,
              quantity,
              sessionId,
              {
                variantId,
                userId: buyerId,
                expirationMinutes: 30, // 30-minute expiry for wholesale carts
              }
            );

            if (!reservationResult.success) {
              logger.error('[WholesaleService] Reservation failed', {
                productId,
                variantId,
                quantity,
                error: reservationResult.error,
              });
              // Note: We don't fail the cart add operation if reservation fails
              // The item is still added to cart, but without reservation
            } else {
              logger.info('[WholesaleService] Reservation created successfully', {
                productId,
                variantId,
                quantity,
                reservationId: reservationResult.reservation?.id,
                expiresAt: reservationResult.reservation?.expiresAt?.toISOString(),
              });
            }
          }
        } catch (reservationError) {
          logger.error('[WholesaleService] Error creating reservation', reservationError);
          // Don't fail cart operation if reservation fails
        }
      }
      
      return { success: true, data: updatedCart };
    } catch (error) {
      logger.error("WholesaleService: Error adding to cart", error);
      return { success: false, error: "Failed to add item to cart" };
    }
  }

  async getCart(buyerId: string) {
    try {
      const cart = await this.storage.getWholesaleCart(buyerId);
      
      if (!cart) {
        return { 
          success: true, 
          data: { buyerId, items: [], sellerId: null } 
        };
      }

      return { success: true, data: cart };
    } catch (error) {
      logger.error("WholesaleService: Error fetching cart", error);
      return { success: false, error: "Failed to fetch cart" };
    }
  }

  async updateCartItem(buyerId: string, itemData: any, currency?: string) {
    try {
      const { productId, variant, quantity } = itemData;

      const cart = await this.storage.getWholesaleCart(buyerId);
      if (!cart) {
        return { success: false, error: "Cart not found" };
      }

      // Get product to validate MOQ
      const product = await this.storage.getWholesaleProduct(productId);
      if (!product) {
        return { success: false, error: "Product not found" };
      }

      if (quantity < product.moq) {
        return { 
          success: false, 
          error: `Minimum order quantity is ${product.moq} units` 
        };
      }

      // Normalize variants
      const normalizeVariant = (v: any) => {
        if (!v || (typeof v === 'object' && Object.keys(v).length === 0)) {
          return null;
        }
        return v;
      };

      // Normalize all items
      const items = ((cart.items as any[]) || []).map((item: any) => ({
        ...item,
        variant: normalizeVariant(item.variant)
      }));

      const normalizedVariant = normalizeVariant(variant);
      
      const itemIndex = items.findIndex((item: any) => 
        item.productId === productId && 
        JSON.stringify(item.variant) === JSON.stringify(normalizedVariant)
      );

      if (itemIndex >= 0) {
        const oldQuantity = items[itemIndex].quantity;
        items[itemIndex].quantity = quantity;
        const updatedCart = await this.storage.updateWholesaleCart(buyerId, items, currency);

        // Update inventory reservation
        if (this.inventoryService && oldQuantity !== quantity) {
          try {
            const variantId = normalizedVariant 
              ? `${normalizedVariant.size || ''}-${normalizedVariant.color || ''}`.trim() || undefined
              : undefined;
            const sessionId = `wholesale_${buyerId}`;

            // CRITICAL FIX: Use atomic pattern to prevent race conditions
            // Check for existing reservation first
            const sessionReservations = await this.storage.getStockReservationsBySession(sessionId);
            const existingReservation = sessionReservations.find(
              (r) =>
                r.status === 'active' &&
                r.productId === productId &&
                r.variantId === (variantId || null)
            );

            if (existingReservation) {
              // Update existing reservation atomically (prevents race condition)
              logger.info('[WholesaleService] Updating reservation atomically for cart item', {
                reservationId: existingReservation.id,
                productId,
                variantId,
                oldQuantity,
                newQuantity: quantity,
              });

              const updateResult = await this.storage.updateReservationQuantityAtomic(
                existingReservation.id,
                quantity
              );

              if (!updateResult.success) {
                logger.error('[WholesaleService] Failed to update reservation atomically', {
                  reservationId: existingReservation.id,
                  error: updateResult.error,
                });
              } else {
                logger.info('[WholesaleService] Reservation updated atomically', {
                  reservationId: existingReservation.id,
                  newQuantity: quantity,
                });
              }
            } else {
              // Create new reservation if none exists
              const reservationResult = await this.inventoryService.reserveStock(
                productId,
                quantity,
                sessionId,
                {
                  variantId,
                  userId: buyerId,
                  expirationMinutes: 30,
                }
              );

              if (!reservationResult.success) {
                logger.error('[WholesaleService] Failed to create reservation', {
                  productId,
                  variantId,
                  error: reservationResult.error,
                });
              } else {
                logger.info('[WholesaleService] Reservation created successfully', {
                  productId,
                  variantId,
                  quantity,
                  reservationId: reservationResult.reservation?.id,
                });
              }
            }
          } catch (reservationError) {
            logger.error('[WholesaleService] Error updating reservation', reservationError);
          }
        }

        return { success: true, data: updatedCart };
      }

      return { success: false, error: "Item not found in cart" };
    } catch (error) {
      logger.error("WholesaleService: Error updating cart item", error);
      return { success: false, error: "Failed to update cart item" };
    }
  }

  async removeCartItem(buyerId: string, itemData: any, currency?: string) {
    try {
      const { productId, variant } = itemData;

      const cart = await this.storage.getWholesaleCart(buyerId);
      if (!cart) {
        return { success: false, error: "Cart not found" };
      }

      // Normalize variants
      const normalizeVariant = (v: any) => {
        if (!v || (typeof v === 'object' && Object.keys(v).length === 0)) {
          return null;
        }
        return v;
      };

      const normalizedVariant = normalizeVariant(variant);

      // Remove item from cart
      const items = ((cart.items as any[]) || []).filter((item: any) => {
        const itemVariant = normalizeVariant(item.variant);
        return !(item.productId === productId && 
                 JSON.stringify(itemVariant) === JSON.stringify(normalizedVariant));
      });

      const updatedCart = await this.storage.updateWholesaleCart(buyerId, items, currency);

      // Release inventory reservation for removed item
      if (this.inventoryService) {
        try {
          const variantId = normalizedVariant 
            ? `${normalizedVariant.size || ''}-${normalizedVariant.color || ''}`.trim() || undefined
            : undefined;
          const sessionId = `wholesale_${buyerId}`;

          logger.info('[WholesaleService] Releasing reservation for removed item', {
            productId,
            variantId,
            sessionId,
          });

          await this.releaseItemReservation(sessionId, productId, variantId);
        } catch (reservationError) {
          logger.error('[WholesaleService] Error releasing reservation', reservationError);
        }
      }

      return { success: true, data: updatedCart };
    } catch (error) {
      logger.error("WholesaleService: Error removing cart item", error);
      return { success: false, error: "Failed to remove cart item" };
    }
  }

  async clearCart(buyerId: string) {
    try {
      // Release all reservations before clearing cart
      if (this.cartReservationService) {
        try {
          const sessionId = `wholesale_${buyerId}`;
          logger.info('[WholesaleService] Releasing all reservations for cleared cart', {
            sessionId,
          });

          await this.cartReservationService.releaseSessionReservations(sessionId);
        } catch (reservationError) {
          logger.error('[WholesaleService] Error releasing reservations on cart clear', reservationError);
        }
      }

      await this.storage.clearWholesaleCart(buyerId);
      return { success: true };
    } catch (error) {
      logger.error("WholesaleService: Error clearing cart", error);
      return { success: false, error: "Failed to clear cart" };
    }
  }

  // ============================================================================
  // Private Helper Methods - Inventory Reservations
  // ============================================================================

  /**
   * Release reservation for a specific product/variant in a session
   * Helper method to release individual item reservations
   */
  private async releaseItemReservation(
    sessionId: string,
    productId: string,
    variantId?: string
  ): Promise<void> {
    if (!this.inventoryService) {
      return;
    }

    try {
      // Get all reservations for this session
      const reservations = await this.storage.getStockReservationsBySession(sessionId);

      // Find reservation(s) matching this product and variant
      const matchingReservations = reservations.filter((r: any) => {
        const reservationVariantId = r.variantId || undefined;
        return r.productId === productId && 
               r.status === 'active' &&
               reservationVariantId === variantId;
      });

      // Release each matching reservation
      for (const reservation of matchingReservations) {
        await this.inventoryService.releaseReservation(reservation.id);
        logger.info('[WholesaleService] Released item reservation', {
          reservationId: reservation.id,
          productId,
          variantId,
          sessionId,
        });
      }
    } catch (error) {
      logger.error('[WholesaleService] Error releasing item reservation', {
        productId,
        variantId,
        sessionId,
        error,
      });
      throw error;
    }
  }

  // ============================================================================
  // Wholesale Checkout with Inventory Reservation
  // ============================================================================

  /**
   * Process wholesale checkout with inventory reservation commit
   * This method creates the order and commits all cart reservations to actual inventory
   */
  async processCheckout(checkoutData: any) {
    const { buyerId, sellerId, cartItems } = checkoutData;
    const sessionId = `wholesale_${buyerId}`;

    try {
      logger.info('[WholesaleService] Starting checkout process', {
        buyerId,
        sellerId,
        itemCount: cartItems.length,
        sessionId,
      });

      // Step 1: Create wholesale order (this is delegated to WholesaleOrderService via route)
      // For now, we create a simple order - the route will handle the full order creation
      const orderNumber = `WO-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
      const order = await this.storage.createWholesaleOrder({
        sellerId,
        buyerId,
        orderNumber,
        subtotalCents: 0, // Will be calculated by route
        totalCents: 0,
        status: 'pending',
        currency: checkoutData.currency || 'USD',
        ...checkoutData,
      });

      logger.info('[WholesaleService] Order created', {
        orderId: order.id,
        orderNumber: order.orderNumber,
      });

      // Step 2: Commit inventory reservations to actual inventory
      if (this.inventoryService) {
        try {
          logger.info('[WholesaleService] Committing inventory reservations', {
            sessionId,
            orderId: order.id,
          });

          const commitResult = await this.inventoryService.commitReservationsBySession(
            sessionId,
            order.id
          );

          if (!commitResult.success) {
            logger.error('[WholesaleService] Failed to commit reservations', {
              sessionId,
              orderId: order.id,
              error: commitResult.error,
            });
            // Note: We don't fail the checkout if reservation commit fails
            // The order is already created, reservations will expire naturally
          } else {
            logger.info('[WholesaleService] Reservations committed successfully', {
              sessionId,
              orderId: order.id,
              committedCount: commitResult.committed,
            });
          }
        } catch (commitError: any) {
          logger.error('[WholesaleService] Error committing reservations', {
            orderId: order.id,
            error: commitError.message,
          });
          // Don't fail checkout if reservation commit fails
        }
      }

      return {
        success: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
      };
    } catch (error: any) {
      logger.error('[WholesaleService] Checkout failed', {
        buyerId,
        sellerId,
        error: error.message,
      });

      // Release reservations on checkout failure
      if (this.cartReservationService) {
        try {
          await this.cartReservationService.releaseSessionReservations(sessionId);
          logger.info('[WholesaleService] Released reservations after checkout failure', {
            sessionId,
          });
        } catch (releaseError: any) {
          logger.error('[WholesaleService] Failed to release reservations', {
            sessionId,
            error: releaseError.message,
          });
        }
      }

      return {
        success: false,
        error: error.message || 'Checkout failed',
        statusCode: 500,
      };
    }
  }

  // ============================================================================
  // Email Confirmation Methods
  // ============================================================================

  private async sendBuyerAcceptanceConfirmation(buyer: any, seller: any) {
    const sellerName = seller.firstName || seller.username || 'the seller';
    const buyerName = buyer.email;
    
    const catalogUrl = `${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000'}/wholesale/catalog`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Wholesale Access Confirmed</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
            <tr>
              <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                  <tr>
                    <td style="padding: 40px; background-color: #000000; border-radius: 8px 8px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; text-align: center;">UPPFIRST</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">Wholesale Access Confirmed</h2>
                      <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                        Great news! Your wholesale invitation from <strong>${sellerName}</strong> has been accepted.
                      </p>
                      <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                        You now have access to their wholesale catalog and can start placing orders.
                      </p>
                      <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                        <tr>
                          <td style="border-radius: 6px; background-color: #000000;">
                            <a href="${catalogUrl}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                              Browse Wholesale Catalog
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                      <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
                        © ${new Date().getFullYear()} UPPFIRST. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
    
    await this.notificationService!.sendEmail({
      to: buyer.email,
      subject: `Wholesale Access Confirmed - ${sellerName}`,
      html: emailHtml,
    });
    
    logger.info("WholesaleService: Buyer confirmation email sent", { buyerEmail: buyer.email });
  }

  private async sendSellerAcceptanceNotification(seller: any, buyer: any) {
    const sellerName = seller.firstName || seller.username || 'Seller';
    const buyerEmail = buyer.email;
    
    const ordersUrl = `${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000'}/wholesale/orders`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Wholesale Buyer</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
            <tr>
              <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                  <tr>
                    <td style="padding: 40px; background-color: #000000; border-radius: 8px 8px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; text-align: center;">UPPFIRST</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">New Wholesale Buyer Joined</h2>
                      <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                        Great news! <strong>${buyerEmail}</strong> has accepted your wholesale invitation.
                      </p>
                      <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                        They now have access to your wholesale catalog and can start placing orders.
                      </p>
                      <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                        <tr>
                          <td style="border-radius: 6px; background-color: #000000;">
                            <a href="${ordersUrl}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                              View Wholesale Orders
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                      <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
                        © ${new Date().getFullYear()} UPPFIRST. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
    
    await this.notificationService!.sendEmail({
      to: seller.email,
      subject: `New Wholesale Buyer - ${buyerEmail}`,
      html: emailHtml,
    });
    
    logger.info("WholesaleService: Seller notification email sent", { sellerEmail: seller.email });
  }
}
