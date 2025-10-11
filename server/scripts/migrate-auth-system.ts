import { storage } from "../storage";
import { logger } from "../logger";

/**
 * Migration script to convert existing users to the new auth system
 * 
 * Mapping:
 * - role: "admin", "owner", "editor", "seller" → userType: "seller"
 * - role: "viewer" → userType: "collaborator" (needs store membership)
 * - role: "buyer" → userType: "buyer"
 */

export async function migrateAuthSystem() {
  logger.info('Starting auth system migration...');

  try {
    // Get all users
    const allUsers = await storage.getAllUsers();
    logger.info(`Found ${allUsers.length} users to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of allUsers) {
      try {
        // Skip if user already has userType set
        if (user.userType) {
          logger.debug(`User ${user.id} already has userType: ${user.userType}`, { userId: user.id });
          skippedCount++;
          continue;
        }

        // Determine userType based on role
        let userType: 'seller' | 'buyer' | 'collaborator' | null = null;

        if (!user.role) {
          // No role set - skip and require manual review
          logger.error(`User ${user.id} has no role - SKIPPING (requires manual review)`, { userId: user.id });
          errorCount++;
          continue;
        } else if (['admin', 'owner', 'editor', 'seller'].includes(user.role)) {
          userType = 'seller';
        } else if (user.role === 'viewer') {
          userType = 'collaborator';
          logger.info(`Converting viewer ${user.id} to collaborator`, { userId: user.id });
        } else if (user.role === 'buyer') {
          userType = 'buyer';
        } else {
          // Unknown role - skip and require manual review
          logger.error(`Unknown role "${user.role}" for user ${user.id} - SKIPPING (requires manual review)`, { 
            userId: user.id, 
            role: user.role 
          });
          errorCount++;
          continue;
        }

        if (!userType) {
          logger.error(`Failed to determine userType for user ${user.id} - SKIPPING`, { userId: user.id });
          errorCount++;
          continue;
        }

        // Update user with userType
        await storage.upsertUser({
          ...user,
          userType,
        });

        logger.info(`Migrated user ${user.id}: role="${user.role}" → userType="${userType}"`, {
          userId: user.id,
          oldRole: user.role,
          newUserType: userType
        });

        migratedCount++;

      } catch (error) {
        logger.error(`Failed to migrate user ${user.id}`, error, { userId: user.id });
        errorCount++;
      }
    }

    // Handle viewer → collaborator conversions
    // Viewers need to be converted to collaborators with store memberships
    const collaborators = allUsers.filter(u => u.role === 'viewer');
    
    if (collaborators.length > 0) {
      logger.info(`Found ${collaborators.length} viewer users to convert to collaborators`);
      
      // For each viewer, we need to find which seller they were associated with
      // In the old system, viewers were global. In the new system, collaborators have store memberships.
      // We'll create a membership to the first seller we find, or skip if no sellers exist
      
      const sellers = allUsers.filter(u => ['admin', 'owner', 'editor', 'seller'].includes(u.role || ''));
      
      if (sellers.length === 0) {
        logger.warn('No sellers found - cannot create store memberships for collaborators');
      } else {
        const firstSeller = sellers[0];
        logger.info(`Creating store memberships for collaborators to seller ${firstSeller.id}`);
        
        for (const collaborator of collaborators) {
          try {
            // Create store membership for collaborator with minimal capabilities
            // NOTE: This is a conservative default - review and adjust manually based on actual needs
            await storage.createUserStoreMembership({
              userId: collaborator.id,
              storeOwnerId: firstSeller.id,
              status: 'active',
              capabilities: {
                manageProducts: false, // Conservative default - grant manually if needed
                manageOrders: false,   // Conservative default - grant manually if needed
                viewAnalytics: true,   // Viewer-level access only
              },
            });
            
            logger.warn(`Created store membership for collaborator ${collaborator.id} to seller ${firstSeller.id} with minimal capabilities - REVIEW AND ADJUST MANUALLY`, {
              collaboratorId: collaborator.id,
              sellerId: firstSeller.id
            });
          } catch (error) {
            logger.error(`Failed to create store membership for collaborator ${collaborator.id}`, error, {
              collaboratorId: collaborator.id,
              sellerId: firstSeller.id
            });
          }
        }
      }
    }

    logger.info('Auth system migration completed', {
      total: allUsers.length,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errorCount
    });

    return {
      success: true,
      total: allUsers.length,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errorCount
    };

  } catch (error) {
    logger.error('Auth system migration failed', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Run migration if called directly (ES module compatible)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  migrateAuthSystem()
    .then((result) => {
      console.log('Migration result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}
