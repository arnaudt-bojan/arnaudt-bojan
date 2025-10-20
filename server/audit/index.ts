import { prisma } from '../prisma';

export async function logAudit(params: {
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
}) {
  await prisma.$executeRaw`
    INSERT INTO audit_log (user_id, action, entity_type, entity_id, changes, ip_address, user_agent)
    VALUES (${params.userId}, ${params.action}, ${params.entityType}, ${params.entityId}, 
            ${JSON.stringify(params.changes)}::jsonb, ${params.ipAddress}, ${params.userAgent})
  `;
}

export async function logSecurityEvent(params: {
  eventType: string;
  userId?: string;
  ipAddress?: string;
  success: boolean;
  details?: any;
}) {
  await prisma.$executeRaw`
    INSERT INTO security_audit (event_type, user_id, ip_address, success, details)
    VALUES (${params.eventType}, ${params.userId}, ${params.ipAddress}, 
            ${params.success}, ${JSON.stringify(params.details)}::jsonb)
  `;
}
