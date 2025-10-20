import { gql } from '@apollo/client';

// Quotation fragment for reuse
export const QUOTATION_FRAGMENT = gql`
  fragment QuotationFields on Quotation {
    id
    quotationNumber
    sellerId
    buyerEmail
    buyerId
    status
    subtotal
    taxAmount
    shippingAmount
    total
    currency
    depositAmount
    depositPercentage
    balanceAmount
    validUntil
    deliveryTerms
    paymentTerms
    dataSheetUrl
    termsAndConditionsUrl
    orderId
    metadata
    createdAt
    updatedAt
  }
`;

export const LINE_ITEM_FRAGMENT = gql`
  fragment LineItemFields on QuotationItem {
    id
    quotationId
    lineNumber
    description
    productId
    unitPrice
    quantity
    lineTotal
    createdAt
    updatedAt
  }
`;

// Queries
export const GET_QUOTATION = gql`
  ${QUOTATION_FRAGMENT}
  ${LINE_ITEM_FRAGMENT}
  query GetQuotation($id: ID!) {
    getQuotation(id: $id) {
      ...QuotationFields
      items {
        ...LineItemFields
      }
      seller {
        id
        username
        email
      }
      buyer {
        id
        email
      }
    }
  }
`;

export const GET_QUOTATION_BY_TOKEN = gql`
  ${QUOTATION_FRAGMENT}
  ${LINE_ITEM_FRAGMENT}
  query GetQuotationByToken($token: String!) {
    getQuotationByToken(token: $token) {
      ...QuotationFields
      items {
        ...LineItemFields
      }
      seller {
        id
        username
        email
      }
    }
  }
`;

export const LIST_QUOTATIONS = gql`
  ${QUOTATION_FRAGMENT}
  query ListQuotations {
    listQuotations {
      ...QuotationFields
      seller {
        id
        username
      }
      buyer {
        id
        email
      }
    }
  }
`;

// Mutations
export const CREATE_QUOTATION = gql`
  ${QUOTATION_FRAGMENT}
  mutation CreateQuotation($input: CreateQuotationInput!) {
    createQuotation(input: $input) {
      ...QuotationFields
    }
  }
`;

export const UPDATE_QUOTATION = gql`
  ${QUOTATION_FRAGMENT}
  mutation UpdateQuotation($id: ID!, $input: UpdateQuotationInput!) {
    updateQuotation(id: $id, input: $input) {
      ...QuotationFields
    }
  }
`;

export const SEND_QUOTATION = gql`
  ${QUOTATION_FRAGMENT}
  mutation SendQuotation($id: ID!) {
    sendQuotation(id: $id) {
      ...QuotationFields
    }
  }
`;

export const ACCEPT_QUOTATION = gql`
  ${QUOTATION_FRAGMENT}
  mutation AcceptQuotation($token: String!, $buyerInfo: BuyerInfoInput) {
    acceptQuotation(token: $token, buyerInfo: $buyerInfo) {
      ...QuotationFields
    }
  }
`;

// Mutation for live calculation of quotation totals
export const CALCULATE_QUOTATION_TOTALS = gql`
  mutation CalculateQuotationTotals($input: CalculateQuotationTotalsInput!) {
    calculateQuotationTotals(input: $input) {
      lineItems {
        description
        unitPrice
        quantity
        lineTotal
      }
      subtotal
      taxAmount
      shippingAmount
      total
      depositAmount
      depositPercentage
      balanceAmount
    }
  }
`;

// Types
export interface QuotationItem {
  id?: string;
  quotationId?: string;
  lineNumber?: number;
  description: string;
  productId?: string;
  unitPrice: number;
  quantity: number;
  lineTotal?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  sellerId: string;
  buyerEmail: string;
  buyerId?: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  total: number;
  currency: string;
  depositAmount: number;
  depositPercentage: number;
  balanceAmount: number;
  validUntil?: string;
  deliveryTerms?: string;
  paymentTerms?: string;
  dataSheetUrl?: string;
  termsAndConditionsUrl?: string;
  orderId?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  items?: QuotationItem[];
  seller?: {
    id: string;
    username: string;
    email: string;
  };
  buyer?: {
    id: string;
    email: string;
  };
}

export interface CreateQuotationInput {
  buyerEmail: string;
  buyerId?: string;
  currency?: string;
  depositPercentage?: number;
  validUntil?: string;
  deliveryTerms?: string;
  dataSheetUrl?: string;
  termsAndConditionsUrl?: string;
  items: Array<{
    description: string;
    productId?: string;
    unitPrice: number;
    quantity: number;
  }>;
}

export interface UpdateQuotationInput {
  depositPercentage?: number;
  validUntil?: string;
  deliveryTerms?: string;
  dataSheetUrl?: string;
  termsAndConditionsUrl?: string;
  items?: Array<{
    description: string;
    productId?: string;
    unitPrice: number;
    quantity: number;
  }>;
}

export interface CalculateQuotationTotalsInput {
  lineItems: Array<{
    description: string;
    productId?: string;
    unitPrice: number;
    quantity: number;
  }>;
  depositPercentage?: number;
  taxRate?: number;
  shippingAmount?: number;
}

export interface CalculatedQuotationTotals {
  lineItems: Array<{
    description: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  total: number;
  depositAmount: number;
  depositPercentage: number;
  balanceAmount: number;
}
