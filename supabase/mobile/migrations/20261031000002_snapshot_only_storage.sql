-- Make snapshot storage the sole source of truth; retain legacy tables temporarily but stop writing to them.
CREATE OR REPLACE FUNCTION public.finalize_mobile_sync_snapshot(p_customer_id uuid,p_device_id text,p_snapshot_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
 v_snapshot public.mobile_sync_snapshots%ROWTYPE;
 v_entity text;
 v_count integer;
 v_previous_snapshot_id uuid;
 v_entities text[]:=ARRAY['users','permissions','categories','products','manual_products','suppliers','purchases','purchase_items','clients','services','service_appointments','sales','sale_items','payments','bills','bill_payments','dashboard_daily'];
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_customer_id::text,0));
 SELECT * INTO v_snapshot FROM public.mobile_sync_snapshots WHERE customer_id=p_customer_id AND snapshot_id=p_snapshot_id FOR UPDATE;
 IF NOT FOUND OR v_snapshot.device_id<>p_device_id THEN RAISE EXCEPTION 'snapshot_not_found_or_owned'; END IF;
 IF v_snapshot.status='active' THEN RETURN jsonb_build_object('ok',true,'status','active'); END IF;
 IF v_snapshot.status<>'uploading' THEN RAISE EXCEPTION 'snapshot_not_uploading'; END IF;
 FOREACH v_entity IN ARRAY v_entities LOOP
  SELECT count(*) INTO v_count FROM public.mobile_sync_snapshot_chunks WHERE customer_id=p_customer_id AND snapshot_id=p_snapshot_id AND entity=v_entity;
  IF v_count<>(v_snapshot.expected_chunks->>v_entity)::integer THEN RAISE EXCEPTION 'snapshot_chunks_incomplete:%',v_entity; END IF;
  SELECT count(*) INTO v_count FROM public.mobile_sync_snapshot_rows WHERE customer_id=p_customer_id AND snapshot_id=p_snapshot_id AND entity=v_entity;
  IF v_count<>(v_snapshot.expected_counts->>v_entity)::integer THEN RAISE EXCEPTION 'snapshot_rows_incomplete:%',v_entity; END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM public.mobile_sync_snapshot_rows u WHERE u.customer_id=p_customer_id AND u.snapshot_id=p_snapshot_id AND u.entity='users' AND (u.payload->>'is_active')::boolean=true) THEN RAISE EXCEPTION 'snapshot_has_no_active_user'; END IF;
 IF EXISTS(SELECT 1 FROM public.mobile_sync_snapshot_rows p WHERE p.customer_id=p_customer_id AND p.snapshot_id=p_snapshot_id AND p.entity='permissions' AND NOT EXISTS(SELECT 1 FROM public.mobile_sync_snapshot_rows u WHERE u.customer_id=p_customer_id AND u.snapshot_id=p_snapshot_id AND u.entity='users' AND u.source_key=p.payload->>'user_source_id')) THEN RAISE EXCEPTION 'snapshot_invalid_permission_user'; END IF;
 IF EXISTS(SELECT 1 FROM public.mobile_sync_snapshot_rows p WHERE p.customer_id=p_customer_id AND p.snapshot_id=p_snapshot_id AND p.entity='purchases' AND p.payload->>'supplier_source_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.mobile_sync_snapshot_rows u WHERE u.customer_id=p_customer_id AND u.snapshot_id=p_snapshot_id AND u.entity='suppliers' AND u.source_key=p.payload->>'supplier_source_id')) THEN RAISE EXCEPTION 'snapshot_invalid_purchase_supplier'; END IF;
 IF EXISTS(SELECT 1 FROM public.mobile_sync_snapshot_rows p WHERE p.customer_id=p_customer_id AND p.snapshot_id=p_snapshot_id AND p.entity='purchase_items' AND (NOT EXISTS(SELECT 1 FROM public.mobile_sync_snapshot_rows u WHERE u.customer_id=p_customer_id AND u.snapshot_id=p_snapshot_id AND u.entity='purchases' AND u.source_key=p.payload->>'purchase_source_id') OR NOT EXISTS(SELECT 1 FROM public.mobile_sync_snapshot_rows u WHERE u.customer_id=p_customer_id AND u.snapshot_id=p_snapshot_id AND u.entity='products' AND u.source_key=p.payload->>'product_source_id'))) THEN RAISE EXCEPTION 'snapshot_invalid_purchase_item'; END IF;
 IF EXISTS(SELECT 1 FROM public.mobile_sync_snapshot_rows p WHERE p.customer_id=p_customer_id AND p.snapshot_id=p_snapshot_id AND p.entity='sale_items' AND NOT EXISTS(SELECT 1 FROM public.mobile_sync_snapshot_rows u WHERE u.customer_id=p_customer_id AND u.snapshot_id=p_snapshot_id AND u.entity='sales' AND u.source_key=p.payload->>'sale_source_id')) THEN RAISE EXCEPTION 'snapshot_invalid_sale_item'; END IF;
 IF EXISTS(SELECT 1 FROM public.mobile_sync_snapshot_rows p WHERE p.customer_id=p_customer_id AND p.snapshot_id=p_snapshot_id AND p.entity='bill_payments' AND NOT EXISTS(SELECT 1 FROM public.mobile_sync_snapshot_rows u WHERE u.customer_id=p_customer_id AND u.snapshot_id=p_snapshot_id AND u.entity='bills' AND u.source_key=p.payload->>'bill_source_id')) THEN RAISE EXCEPTION 'snapshot_invalid_bill_payment'; END IF;
 SELECT snapshot_id INTO v_previous_snapshot_id FROM public.mobile_sync_snapshots WHERE customer_id=p_customer_id AND status='active' AND snapshot_id<>p_snapshot_id FOR UPDATE;
 -- Revoke sessions if a user was removed, disabled, or had their password changed.
 IF v_previous_snapshot_id IS NOT NULL THEN
  UPDATE public.mobile_sessions s SET revoked_at=now()
  WHERE s.customer_id=p_customer_id AND s.revoked_at IS NULL AND EXISTS(
   SELECT 1 FROM public.mobile_sync_snapshot_rows old
   WHERE old.customer_id=p_customer_id AND old.snapshot_id=v_previous_snapshot_id AND old.entity='users' AND old.source_key=s.user_source_id
   AND NOT EXISTS(
    SELECT 1 FROM public.mobile_sync_snapshot_rows n
    WHERE n.customer_id=p_customer_id AND n.snapshot_id=p_snapshot_id AND n.entity='users' AND n.source_key=old.source_key
      AND n.payload->>'password_hash'=old.payload->>'password_hash'
      AND (n.payload->>'is_active')::boolean=true
   )
  );
 END IF;
 UPDATE public.mobile_sync_snapshots SET status='superseded',updated_at=now() WHERE customer_id=p_customer_id AND status='active';
 UPDATE public.mobile_sync_snapshots SET status='active',updated_at=now(),completed_at=now() WHERE customer_id=p_customer_id AND snapshot_id=p_snapshot_id;
 RETURN jsonb_build_object('ok',true,'status','active','synced_at',now());
END; $$;
REVOKE ALL ON FUNCTION public.finalize_mobile_sync_snapshot(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_mobile_sync_snapshot(uuid,text,uuid) TO service_role;
