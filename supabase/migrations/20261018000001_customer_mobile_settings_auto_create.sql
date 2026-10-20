-- Ensure every newly created customer gets a disabled mobile entitlement row.
CREATE OR REPLACE FUNCTION public.create_default_customer_mobile_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  INSERT INTO public.customer_mobile_settings (customer_id)
  VALUES (NEW.id)
  ON CONFLICT (customer_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER customers_create_mobile_settings
AFTER INSERT ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.create_default_customer_mobile_settings();
