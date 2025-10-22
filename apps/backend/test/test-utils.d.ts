import { TestingModule } from '@nestjs/testing';
export declare class TestingUtils {
    static createTestingModule(providers: any[]): Promise<TestingModule>;
    static mockFetch(response: any): void;
    static resetMocks(): void;
}
export declare const mockProduct: {
    id: string;
    name: string;
    price: number;
    status: string;
    stock: number;
    stock_quantity: number;
    product_type: string;
    created_at: Date;
    compare_at_price: any;
    is_wholesale: boolean;
    variants: any[];
};
export declare const mockOrder: {
    id: string;
    status: string;
    fulfillment_status: string;
    total: number;
    currency: string;
    created_at: Date;
};
export declare const mockCart: {
    id: string;
    user_id: string;
    session_id: any;
    items: any[];
};
export declare const mockWholesaleInvitation: {
    id: string;
    seller_id: string;
    buyer_email: string;
    status: string;
    deposit_percentage: number;
    minimum_order_value: number;
    wholesale_terms: {
        allowedPaymentTerms: string[];
    };
};
