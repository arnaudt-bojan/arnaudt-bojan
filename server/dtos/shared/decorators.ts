/**
 * Shared Validation Decorators
 * 
 * Common validation patterns used across all DTOs
 * - IDs (UUIDs, string IDs)
 * - Currency (cents, percentages)
 * - Contact info (emails, phones)
 * - Addresses
 */

import { 
  registerDecorator, 
  ValidationOptions, 
  ValidationArguments,
  isUUID,
  isEmail,
  isURL,
  matches
} from 'class-validator';

/**
 * Validates UUID v4 format
 */
export function IsUUIDv4(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isUUIDv4',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return typeof value === 'string' && isUUID(value, '4');
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid UUID v4`;
        }
      }
    });
  };
}

/**
 * Validates positive integer (for quantities, IDs, etc)
 */
export function IsPositiveInteger(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isPositiveInteger',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return Number.isInteger(value) && value > 0;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a positive integer`;
        }
      }
    });
  };
}

/**
 * Validates non-negative integer (for amounts in cents, quantities with 0 allowed)
 */
export function IsNonNegativeInteger(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isNonNegativeInteger',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return Number.isInteger(value) && value >= 0;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a non-negative integer`;
        }
      }
    });
  };
}

/**
 * Validates currency amount in cents (positive integer)
 */
export function IsCurrencyAmount(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isCurrencyAmount',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return Number.isInteger(value) && value >= 0;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid currency amount in cents (non-negative integer)`;
        }
      }
    });
  };
}

/**
 * Validates percentage (0-100)
 */
export function IsPercentage(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isPercentage',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return typeof value === 'number' && value >= 0 && value <= 100;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a percentage between 0 and 100`;
        }
      }
    });
  };
}

/**
 * Validates currency code (ISO 4217)
 */
export function IsCurrencyCode(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isCurrencyCode',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // Common currency codes - can expand as needed
          const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR'];
          return typeof value === 'string' && validCurrencies.includes(value.toUpperCase());
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid ISO 4217 currency code`;
        }
      }
    });
  };
}

/**
 * Validates phone number (basic international format)
 */
export function IsPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isPhoneNumber',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // Basic phone validation - allows +, digits, spaces, hyphens, parentheses
          const phoneRegex = /^\+?[\d\s\-()]+$/;
          return typeof value === 'string' && phoneRegex.test(value) && value.length >= 10 && value.length <= 20;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid phone number`;
        }
      }
    });
  };
}

/**
 * Validates postal/zip code
 */
export function IsPostalCode(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isPostalCode',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // Basic postal code validation - alphanumeric with spaces/hyphens
          const postalRegex = /^[A-Z0-9\s\-]+$/i;
          return typeof value === 'string' && postalRegex.test(value) && value.length >= 3 && value.length <= 10;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid postal code`;
        }
      }
    });
  };
}

/**
 * Validates SKU format
 */
export function IsSKU(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isSKU',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // SKU: alphanumeric, hyphens, underscores, 3-50 chars
          const skuRegex = /^[A-Z0-9\-_]+$/i;
          return typeof value === 'string' && skuRegex.test(value) && value.length >= 3 && value.length <= 50;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid SKU (alphanumeric, hyphens, underscores, 3-50 chars)`;
        }
      }
    });
  };
}

/**
 * Validates tracking number
 */
export function IsTrackingNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isTrackingNumber',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // Tracking number: alphanumeric with hyphens, 5-40 chars
          const trackingRegex = /^[A-Z0-9\-]+$/i;
          return typeof value === 'string' && trackingRegex.test(value) && value.length >= 5 && value.length <= 40;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid tracking number`;
        }
      }
    });
  };
}

/**
 * Validates country code (ISO 3166-1 alpha-2)
 */
export function IsCountryCode(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isCountryCode',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // Common country codes - can expand as needed
          const validCountries = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'CN', 'JP', 'IN'];
          return typeof value === 'string' && value.length === 2 && validCountries.includes(value.toUpperCase());
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid ISO 3166-1 alpha-2 country code`;
        }
      }
    });
  };
}
