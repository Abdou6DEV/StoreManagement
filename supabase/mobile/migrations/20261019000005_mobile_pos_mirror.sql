CREATE TABLE public.pos_users (
  customer_id uuid NOT NULL,
  source_id text NOT NULL,
  username text NOT NULL,
  email text,
  password_hash text NOT NULL,
  role text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  source_created_at timestamptz,
  source_updated_at timestamptz NOT NULL,
  sync_version bigint NOT NULL DEFAULT 1,
  deleted_at timestamptz,
  PRIMARY KEY (customer_id, source_id),
  UNIQUE (customer_id, username)
);
CREATE INDEX pos_users_username_idx ON public.pos_users (customer_id, username);

CREATE TABLE public.pos_user_permissions (
  customer_id uuid NOT NULL,
  source_id text NOT NULL,
  user_source_id text NOT NULL,
  can_access_cashier boolean NOT NULL DEFAULT false,
  can_access_stock boolean NOT NULL DEFAULT false,
  can_access_clients boolean NOT NULL DEFAULT false,
  can_access_bills boolean NOT NULL DEFAULT false,
  can_access_history boolean NOT NULL DEFAULT false,
  can_access_dashboard boolean NOT NULL DEFAULT false,
  can_access_services boolean NOT NULL DEFAULT false,
  can_access_zakat boolean NOT NULL DEFAULT false,
  can_manage_users boolean NOT NULL DEFAULT false,
  can_view_logs boolean NOT NULL DEFAULT false,
  can_manage_settings boolean NOT NULL DEFAULT false,
  source_updated_at timestamptz NOT NULL,
  sync_version bigint NOT NULL DEFAULT 1,
  deleted_at timestamptz,
  PRIMARY KEY (customer_id, source_id),
  UNIQUE (customer_id, user_source_id)
);
CREATE INDEX pos_user_permissions_user_idx ON public.pos_user_permissions (customer_id, user_source_id);

CREATE TABLE public.pos_categories (
  customer_id uuid NOT NULL,
  source_id text NOT NULL,
  name text NOT NULL,
  source_updated_at timestamptz NOT NULL,
  sync_version bigint NOT NULL DEFAULT 1,
  deleted_at timestamptz,
  PRIMARY KEY (customer_id, source_id)
);

CREATE TABLE public.pos_products (
  customer_id uuid NOT NULL,
  source_id text NOT NULL,
  name text NOT NULL,
  category_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  bought_price integer NOT NULL DEFAULT 0,
  selling_price integer NOT NULL DEFAULT 0,
  codebar text,
  source_created_at timestamptz,
  source_updated_at timestamptz NOT NULL,
  sync_version bigint NOT NULL DEFAULT 1,
  deleted_at timestamptz,
  PRIMARY KEY (customer_id, source_id)
);
CREATE INDEX pos_products_name_idx ON public.pos_products (customer_id, name);
CREATE INDEX pos_products_codebar_idx ON public.pos_products (customer_id, codebar);
CREATE INDEX pos_products_updated_idx ON public.pos_products (customer_id, source_updated_at);

CREATE TABLE public.pos_clients (
  customer_id uuid NOT NULL,
  source_id text NOT NULL,
  name text NOT NULL,
  phone text,
  address text,
  notes text,
  source_created_at timestamptz,
  source_updated_at timestamptz NOT NULL,
  sync_version bigint NOT NULL DEFAULT 1,
  deleted_at timestamptz,
  PRIMARY KEY (customer_id, source_id)
);
CREATE INDEX pos_clients_name_idx ON public.pos_clients (customer_id, name);
CREATE INDEX pos_clients_phone_idx ON public.pos_clients (customer_id, phone);

CREATE TABLE public.pos_sales (
  customer_id uuid NOT NULL,
  source_id text NOT NULL,
  client_source_id text,
  discount integer NOT NULL DEFAULT 0,
  total_amount integer NOT NULL DEFAULT 0,
  total_amount_with_discount integer NOT NULL DEFAULT 0,
  total_items integer NOT NULL DEFAULT 0,
  total_cost integer NOT NULL DEFAULT 0,
  total_profit integer NOT NULL DEFAULT 0,
  source_created_at timestamptz,
  source_updated_at timestamptz NOT NULL,
  sync_version bigint NOT NULL DEFAULT 1,
  deleted_at timestamptz,
  PRIMARY KEY (customer_id, source_id)
);
CREATE INDEX pos_sales_created_idx ON public.pos_sales (customer_id, source_created_at DESC);

CREATE TABLE public.pos_sale_items (
  customer_id uuid NOT NULL,
  source_id text NOT NULL,
  sale_source_id text NOT NULL,
  product_source_id text,
  manual_product_source_id text,
  service_source_id text,
  quantity integer NOT NULL,
  price integer NOT NULL,
  bought_price integer,
  source_updated_at timestamptz NOT NULL,
  sync_version bigint NOT NULL DEFAULT 1,
  deleted_at timestamptz,
  PRIMARY KEY (customer_id, source_id)
);
CREATE INDEX pos_sale_items_sale_idx ON public.pos_sale_items (customer_id, sale_source_id);

