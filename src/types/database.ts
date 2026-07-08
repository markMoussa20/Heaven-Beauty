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
      site_content: {
        Row: SiteContent;
        Insert: Partial<SiteContent>;
        Update: Partial<SiteContent>;
      };
      footer_links: {
        Row: FooterLink;
        Insert: Partial<FooterLink>;
        Update: Partial<FooterLink>;
      };
      public_pages: {
        Row: PublicPage;
        Insert: Partial<PublicPage>;
        Update: Partial<PublicPage>;
      };
      public_page_faq_items: {
        Row: PublicPageFaqItem;
        Insert: Partial<PublicPageFaqItem>;
        Update: Partial<PublicPageFaqItem>;
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
  iso2?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  domain?: string | null;
  is_active: boolean;
  use_shipping_zones: boolean;
  global_delivery_fee: number | string | null;
  delivery_label?: string | null;
  price_conversion_enabled?: boolean | null;
  price_conversion_base_currency?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Category = {
  id: string;
  name: string;
  slug?: string | null;
  parent_id?: string | null;
  image_url?: string | null;
  image_path?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

export type Product = {
  id: string;
  name: string;
  slug?: string | null;
  short_description?: string | null;
  description?: string | null;
  brand?: string | null;
  base_sku?: string | null;
  main_image_url?: string | null;
  main_image_path?: string | null;
  gallery_image_paths?: string[] | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ProductWithImages = Product & {
  product_images?: ProductImage[] | null;
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
  is_primary?: boolean | null;
  created_at?: string | null;
};

export type CountryItem = {
  id: string;
  country_id: string;
  product_id: string;
  country_sku?: string | null;
  price: number | string;
  sale_price: number | string | null;
  is_visible: boolean;
  is_featured?: boolean | null;
  stock_quantity?: number | null;
  sort_order?: number | null;
  sku?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ShippingZone = {
  id: string;
  country_id: string;
  name: string;
  code?: string | null;
  fee: number | string;
  is_active?: boolean | null;
  sort_order?: number | null;
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
  order_number?: string | null;
  customer_id?: string | null;
  country_id: string;
  currency_code?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  address?: string | null;
  address_line?: string | null;
  shipping_area?: string | null;
  shipping_area_name?: string | null;
  shipping_fee?: number | string | null;
  subtotal?: number | string | null;
  total?: number | string | null;
  status?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  country_item_id: string;
  product_id?: string | null;
  product_name?: string | null;
  quantity: number;
  unit_price: number | string;
  total?: number | string | null;
};

export type AdminUser = {
  id: string;
  user_id?: string | null;
  email?: string | null;
  created_at?: string | null;
};

export type SiteContent = {
  id: string;
  key: string;
  title?: string | null;
  subtitle?: string | null;
  body?: string | null;
  cta_label?: string | null;
  cta_href?: string | null;
  image_url?: string | null;
  image_alt?: string | null;
  secondary_image_url?: string | null;
  secondary_image_alt?: string | null;
  marquee_text?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type FooterLink = {
  id: string;
  group_key: string;
  label: string;
  href: string;
  sort_order?: number | null;
  is_active?: boolean | null;
  is_external?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type PublicPage = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  body?: string | null;
  cta_label?: string | null;
  cta_href?: string | null;
  image_url?: string | null;
  image_alt?: string | null;
  secondary_image_url?: string | null;
  secondary_image_alt?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type PublicPageFaqItem = {
  id: string;
  page_slug: string;
  group_title?: string | null;
  question: string;
  answer: string;
  sort_order?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ExchangeRate = {
  id: string;
  base_currency?: string | null;
  target_currency?: string | null;
  base_currency_code?: string | null;
  target_currency_code?: string | null;
  rate: number | string;
  source?: string | null;
  rate_date?: string | null;
  created_at?: string | null;
};

export type CountryItemWithProduct = CountryItem & {
  products: ProductWithImages;
  countries: Country;
};
