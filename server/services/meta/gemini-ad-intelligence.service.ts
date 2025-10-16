import { GoogleGenAI } from '@google/genai';
import { logger } from '../../logger';

export interface ProductInfo {
  name: string;
  description: string;
  price: string;
  category: string;
  uniqueSellingPoints?: string[];
  image?: string;
}

export interface TargetAudience {
  ageRange?: string;
  gender?: string;
  interests?: string[];
  location?: string;
}

export interface BusinessInfo {
  name: string;
  industry: string;
  description?: string;
  targetMarket?: string;
}

export interface AdCopyResult {
  primaryTextShort: string; // 40 chars max
  primaryTextLong: string; // 125 chars max
  headline: string; // 40 chars max
  description: string; // 30 chars max
  ctaVariants: CTAVariant[];
  complianceTags: string[];
  tone: string;
}

export interface CTAVariant {
  type: string; // SHOP_NOW, LEARN_MORE, SIGN_UP, etc.
  text: string;
}

export interface TargetingSuggestion {
  countries: string[]; // ISO country codes
  demographics: {
    ageRanges: string[];
    genders: string[];
  };
  interests: string[];
  behaviors: string[];
  detailedTargeting: string[];
}

export interface ContentValidationResult {
  isCompliant: boolean;
  issues: string[];
  warnings: string[];
  severity: 'none' | 'low' | 'medium' | 'high';
}

/**
 * GeminiAdIntelligenceService
 * Architecture 3 service for AI-powered ad copy generation using Google Gemini API
 * 
 * Handles:
 * - AI-powered ad copy generation with tone customization
 * - Meta Ads targeting suggestions based on product/business data
 * - Content compliance and safety validation
 * - Fallback deterministic copy generation
 * - Localization support for multiple markets
 */
export class GeminiAdIntelligenceService {
  private genAI: GoogleGenAI;
  private readonly MODEL_NAME = 'gemini-1.5-flash';
  
  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    
    if (!key) {
      logger.error('[GeminiAdIntelligence] GEMINI_API_KEY not found in environment');
      throw new Error('GEMINI_API_KEY is required');
    }
    
    this.genAI = new GoogleGenAI({ apiKey: key });
    
