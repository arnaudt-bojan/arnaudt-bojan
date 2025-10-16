/**
 * Template Service - Email Template Management
 * Architecture 3 compliant - Pure business logic, no direct database access
 */

import type { IStorage } from "../../storage";
import type {
  CreateTemplateDTO,
  RenderContext,
  TemplateVariable,
} from "@shared/newsletter-types";
import type { NewsletterTemplate } from "@shared/schema";
import { logger } from "../../logger";

export class TemplateService {
  constructor(private storage: IStorage) {}

  /**
   * Create a new template
   */
  async createTemplate(userId: string, data: CreateTemplateDTO): Promise<NewsletterTemplate> {
    logger.info(`[TemplateService] Creating template`, { name: data.name });

    const template = await this.storage.createNewsletterTemplate({
      userId,
      name: data.name,
      subject: data.subject,
      content: data.content,
      htmlContent: data.htmlContent || null,
      images: null,
    });

    logger.info(`[TemplateService] Template created`, { templateId: template.id });
    return template;
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string): Promise<NewsletterTemplate | undefined> {
    return await this.storage.getNewsletterTemplate(id);
  }

  /**
   * Get all templates for a user
   */
  async getTemplates(userId: string): Promise<NewsletterTemplate[]> {
    return await this.storage.getNewsletterTemplatesByUserId(userId);
  }

  /**
   * Update template
   */
  async updateTemplate(
    id: string,
    updates: Partial<CreateTemplateDTO>
  ): Promise<NewsletterTemplate | undefined> {
    logger.info(`[TemplateService] Updating template`, { templateId: id });

    const data: Partial<NewsletterTemplate> = {};

    if (updates.name) data.name = updates.name;
    if (updates.subject) data.subject = updates.subject;
    if (updates.content) data.content = updates.content;
    if (updates.htmlContent !== undefined) data.htmlContent = updates.htmlContent;

    const updated = await this.storage.updateNewsletterTemplate(id, data);

    if (updated) {
      logger.info(`[TemplateService] Template updated`, { templateId: id });
    }

    return updated;
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<boolean> {
    logger.info(`[TemplateService] Deleting template`, { templateId: id });
    return await this.storage.deleteNewsletterTemplate(id);
  }

  /**
   * Render template with context (variable substitution)
   */
  async renderTemplate(
    templateId: string,
    context: RenderContext
  ): Promise<{ subject: string; html: string; text: string }> {
    logger.info(`[TemplateService] Rendering template`, { templateId });

    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Render subject
    const subject = this.replaceVariables(template.subject, context);

    // Render HTML content
    let html = template.htmlContent || this.textToHtml(template.content);
    html = this.replaceVariables(html, context);

    // Render plain text
    const text = this.replaceVariables(template.content, context);

    logger.info(`[TemplateService] Template rendered`, { templateId });

    return { subject, html, text };
  }

  /**
   * Preview template with sample data
   */
  async previewTemplate(templateId: string): Promise<{ subject: string; html: string }> {
    logger.info(`[TemplateService] Previewing template`, { templateId });

    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Sample context
    const sampleContext: RenderContext = {
      subscriber: {
        email: "subscriber@example.com",
        name: "John Doe",
      },
      campaign: {
        id: "sample-campaign",
        subject: template.subject,
      },
      customVariables: {
        company_name: "Upfirst",
        year: new Date().getFullYear().toString(),
      },
    };

    const rendered = await this.renderTemplate(templateId, sampleContext);

    return {
      subject: rendered.subject,
      html: rendered.html,
    };
  }

  /**
   * Extract variables from template content
   */
  extractVariables(content: string): TemplateVariable[] {
    const variableRegex = /\{\{([a-zA-Z0-9_\.]+)\}\}/g;
    const matches = Array.from(content.matchAll(variableRegex));
    const variables = new Set<string>();

    for (const match of matches) {
      variables.add(match[1]);
    }

    return Array.from(variables).map(key => ({
      key,
      label: this.formatVariableLabel(key),
      type: "text" as const,
      defaultValue: "",
    }));
  }

  /**
   * Validate template variables
   */
  validateTemplate(content: string, htmlContent?: string): {
    valid: boolean;
    errors: string[];
    variables: string[];
  } {
    const errors: string[] = [];
    const variables = this.extractVariables(content);

    // Check for unclosed variables
    if (content.includes("{{") && !content.includes("}}")) {
      errors.push("Template contains unclosed variable tags");
    }

    // Check HTML if provided
    if (htmlContent) {
      const htmlVariables = this.extractVariables(htmlContent);
      const contentVarKeys = variables.map(v => v.key);
      const htmlVarKeys = htmlVariables.map(v => v.key);

      // Warn if HTML and content have different variables
      const missingInHtml = contentVarKeys.filter(k => !htmlVarKeys.includes(k));
      if (missingInHtml.length > 0) {
        errors.push(
          `Variables in content but not in HTML: ${missingInHtml.join(", ")}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      variables: variables.map(v => v.key),
    };
  }

  /**
   * Replace variables in content
   */
  private replaceVariables(content: string, context: RenderContext): string {
    let result = content;

    // Replace subscriber variables
    if (context.subscriber) {
      result = result.replace(/\{\{subscriber\.email\}\}/g, context.subscriber.email || "");
      result = result.replace(/\{\{subscriber\.name\}\}/g, context.subscriber.name || "");

      // Replace any custom subscriber fields
      for (const [key, value] of Object.entries(context.subscriber)) {
        result = result.replace(
          new RegExp(`\\{\\{subscriber\\.${key}\\}\\}`, "g"),
          String(value || "")
        );
      }
    }

    // Replace campaign variables
    if (context.campaign) {
      for (const [key, value] of Object.entries(context.campaign)) {
        result = result.replace(
          new RegExp(`\\{\\{campaign\\.${key}\\}\\}`, "g"),
          String(value || "")
        );
      }
    }

    // Replace custom variables
    if (context.customVariables) {
      for (const [key, value] of Object.entries(context.customVariables)) {
        result = result.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, "g"),
          String(value || "")
        );
      }
    }

    return result;
  }

  /**
   * Convert plain text to basic HTML
   */
  private textToHtml(text: string): string {
    return `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    ${text.replace(/\n/g, "<br>")}
  </div>
</body>
</html>`;
  }

  /**
   * Format variable key as human-readable label
   */
  private formatVariableLabel(key: string): string {
    return key
      .replace(/_/g, " ")
      .replace(/\./g, " ")
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Clone template
   */
  async cloneTemplate(templateId: string, newName: string): Promise<NewsletterTemplate> {
    logger.info(`[TemplateService] Cloning template`, { templateId });

    const original = await this.getTemplate(templateId);
    if (!original) {
      throw new Error("Template not found");
    }

    const cloned = await this.createTemplate(original.userId, {
      name: newName,
      subject: original.subject,
      content: original.content,
      htmlContent: original.htmlContent || undefined,
    });

    logger.info(`[TemplateService] Template cloned`, { templateId: cloned.id });
    return cloned;
  }
}
