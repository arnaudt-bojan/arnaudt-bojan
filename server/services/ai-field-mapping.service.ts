/**
 * AI-Powered Field Mapping Service
 * 
 * Uses Gemini AI to intelligently map custom CSV headers to standard template fields
 * Provides confidence scores and handles ambiguous mappings
 */

import { GoogleGenAI } from "@google/genai";
import { CSV_TEMPLATE_FIELDS, type CSVTemplateField } from "../../shared/bulk-upload-template";

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
      // Prepare context for Gemini
      const standardFields = CSV_TEMPLATE_FIELDS.map(f => ({
        name: f.name,
        required: f.required,
        description: f.description,
        example: f.example,
        acceptedValues: f.acceptedValues,
      }));

      const systemPrompt = `You are an expert data mapping assistant for an e-commerce platform.

Your task is to map user's CSV column headers to our standard product template fields.

STANDARD TEMPLATE FIELDS:
${JSON.stringify(standardFields, null, 2)}

MAPPING RULES:
1. Match user headers to the most appropriate standard field
2. Provide a confidence score (0-100) for each mapping
3. Consider synonyms, abbreviations, and common variations
4. A confidence of 80+ means high confidence auto-map
5. A confidence of 50-79 means review needed
6. A confidence below 50 means manual mapping required
7. If no good match exists, set standardField to null
8. Provide brief reasoning for your mapping choice

EXAMPLES OF GOOD MAPPINGS:
- "product_name" → "Product Name" (confidence: 95)
- "img_url" → "Images" (confidence: 85)
- "retail_price" → "Price" (confidence: 90)
- "item_description" → "Description" (confidence: 92)
- "category_name" → "Category" (confidence: 95)
- "stock_qty" → "Stock" (confidence: 88)
- "sku_code" → "SKU" (confidence: 95)

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

      // Correctly extract text from Gemini response (it's a method, not a property)
      const rawJson = response.text();
      console.log('[AIFieldMapping] Gemini response:', rawJson);

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
      const missingRequiredFields = CSV_TEMPLATE_FIELDS
        .filter(f => f.required && !mappedStandardFields.has(f.name))
        .map(f => f.name);

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
      console.error('[AIFieldMapping] Error analyzing headers:', error);
      
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

    const requiredFields = CSV_TEMPLATE_FIELDS.filter(f => f.required);
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
