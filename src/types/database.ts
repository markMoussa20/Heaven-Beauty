export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      countries: {
        Row: Country;
        Insert: Partial<Country>;
        Update: Partial<Country>;
      };
      categories: {
        Row: Category;
        Insert: Partial<Category>;
        Update: Partial<Category>;
      };
      products: {
        Row: Product;
        Insert: Partial<Product>;
        Update: Partial<Product>;
      };
      product_categories: {
        Row: ProductCategory;
        Insert: Partial<ProductCategory>;
        Update: Partial<ProductCategory>;
      };
      product_images: {
        Row: ProductImage;
        Insert: Partial<ProductImage>;
        Update: Partial<ProductImage>;
      };
      country_items: {
        Row: CountryItem;
        Insert: Partial<CountryItem>;
        Update: Partial<CountryItem>;
      };
      shipping_zones: {
        Row: ShippingZone;
        Insert: Partial<ShippingZone>;
        Update: Partial<ShippingZone>;
      };
      customers: {
        Row: Customer;
        Insert: Partial<Customer>;
        Update: Partial<Customer>;
      };
      orders: {
        Row: Order;
        Insert: Partial<Order>;
        Update: Partial<Order>;
      };
      order_items: {
        Row: OrderItem;
        Insert: Partial<OrderItem>;
        Update: Partial<OrderItem>;
      };
      admin_users: {
        Row: AdminUser;
        Insert: Partial<AdminUser>;
        Update: Partial<AdminUser>;
      };
      exchange_rates: {
        Row: ExchangeRate;
        Insert: Partial<ExchangeRate>;
        Update: Partial<ExchangeRate>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Country = {
  id: string;
  code: string;
  name: string;
  currency_code: string;
  currency_symbol: string;
  is_active: boolean;
  use_shipping_zones: boolean;
  global_delivery_fee: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Category = {
  id: string;
  name: string;
  slug?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

export type Product = {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  main_image_path?: string | null;
  gallery_image_paths?: string[] | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ProductCategory = {
  id: string;
  product_id: string;
  category_id: string;
};

export type ProductImage = {
  id: string;
  product_id: string;
  storage_path: string;
  alt_text?: string | null;
  sort_order?: number | null;
  created_at?: string | null;
};

export type CountryItem = {
  id: string;
  country_id: string;
  product_id: string;
  price: number | string;
  sale_price: number | string | null;
  is_visible: boolean;
  is_featured?: boolean | null;
  stock_quantity?: number | null;
  sku?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ShippingZone = {
  id: string;
  country_id: string;
  name: string;
  fee: number | string;
  is_active?: boolean | null;
};

export type Customer = {
  id: string;
  email?: string | null;
  phone?: string | null;
  full_name?: string | null;
  country_id?: string | null;
  created_at?: string | null;
};

export type Order = {
  id: string;
  customer_id?: string | null;
  country_id: string;
  total?: number | string | null;
  status?: string | null;
  created_at?: string | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  country_item_id: string;
  quantity: number;
  unit_price: number | string;
};

export type AdminUser = {
  id: string;
  user_id?: string | null;
  email?: string | null;
  created_at?: string | null;
};

export type ExchangeRate = {
  id: string;
  base_currency: string;
  target_currency: string;
  rate: number | string;
  created_at?: string | null;
};

export type CountryItemWithProduct = CountryItem & {
  products: Product;
  countries: Country;
};