    logger.info('[GeminiAdIntelligence] Service initialized with Gemini 1.5 Flash');
  }

  /**
   * Generate AI-powered ad copy with multiple variants
   * Includes short/long primary text, headline, description, and CTA options
   */
  async generateAdCopy(
    product: ProductInfo,
    targetAudience: TargetAudience,
    tone: string = 'professional'
  ): Promise<AdCopyResult> {
    try {
      logger.info('[GeminiAdIntelligence] Generating ad copy', { 
        product: product.name, 
        tone 
      });

      const prompt = this.buildAdCopyPrompt(product, targetAudience, tone);
      
      const result = await this.genAI.models.generateContent({
        model: this.MODEL_NAME,
        contents: prompt,
      });
      
      const text = result.text || '';
      
      // Parse JSON response
      const parsed = this.parseJSONResponse(text);
      
      if (parsed && this.isValidAdCopyResponse(parsed)) {
        logger.info('[GeminiAdIntelligence] Successfully generated AI ad copy');
        return this.formatAdCopyResponse(parsed, tone);
      }
      
      // Fallback to deterministic copy
      logger.warn('[GeminiAdIntelligence] AI response invalid, using fallback copy');
      return this.generateFallbackAdCopy(product, tone);
      
    } catch (error) {
      logger.error('[GeminiAdIntelligence] Failed to generate ad copy', { error });
      return this.generateFallbackAdCopy(product, tone);
    }
  }

  /**
   * Generate targeting suggestions based on product and business information
   * Suggests countries, demographics, interests, and behaviors
   */
  async generateTargetingSuggestions(
    product: ProductInfo,
    businessInfo: BusinessInfo
  ): Promise<TargetingSuggestion> {
    try {
      logger.info('[GeminiAdIntelligence] Generating targeting suggestions', { 
        product: product.name,
        business: businessInfo.name 
      });

      const prompt = this.buildTargetingPrompt(product, businessInfo);
      
      const result = await this.genAI.models.generateContent({
        model: this.MODEL_NAME,
        contents: prompt,
      });
      
      const text = result.text || '';
      
      const parsed = this.parseJSONResponse(text);
      
      if (parsed && this.isValidTargetingResponse(parsed)) {
        logger.info('[GeminiAdIntelligence] Successfully generated targeting suggestions');
        return this.formatTargetingResponse(parsed);
      }
      
      // Fallback to basic targeting
      logger.warn('[GeminiAdIntelligence] AI response invalid, using fallback targeting');
      return this.generateFallbackTargeting(product, businessInfo);
      
    } catch (error) {
      logger.error('[GeminiAdIntelligence] Failed to generate targeting', { error });
      return this.generateFallbackTargeting(product, businessInfo);
    }
  }

  /**
   * Validate content for compliance and safety issues
   * Checks for prohibited content, policy violations, and safety concerns
   */
  async validateContent(text: string): Promise<ContentValidationResult> {
    try {
      logger.info('[GeminiAdIntelligence] Validating content compliance');

      const prompt = this.buildValidationPrompt(text);
      
      const result = await this.genAI.models.generateContent({
        model: this.MODEL_NAME,
        contents: prompt,
      });
      
      const responseText = result.text || '';
      
      const parsed = this.parseJSONResponse(responseText);
      
      if (parsed && this.isValidValidationResponse(parsed)) {
        logger.info('[GeminiAdIntelligence] Content validation complete', { 
          isCompliant: parsed.isCompliant 
        });
        return {
          isCompliant: parsed.isCompliant,
          issues: parsed.issues || [],
          warnings: parsed.warnings || [],
          severity: parsed.severity || 'none'
        };
      }
      
      // Fallback: assume compliant but flag for manual review
      logger.warn('[GeminiAdIntelligence] Validation response invalid, defaulting to manual review');
      return {
        isCompliant: true,
        issues: [],
        warnings: ['Content requires manual review - AI validation failed'],
        severity: 'low'
      };
      
    } catch (error) {
      logger.error('[GeminiAdIntelligence] Failed to validate content', { error });
      return {
        isCompliant: true,
        issues: [],
        warnings: ['Content validation failed - requires manual review'],
        severity: 'low'
      };
    }
  }

  /**
   * Build structured prompt for ad copy generation
   */
  private buildAdCopyPrompt(
    product: ProductInfo,
    targetAudience: TargetAudience,
    tone: string
  ): string {
    const usps = product.uniqueSellingPoints?.join('\n- ') || 
      `- High quality ${product.category}\n- Competitive pricing at ${product.price}`;

    return `You are an expert Meta Ads copywriter. Generate compelling ad copy for the following product.

PRODUCT INFORMATION:
Name: ${product.name}
Category: ${product.category}
Price: ${product.price}
Description: ${product.description}

UNIQUE SELLING POINTS:
- ${usps}

TARGET AUDIENCE:
${targetAudience.ageRange ? `Age: ${targetAudience.ageRange}` : ''}
${targetAudience.gender ? `Gender: ${targetAudience.gender}` : ''}
${targetAudience.interests ? `Interests: ${targetAudience.interests.join(', ')}` : ''}
${targetAudience.location ? `Location: ${targetAudience.location}` : 'Global audience'}

TONE: ${tone}
TONE GUIDELINES:
- professional: Expert, trustworthy, authoritative
- casual: Friendly, conversational, approachable
- urgent: Time-sensitive, action-oriented, compelling
- luxury: Exclusive, premium, sophisticated
- playful: Fun, energetic, creative

COMPLIANCE REQUIREMENTS:
- No misleading claims
- No guarantee of specific results
- No prohibited content (violence, discrimination, etc.)
- Follow Meta Advertising Policies
- Include disclaimer if making health/financial claims

OUTPUT FORMAT (JSON):
{
  "primaryTextShort": "Engaging 40-char hook",
  "primaryTextLong": "Compelling 125-char description with benefits and call-to-action",
  "headline": "Attention-grabbing 40-char headline",
  "description": "Brief 30-char value prop",
  "ctaVariants": [
    { "type": "SHOP_NOW", "text": "Shop Now" },
    { "type": "LEARN_MORE", "text": "Learn More" },
    { "type": "SIGN_UP", "text": "Sign Up" }
  ],
  "complianceTags": ["verified", "policy_compliant"]
}

Generate the JSON response now:`;
  }

  /**
   * Build structured prompt for targeting suggestions
   */
  private buildTargetingPrompt(product: ProductInfo, businessInfo: BusinessInfo): string {
    return `You are a Meta Ads targeting expert. Generate optimal audience targeting suggestions for this product and business.

PRODUCT INFORMATION:
Name: ${product.name}
Category: ${product.category}
Price: ${product.price}
Description: ${product.description}

BUSINESS INFORMATION:
Name: ${businessInfo.name}
Industry: ${businessInfo.industry}
${businessInfo.description ? `Description: ${businessInfo.description}` : ''}
${businessInfo.targetMarket ? `Target Market: ${businessInfo.targetMarket}` : ''}

TARGETING TASK:
1. Suggest 3-5 countries where this product would perform best (use ISO country codes: US, GB, CA, AU, etc.)
2. Recommend age ranges and gender targeting
3. Identify relevant interest categories for Meta Ads
4. Suggest behavior targeting options
5. Provide detailed targeting keywords

LOCALIZATION NOTES:
- Consider currency and pricing for each market
- Account for cultural preferences
- Factor in shipping feasibility
- Consider local competition

OUTPUT FORMAT (JSON):
{
  "countries": ["US", "GB", "CA"],
  "demographics": {
    "ageRanges": ["25-34", "35-44"],
    "genders": ["All", "Women", "Men"]
  },
  "interests": [
    "Online Shopping",
    "Fashion Accessories",
    "Lifestyle & Culture"
  ],
  "behaviors": [
    "Online Shoppers",
    "Frequent Travelers",
    "Technology Early Adopters"
  ],
  "detailedTargeting": [
    "E-commerce",
    "Brand-conscious shoppers",
    "Gift shoppers"
  ]
}

Generate the JSON response now:`;
  }

  /**
   * Build structured prompt for content validation
   */
  private buildValidationPrompt(text: string): string {
    return `You are a Meta Ads compliance expert. Validate this ad copy for policy compliance and safety.

AD COPY TO VALIDATE:
"${text}"

CHECK FOR:
1. Prohibited Content:
   - Violence, hate speech, discrimination
   - Misleading claims or false promises
   - Adult content or suggestive material
   - Illegal products or services
   - Shocking or sensational content

2. Policy Violations:
   - Unsubstantiated claims
   - Missing disclaimers for health/financial products
   - Inappropriate language
   - Trademark infringement risks
   - Unrealistic guarantees

3. Safety Concerns:
   - Targeting vulnerable audiences
   - Data privacy issues
   - Harmful or dangerous suggestions
   - Misinformation

OUTPUT FORMAT (JSON):
{
  "isCompliant": true or false,
  "issues": ["List of critical violations that must be fixed"],
  "warnings": ["List of concerns that should be reviewed"],
  "severity": "none" | "low" | "medium" | "high"
}

Generate the JSON response now:`;
  }

  /**
   * Parse JSON from AI response (handles markdown code blocks)
   */
  private parseJSONResponse(text: string): any {
    try {
      // Remove markdown code blocks if present
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }
      
      return JSON.parse(cleanText);
    } catch (error) {
      logger.error('[GeminiAdIntelligence] Failed to parse JSON response', { error, text });
      return null;
    }
  }

  /**
   * Validate ad copy response structure
   */
  private isValidAdCopyResponse(data: any): boolean {
    return !!(
      data &&
      typeof data.primaryTextShort === 'string' &&
      typeof data.primaryTextLong === 'string' &&
      typeof data.headline === 'string' &&
      typeof data.description === 'string' &&
      Array.isArray(data.ctaVariants)
    );
  }

  /**
   * Validate targeting response structure
   */
  private isValidTargetingResponse(data: any): boolean {
    return !!(
      data &&
      Array.isArray(data.countries) &&
      data.demographics &&
      Array.isArray(data.demographics.ageRanges) &&
      Array.isArray(data.interests)
    );
  }

  /**
   * Validate content validation response structure
   */
  private isValidValidationResponse(data: any): boolean {
    return !!(
      data &&
      typeof data.isCompliant === 'boolean' &&
      Array.isArray(data.issues) &&
      Array.isArray(data.warnings)
    );
  }

  /**
   * Format ad copy response with character limits enforced
   */
  private formatAdCopyResponse(data: any, tone: string): AdCopyResult {
    return {
      primaryTextShort: this.truncate(data.primaryTextShort, 40),
      primaryTextLong: this.truncate(data.primaryTextLong, 125),
      headline: this.truncate(data.headline, 40),
      description: this.truncate(data.description, 30),
      ctaVariants: data.ctaVariants.slice(0, 3), // Max 3 CTAs
      complianceTags: data.complianceTags || ['ai_generated'],
      tone: tone
    };
  }

  /**
   * Format targeting response
   */
  private formatTargetingResponse(data: any): TargetingSuggestion {
    return {
      countries: data.countries.slice(0, 5), // Max 5 countries
      demographics: {
        ageRanges: data.demographics.ageRanges || [],
        genders: data.demographics.genders || []
      },
      interests: data.interests.slice(0, 10), // Max 10 interests
      behaviors: data.behaviors?.slice(0, 5) || [],
      detailedTargeting: data.detailedTargeting?.slice(0, 10) || []
    };
  }

  /**
   * Generate deterministic fallback ad copy
   */
  private generateFallbackAdCopy(product: ProductInfo, tone: string): AdCopyResult {
    const toneMap: Record<string, { prefix: string; suffix: string }> = {
      professional: { 
        prefix: 'Discover premium', 
        suffix: 'Shop with confidence today.' 
      },
      casual: { 
        prefix: 'Check out our', 
        suffix: 'Grab yours now!' 
      },
      urgent: { 
        prefix: 'Limited time:', 
        suffix: 'Act fast - shop now!' 
      },
      luxury: { 
        prefix: 'Exclusive', 
        suffix: 'Experience luxury today.' 
      },
      playful: { 
        prefix: 'Get ready for', 
        suffix: 'Join the fun now!' 
      }
    };

    const { prefix, suffix } = toneMap[tone] || toneMap.professional;

    return {
      primaryTextShort: this.truncate(`${prefix} ${product.name}`, 40),
      primaryTextLong: this.truncate(
        `${prefix} ${product.name}. ${product.description.split('.')[0]}. ${suffix}`,
        125
      ),
      headline: this.truncate(`${product.name} - ${product.category}`, 40),
      description: this.truncate(`Starting at ${product.price}`, 30),
      ctaVariants: [
        { type: 'SHOP_NOW', text: 'Shop Now' },
        { type: 'LEARN_MORE', text: 'Learn More' },
        { type: 'GET_OFFER', text: 'Get Offer' }
      ],
      complianceTags: ['fallback_copy', 'requires_review'],
      tone: tone
    };
  }

  /**
   * Generate deterministic fallback targeting
   */
  private generateFallbackTargeting(
    product: ProductInfo,
    businessInfo: BusinessInfo
  ): TargetingSuggestion {
    // Basic targeting based on product category
    const categoryTargeting: Record<string, Partial<TargetingSuggestion>> = {
      fashion: {
        countries: ['US', 'GB', 'CA', 'AU'],
        demographics: {
          ageRanges: ['18-24', '25-34', '35-44'],
          genders: ['All', 'Women']
        },
        interests: ['Fashion', 'Online Shopping', 'Clothing']
      },
      electronics: {
        countries: ['US', 'GB', 'DE', 'JP'],
        demographics: {
          ageRanges: ['25-34', '35-44', '45-54'],
          genders: ['All']
        },
        interests: ['Technology', 'Electronics', 'Online Shopping']
      },
      home: {
        countries: ['US', 'GB', 'CA'],
        demographics: {
          ageRanges: ['25-34', '35-44', '45-54'],
          genders: ['All']
        },
        interests: ['Home Decor', 'Interior Design', 'Online Shopping']
      }
    };

    const category = product.category.toLowerCase();
    const targeting = categoryTargeting[category] || {
      countries: ['US', 'GB', 'CA'],
      demographics: {
        ageRanges: ['25-34', '35-44'],
        genders: ['All']
      },
      interests: ['Online Shopping', product.category]
    };

    return {
      countries: targeting.countries || ['US'],
      demographics: targeting.demographics || {
        ageRanges: ['25-34'],
        genders: ['All']
      },
      interests: targeting.interests || ['Online Shopping'],
      behaviors: ['Online Shoppers', 'Engaged Shoppers'],
      detailedTargeting: [product.category, 'E-commerce', businessInfo.industry]
    };
  }

  /**
   * Truncate text to max length with ellipsis
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}