CREATE TABLE public.pos_payments (
  customer_id uuid NOT NULL,
  source_id text NOT NULL,
  sale_source_id text,
  client_source_id text NOT NULL,
  given_amount integer NOT NULL,
  credit_amount integer,
  reason text,
  due_date timestamptz,
  paid_date timestamptz,
  type text NOT NULL,
  pending_sale_items text,
  discount integer,
  source_created_at timestamptz,
  source_updated_at timestamptz NOT NULL,
  sync_version bigint NOT NULL DEFAULT 1,
  deleted_at timestamptz,
  PRIMARY KEY (customer_id, source_id)
);
CREATE INDEX pos_payments_client_idx ON public.pos_payments (customer_id, client_source_id);

CREATE TABLE public.pos_services (
  customer_id uuid NOT NULL,
  source_id text NOT NULL,
  name text NOT NULL,
  description text,
  cost_price integer NOT NULL DEFAULT 0,
  source_updated_at timestamptz NOT NULL,
  sync_version bigint NOT NULL DEFAULT 1,
  deleted_at timestamptz,
  PRIMARY KEY (customer_id, source_id)
);

CREATE TABLE public.pos_service_appointments (
  customer_id uuid NOT NULL,
  source_id text NOT NULL,
  name text NOT NULL,
  service_type text NOT NULL,
  description text,
  cost_price integer NOT NULL DEFAULT 0,
  service_price integer NOT NULL DEFAULT 0,
  client_source_id text,
  due_date timestamptz,
  notes text,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  source_created_at timestamptz,
  source_updated_at timestamptz NOT NULL,
  sync_version bigint NOT NULL DEFAULT 1,
  deleted_at timestamptz,
  PRIMARY KEY (customer_id, source_id)
);
CREATE INDEX pos_service_appointments_due_idx ON public.pos_service_appointments (customer_id, due_date);

CREATE TABLE public.pos_bills (
  customer_id uuid NOT NULL,
  source_id text NOT NULL,
  title text NOT NULL,
  description text,
  type text NOT NULL,
  amount integer NOT NULL,
  next_bill_date timestamptz,
  duration text NOT NULL,
  notes text,
  source_created_at timestamptz,
  source_updated_at timestamptz NOT NULL,
  sync_version bigint NOT NULL DEFAULT 1,
  deleted_at timestamptz,
  PRIMARY KEY (customer_id, source_id)
);
CREATE INDEX pos_bills_due_idx ON public.pos_bills (customer_id, next_bill_date);

CREATE TABLE public.pos_bill_payments (
  customer_id uuid NOT NULL,
  source_id text NOT NULL,
  bill_source_id text NOT NULL,
  amount integer NOT NULL,
  paid_date timestamptz,
  notes text,
  source_created_at timestamptz,
  source_updated_at timestamptz NOT NULL,
  sync_version bigint NOT NULL DEFAULT 1,
  deleted_at timestamptz,
  PRIMARY KEY (customer_id, source_id)
);
CREATE INDEX pos_bill_payments_bill_idx ON public.pos_bill_payments (customer_id, bill_source_id);

CREATE TABLE public.pos_dashboard_daily (
  customer_id uuid NOT NULL,
  local_day date NOT NULL,
  sales_count integer NOT NULL DEFAULT 0,
  revenue integer NOT NULL DEFAULT 0,
  profit integer NOT NULL DEFAULT 0,
  total_items integer NOT NULL DEFAULT 0,
  bill_payments integer NOT NULL DEFAULT 0,
  source_updated_at timestamptz NOT NULL DEFAULT now(),
  sync_version bigint NOT NULL DEFAULT 1,
  PRIMARY KEY (customer_id, local_day)
);

CREATE TABLE public.mobile_sessions (
  session_hash text PRIMARY KEY,
  customer_id uuid NOT NULL,
  mobile_device_id uuid NOT NULL REFERENCES public.mobile_devices(id) ON DELETE CASCADE,
  user_source_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  license_checked_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE INDEX mobile_sessions_customer_idx ON public.mobile_sessions (customer_id, user_source_id);
CREATE INDEX mobile_sessions_device_idx ON public.mobile_sessions (mobile_device_id);
CREATE INDEX mobile_sessions_expiry_idx ON public.mobile_sessions (expires_at) WHERE revoked_at IS NULL;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'pos_users', 'pos_user_permissions', 'pos_categories', 'pos_products',
    'pos_clients', 'pos_sales', 'pos_sale_items', 'pos_payments', 'pos_services',
    'pos_service_appointments', 'pos_bills', 'pos_bill_payments',
    'pos_dashboard_daily', 'mobile_sessions'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role', table_name);
  END LOOP;
END $$;
