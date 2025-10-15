/**
 * AI-Powered Field Mapping Service
 * 
 * Uses Gemini AI to intelligently map custom CSV headers to standard template fields
 * Provides confidence scores and handles ambiguous mappings
 */

import { GoogleGenAI } from "@google/genai";
import { ALL_SCHEMA_FIELDS, REQUIRED_FIELDS, type SchemaField } from "../../shared/bulk-upload-schema";
import { logger } from "../logger";

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface FieldMapping {
  userField: string;
  standardField: string | null;
  confidence: number; // 0-100
  reasoning?: string;
}

export interface MappingAnalysis {
  mappings: FieldMapping[];
  unmappedUserFields: string[];
  missingRequiredFields: string[];
  suggestions: string[];
}

export interface FieldMappingSchema {
  mappings: Array<{
    userField: string;
    standardField: string;
    confidence: number;
    reasoning: string;
  }>;
}

export class AIFieldMappingService {
  /**
   * Analyze user CSV headers and map to standard fields using AI
   */
  async analyzeHeaders(userHeaders: string[]): Promise<MappingAnalysis> {
    // Check for API key
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Gemini API key is not configured. Please add GEMINI_API_KEY to your environment variables.");
    }

    try {
      // Prepare context for Gemini - use actual database schema fields
      const standardFields = ALL_SCHEMA_FIELDS.map((f: SchemaField) => ({
        name: f.name,
        dbColumn: f.dbColumn,
        type: f.type,
        required: f.required,
        description: f.description,
        example: f.example,
        acceptedValues: f.acceptedValues,
        validation: f.validation,
      }));

      const systemPrompt = `You are an expert data mapping assistant for an e-commerce platform.

Your task is to map user's CSV column headers to our database schema fields. All products will be imported as IN-STOCK items.

DATABASE SCHEMA FIELDS:
${JSON.stringify(standardFields, null, 2)}

MAPPING RULES:
1. Match user headers to the most appropriate database field (use the "name" from schema)
2. Provide a confidence score (0-100) for each mapping
3. Consider synonyms, abbreviations, and common variations
4. A confidence of 80+ means high confidence auto-map
5. A confidence of 50-79 means review needed
6. A confidence below 50 means manual mapping required
7. If no good match exists, set standardField to null
8. Provide brief reasoning for your mapping choice
9. ALL PRODUCTS ARE IN-STOCK ITEMS - ignore pre-order or made-to-order fields
10. VARIANT SKU is supported - map variant SKU columns to "Variant SKU" field

EXAMPLES OF GOOD MAPPINGS:
- "product_name" / "title" / "name" → "Product Name" (confidence: 95)
- "img_url" / "image_url" / "picture" → "Image" (confidence: 90)
- "images" / "additional_images" → "Images" (confidence: 85)
- "retail_price" / "price" / "cost" → "Price" (confidence: 95)
- "item_description" / "desc" → "Description" (confidence: 92)
- "category_name" / "category" → "Category" (confidence: 95)
- "stock_qty" / "quantity" / "inventory" → "Stock" (confidence: 88)
- "sku_code" / "sku" / "product_sku" → "SKU" (confidence: 95)
- "variant_sku" / "size_sku" / "color_sku" → "Variant SKU" (confidence: 90)
- "variants" / "options" / "sizes" → "Variants" (confidence: 85)

Respond with a JSON array of mappings.`;

      const userPrompt = `Map these user CSV headers to our standard fields:

USER HEADERS:
${JSON.stringify(userHeaders, null, 2)}

Analyze each header and provide the best mapping with confidence score and reasoning.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              mappings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    userField: { type: "string" },
                    standardField: { type: "string" },
                    confidence: { type: "number" },
                    reasoning: { type: "string" },
                  },
                  required: ["userField", "standardField", "confidence", "reasoning"],
                },
              },
            },
            required: ["mappings"],
          },
        },
        contents: userPrompt,
      });

      // Extract text from Gemini response (text is a property, not a method)
      const rawJson = response.text;
      logger.info('[AIFieldMapping] Gemini response received', { responseLength: rawJson?.length || 0 });

      if (!rawJson) {
        throw new Error("Empty response from Gemini AI");
      }

      const aiResult: FieldMappingSchema = JSON.parse(rawJson);

      // Process AI results
      const mappings: FieldMapping[] = aiResult.mappings.map(m => ({
        userField: m.userField,
        standardField: m.standardField === "null" || m.standardField === "" ? null : m.standardField,
        confidence: Math.round(m.confidence),
        reasoning: m.reasoning,
      }));

      // Find unmapped user fields
      const mappedUserFields = new Set(mappings.filter(m => m.standardField !== null).map(m => m.userField));
      const unmappedUserFields = userHeaders.filter(h => !mappedUserFields.has(h));

      // Find missing required fields
      const mappedStandardFields = new Set(mappings.filter(m => m.standardField !== null).map(m => m.standardField));
      const missingRequiredFields = ALL_SCHEMA_FIELDS
        .filter((f: SchemaField) => f.required && !mappedStandardFields.has(f.name))
        .map((f: SchemaField) => f.name);

      // Generate suggestions
      const suggestions: string[] = [];
      
      if (missingRequiredFields.length > 0) {
        suggestions.push(`⚠️ Missing required fields: ${missingRequiredFields.join(', ')}`);
      }

      const lowConfidenceMappings = mappings.filter(m => m.confidence < 80 && m.standardField !== null);
      if (lowConfidenceMappings.length > 0) {
        suggestions.push(`👀 ${lowConfidenceMappings.length} mapping(s) need review (confidence < 80%)`);
      }

      if (unmappedUserFields.length > 0) {
        suggestions.push(`ℹ️ ${unmappedUserFields.length} field(s) will be ignored: ${unmappedUserFields.join(', ')}`);
      }

      return {
        mappings,
        unmappedUserFields,
        missingRequiredFields,
        suggestions,
      };
    } catch (error) {
      logger.error('[AIFieldMapping] Error analyzing headers', error);
      
      // Provide user-friendly error messages
      if (error instanceof Error) {
        if (error.message.includes("API key")) {
          throw error; // Re-throw API key errors as-is
        }
        throw new Error("Failed to analyze headers with AI. Please try again or contact support.");
      }
      
      throw new Error("An unexpected error occurred during header analysis.");
    }
  }

  /**
   * Apply field mappings to transform user data to standard format
   */
  applyMapping(
    userRow: Record<string, any>,
    mappings: FieldMapping[]
  ): Record<string, any> {
    const transformedRow: Record<string, any> = {};

    for (const mapping of mappings) {
      if (mapping.standardField && userRow[mapping.userField] !== undefined) {
        transformedRow[mapping.standardField] = userRow[mapping.userField];
      }
    }

    return transformedRow;
  }

  /**
   * Validate that all required fields are mapped
   */
  validateMapping(mappings: FieldMapping[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const mappedStandardFields = new Set(
      mappings.filter(m => m.standardField !== null).map(m => m.standardField)
    );

    const requiredFields = ALL_SCHEMA_FIELDS.filter((f: SchemaField) => f.required);
    for (const field of requiredFields) {
      if (!mappedStandardFields.has(field.name)) {
        errors.push(`Required field "${field.name}" is not mapped`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
