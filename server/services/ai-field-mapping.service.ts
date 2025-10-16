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

    // DEBUG: Log headers received
    logger.info('[AIFieldMapping] Headers received for mapping:', { 
      headers: JSON.stringify(userHeaders), 
      count: userHeaders.length,
      hasVariants: userHeaders.includes('variants') 
    });

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

Your task is to map user's CSV column headers to our standard database column names. All products will be imported as IN-STOCK items.

CRITICAL: You MUST map to the "dbColumn" field (database column name), NOT the display "name". The dbColumn is the actual field name used in our database and validation system.

DATABASE SCHEMA FIELDS:
${JSON.stringify(standardFields, null, 2)}

WOOCOMMERCE/SHOPIFY AUTHORITATIVE MAPPING DICTIONARY:
Use these EXACT mappings with 95%+ confidence for WooCommerce/Shopify CSVs (map to dbColumn):
- "Regular price" → "price" (confidence: 98)
- "Name" → "name" (confidence: 98)
- "Description" / "Short description" → "description" (confidence: 98)
- "SKU" → "sku" (confidence: 98)
- "Stock" / "Stock quantity" → "stock" (confidence: 98)
- "Images" → "images" (confidence: 98)
- "Categories" → "category" (confidence: 98)
- "variants" → "variants" (confidence: 99 - CRITICAL: preprocessed variant data, must preserve!)
- "Weight (kg)" / "Weight" → null (confidence: 95 - we don't support weight)
- "Shipping class" → "shippingType" (confidence: 70)

EXPLICIT IGNORE LIST - MUST MAP TO NULL:
These WooCommerce/Shopify fields are NOT supported and MUST be set to null with appropriate reasoning:
- "ID" → null (reasoning: "Internal database IDs are not imported; our system generates IDs automatically")
- "Type" → null (reasoning: "WooCommerce product type (simple/variable) is not needed; our system handles variants automatically")
- "Parent" → null (reasoning: "Parent-child product relationships are not supported; variants are flattened during preprocessing")
- "Tags" → null (reasoning: "Product tags are not captured in our schema")
- "Tax status" / "Tax class" → null (reasoning: "Tax information is calculated automatically by our tax system")
- "Published" / "Is featured?" → null (reasoning: "Publishing status is managed separately in our platform")
- "In stock?" → null (reasoning: "Stock status is determined automatically from stock quantity")
- "Sale price" → null (reasoning: "Sale prices and discounts are managed through our pricing system, not during import")
- "Upsells" / "Cross-sells" → null (reasoning: "Product recommendations are not supported during bulk import")
- "External URL" / "Button text" → null (reasoning: "External product features are not supported")
- "Download limit" / "Download expiry days" → null (reasoning: "Downloadable product features are not supported")
- "Position" / "Menu order" → null (reasoning: "Product ordering is managed in our dashboard")
- "Width (cm)" / "Height (cm)" / "Length (cm)" → null (reasoning: "Product dimensions are not captured in our schema")
- "Attribute 1 name" / "Attribute 1 value(s)" / "Attribute 2 name" / "Attribute 2 value(s)" → null (reasoning: "WooCommerce attribute columns are intermediate data - preprocessing transforms them into the 'variants' column")
- "Purchase note" → null (reasoning: "Purchase notes are not supported")

CONFIDENCE SCORING RULES:
1. EXACT matches from WooCommerce dictionary → 95-98% confidence
2. Clear synonyms (e.g., "title"→"name", "qty"→"stock") → 85-94% confidence
3. Probable matches with minor ambiguity → 70-84% confidence
4. Uncertain matches → 50-69% confidence
5. No good match OR on ignore list → map to null (no confidence needed)

CRITICAL RULES:
1. For WooCommerce CSVs, use the AUTHORITATIVE MAPPING DICTIONARY - don't guess
2. Fields on IGNORE LIST must ALWAYS map to null with the provided reasoning
3. Use 95%+ confidence for exact/canonical matches - be decisive!
4. "images" (plural) is preferred over "image" (singular) - both are supported
5. Product Type defaults to "in-stock" automatically - no mapping needed
6. Map "Regular price" to "price" (98%) - ignore "Sale price"
7. Never map unrelated fields (e.g., "Tags" to "category") - use null instead
8. ALWAYS use lowercase dbColumn values (e.g., "name", "price", "category", NOT "Name", "Price", "Category")

EXAMPLES OF CORRECT MAPPINGS:
✅ "Regular price" → "price" (confidence: 98, reasoning: "Direct match for regular/base price")
✅ "Name" → "name" (confidence: 98, reasoning: "Standard product name field")
✅ "Tags" → null (confidence: 30, reasoning: "Product tags are not captured in our schema")
✅ "Sale price" → null (confidence: 30, reasoning: "Sale prices are managed through our pricing system")
✅ "Type" → null (confidence: 30, reasoning: "WooCommerce product type is not needed")

❌ WRONG: "Tags" → "category" (confidence: 60) - Tags are NOT categories
❌ WRONG: "Type" → "category" (confidence: 55) - Product type is NOT category
❌ WRONG: "Sale price" → "price" (confidence: 70) - We only import regular price
❌ WRONG: "Name" → "Product Name" - Must use dbColumn "name", not display name "Product Name"

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

      // Find unmapped user fields (those with null standardField)
      const unmappedMappings = mappings.filter(m => m.standardField === null);
      const unmappedUserFields = unmappedMappings.map(m => m.userField);

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

      const highConfidenceMappings = mappings.filter(m => m.confidence >= 80 && m.standardField !== null);
      if (highConfidenceMappings.length > 0) {
        suggestions.push(`✅ ${highConfidenceMappings.length} field(s) auto-mapped with high confidence`);
      }

      if (unmappedUserFields.length > 0) {
        suggestions.push(`ℹ️ ${unmappedUserFields.length} field(s) will be ignored (not supported by our schema)`);
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
   * Translates display names to database columns (Architecture 3)
   * Preserves preprocessing-generated fields (variants, etc.)
   * Handles multiple columns mapping to array fields (e.g., Image 1, Image 2 → images)
   */
  applyMapping(
    userRow: Record<string, any>,
    mappings: FieldMapping[]
  ): Record<string, any> {
    const transformedRow: Record<string, any> = {};

    // Preserve preprocessing-generated fields (variants from WooCommerce/Shopify)
    const preprocessingFields = ['variants'];
    for (const field of preprocessingFields) {
      if (userRow[field] !== undefined) {
        transformedRow[field] = userRow[field];
      }
    }

    // Track array fields to collect multiple values
    const arrayFieldCollectors: Record<string, string[]> = {};

    for (const mapping of mappings) {
      if (mapping.standardField && userRow[mapping.userField] !== undefined) {
        // Find the schema field - check both name and dbColumn since AI might return either
        const schemaField = ALL_SCHEMA_FIELDS.find((f: SchemaField) => 
          f.name === mapping.standardField || f.dbColumn === mapping.standardField
        );
        
        if (schemaField) {
          const dbColumn = schemaField.dbColumn;
          const value = userRow[mapping.userField];
          
          // Handle array fields (e.g., images) - collect all non-empty values
          if (schemaField.type === 'array') {
            if (!arrayFieldCollectors[dbColumn]) {
              arrayFieldCollectors[dbColumn] = [];
            }
            // Only add non-empty values
            if (value && String(value).trim()) {
              arrayFieldCollectors[dbColumn].push(String(value).trim());
            }
          } else {
            // Non-array fields: use last value (standard behavior)
            transformedRow[dbColumn] = value;
          }
        } else {
          // Fallback to standardField if not found in schema
          transformedRow[mapping.standardField] = userRow[mapping.userField];
        }
      }
    }

    // Join array field values with pipe separator (database format)
    for (const [dbColumn, values] of Object.entries(arrayFieldCollectors)) {
      if (values.length > 0) {
        transformedRow[dbColumn] = values.join('|');
      }
    }

    return transformedRow;
  }

  /**
   * Validate that all required fields are mapped
   * Checks database column names (dbColumn)
   */
  validateMapping(mappings: FieldMapping[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const mappedStandardFields = new Set(
      mappings.filter(m => m.standardField !== null).map(m => m.standardField)
    );

    const requiredFields = ALL_SCHEMA_FIELDS.filter((f: SchemaField) => f.required);
    for (const field of requiredFields) {
      if (!mappedStandardFields.has(field.dbColumn)) {
        errors.push(`Required field "${field.name}" is not mapped`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
