-- Additive mirror tables for entities already stored in the desktop POS.
CREATE TABLE public.pos_manual_products (
  customer_id uuid NOT NULL, source_id text NOT NULL, name text NOT NULL, type text NOT NULL,
  cost_price integer NOT NULL DEFAULT 0, source_created_at timestamptz,
  source_updated_at timestamptz NOT NULL, sync_version bigint NOT NULL DEFAULT 1,
  deleted_at timestamptz, PRIMARY KEY (customer_id, source_id)
);
CREATE INDEX pos_manual_products_name_idx ON public.pos_manual_products (customer_id, name);
CREATE TABLE public.pos_suppliers (
  customer_id uuid NOT NULL, source_id text NOT NULL, name text NOT NULL, phone text, email text,
  address text, notes text, source_created_at timestamptz, source_updated_at timestamptz NOT NULL,
  sync_version bigint NOT NULL DEFAULT 1, deleted_at timestamptz,
  PRIMARY KEY (customer_id, source_id)
);
CREATE INDEX pos_suppliers_name_idx ON public.pos_suppliers (customer_id, name);
CREATE TABLE public.pos_purchases (
  customer_id uuid NOT NULL, source_id text NOT NULL, supplier_source_id text,
  source_created_at timestamptz, source_updated_at timestamptz NOT NULL,
  sync_version bigint NOT NULL DEFAULT 1, deleted_at timestamptz,
  PRIMARY KEY (customer_id, source_id)
);
CREATE INDEX pos_purchases_created_idx ON public.pos_purchases (customer_id, source_created_at DESC);
CREATE INDEX pos_purchases_supplier_idx ON public.pos_purchases (customer_id, supplier_source_id);
CREATE TABLE public.pos_purchase_items (
  customer_id uuid NOT NULL, source_id text NOT NULL, purchase_source_id text NOT NULL,
  product_source_id text NOT NULL, quantity integer NOT NULL, price integer NOT NULL,
  source_created_at timestamptz, source_updated_at timestamptz NOT NULL,
  sync_version bigint NOT NULL DEFAULT 1, deleted_at timestamptz,
  PRIMARY KEY (customer_id, source_id)
);
CREATE INDEX pos_purchase_items_purchase_idx ON public.pos_purchase_items (customer_id, purchase_source_id);
CREATE INDEX pos_purchase_items_product_idx ON public.pos_purchase_items (customer_id, product_source_id);
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['pos_manual_products','pos_suppliers','pos_purchases','pos_purchase_items'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role', table_name);
  END LOOP;
END $$;
