-- Resumable mobile snapshot staging. Active mirror rows remain untouched until finalize.
CREATE TABLE public.mobile_sync_snapshots (
 customer_id uuid NOT NULL, snapshot_id uuid NOT NULL, device_id text NOT NULL,
 status text NOT NULL CHECK (status IN ('uploading','active','superseded','abandoned')),
 expected_counts jsonb NOT NULL, expected_chunks jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
 PRIMARY KEY(customer_id,snapshot_id)
);
CREATE UNIQUE INDEX mobile_sync_one_upload_per_device ON public.mobile_sync_snapshots(customer_id,device_id) WHERE status='uploading';
CREATE UNIQUE INDEX mobile_sync_one_active_per_customer ON public.mobile_sync_snapshots(customer_id) WHERE status='active';
CREATE INDEX mobile_sync_snapshots_expiry_idx ON public.mobile_sync_snapshots(created_at) WHERE status='uploading';
CREATE TABLE public.mobile_sync_snapshot_chunks (
 customer_id uuid NOT NULL, snapshot_id uuid NOT NULL, entity text NOT NULL,
 chunk_index integer NOT NULL CHECK(chunk_index>=0), checksum text NOT NULL CHECK(checksum ~ '^[0-9a-f]{64}$'),
 row_count integer NOT NULL CHECK(row_count>0), created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(customer_id,snapshot_id,entity,chunk_index),
 FOREIGN KEY(customer_id,snapshot_id) REFERENCES public.mobile_sync_snapshots(customer_id,snapshot_id) ON DELETE CASCADE
);
CREATE TABLE public.mobile_sync_snapshot_rows (
 customer_id uuid NOT NULL, snapshot_id uuid NOT NULL, entity text NOT NULL, source_key text NOT NULL,
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
 PRIMARY KEY(customer_id,snapshot_id,entity,source_key),
 FOREIGN KEY(customer_id,snapshot_id) REFERENCES public.mobile_sync_snapshots(customer_id,snapshot_id) ON DELETE CASCADE
);
CREATE INDEX mobile_sync_snapshot_rows_entity_idx ON public.mobile_sync_snapshot_rows(customer_id,snapshot_id,entity);
ALTER TABLE public.mobile_sync_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobile_sync_snapshot_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobile_sync_snapshot_rows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mobile_sync_snapshots,public.mobile_sync_snapshot_chunks,public.mobile_sync_snapshot_rows FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.mobile_sync_snapshots,public.mobile_sync_snapshot_chunks,public.mobile_sync_snapshot_rows TO service_role;
-- Resumable mobile snapshot staging schema

CREATE OR REPLACE FUNCTION public.begin_mobile_sync_snapshot(p_customer_id uuid,p_device_id text,p_snapshot_id uuid,p_expected_counts jsonb,p_expected_chunks jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_existing public.mobile_sync_snapshots%ROWTYPE;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_customer_id::text,0));
 DELETE FROM public.mobile_sync_snapshots WHERE customer_id=p_customer_id AND status IN ('abandoned','superseded') AND created_at<now()-interval '1 day';
 UPDATE public.mobile_sync_snapshots SET status='abandoned',updated_at=now()
 WHERE customer_id=p_customer_id AND device_id=p_device_id AND status='uploading' AND (snapshot_id<>p_snapshot_id OR created_at<now()-interval '24 hours');
 INSERT INTO public.mobile_sync_snapshots(customer_id,snapshot_id,device_id,status,expected_counts,expected_chunks)
 VALUES(p_customer_id,p_snapshot_id,p_device_id,'uploading',p_expected_counts,p_expected_chunks)
 ON CONFLICT(customer_id,snapshot_id) DO NOTHING;
 SELECT * INTO v_existing FROM public.mobile_sync_snapshots WHERE customer_id=p_customer_id AND snapshot_id=p_snapshot_id FOR UPDATE;
 IF v_existing.device_id<>p_device_id OR v_existing.expected_counts<>p_expected_counts OR v_existing.expected_chunks<>p_expected_chunks OR v_existing.status NOT IN ('uploading','active') THEN
  RAISE EXCEPTION 'snapshot_manifest_conflict';
 END IF;
 RETURN jsonb_build_object('ok',true,'status',v_existing.status);
END; $$;

CREATE OR REPLACE FUNCTION public.stage_mobile_sync_chunk(p_customer_id uuid,p_device_id text,p_snapshot_id uuid,p_entity text,p_chunk_index integer,p_checksum text,p_rows jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_snapshot public.mobile_sync_snapshots%ROWTYPE; v_existing public.mobile_sync_snapshot_chunks%ROWTYPE; v_expected_chunks integer; v_expected_rows integer; v_count integer;
BEGIN
 SELECT * INTO v_snapshot FROM public.mobile_sync_snapshots WHERE customer_id=p_customer_id AND snapshot_id=p_snapshot_id FOR UPDATE;
 IF NOT FOUND OR v_snapshot.status<>'uploading' OR v_snapshot.device_id<>p_device_id THEN RAISE EXCEPTION 'snapshot_not_uploading_or_owned'; END IF;
 IF jsonb_typeof(p_rows)<>'array' OR jsonb_array_length(p_rows)<1 THEN RAISE EXCEPTION 'invalid_chunk_rows'; END IF;
 IF NOT(v_snapshot.expected_chunks ? p_entity) OR NOT(v_snapshot.expected_counts ? p_entity) THEN RAISE EXCEPTION 'unknown_snapshot_entity'; END IF;
 v_expected_chunks:=(v_snapshot.expected_chunks->>p_entity)::integer; v_expected_rows:=(v_snapshot.expected_counts->>p_entity)::integer;
 IF p_chunk_index<0 OR p_chunk_index>=v_expected_chunks OR jsonb_array_length(p_rows)>100 THEN RAISE EXCEPTION 'invalid_chunk_index_or_size'; END IF;
 SELECT * INTO v_existing FROM public.mobile_sync_snapshot_chunks WHERE customer_id=p_customer_id AND snapshot_id=p_snapshot_id AND entity=p_entity AND chunk_index=p_chunk_index;
 IF FOUND THEN
  IF v_existing.checksum<>p_checksum OR v_existing.row_count<>jsonb_array_length(p_rows) THEN RAISE EXCEPTION 'chunk_retry_conflict'; END IF;
  RETURN jsonb_build_object('ok',true,'duplicate',true);
 END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_rows) AS chunk_row(value) WHERE value->>'customer_id'<>p_customer_id::text) THEN RAISE EXCEPTION 'chunk_customer_mismatch'; END IF;
 INSERT INTO public.mobile_sync_snapshot_rows(customer_id,snapshot_id,entity,source_key,payload)
 SELECT p_customer_id,p_snapshot_id,p_entity,CASE WHEN p_entity='dashboard_daily' THEN value->>'local_day' ELSE value->>'source_id' END,value
 FROM jsonb_array_elements(p_rows) AS chunk_row(value);
 INSERT INTO public.mobile_sync_snapshot_chunks(customer_id,snapshot_id,entity,chunk_index,checksum,row_count)
 VALUES(p_customer_id,p_snapshot_id,p_entity,p_chunk_index,p_checksum,jsonb_array_length(p_rows));
 SELECT count(*) INTO v_count FROM public.mobile_sync_snapshot_rows WHERE customer_id=p_customer_id AND snapshot_id=p_snapshot_id AND entity=p_entity;
 IF v_count>v_expected_rows THEN RAISE EXCEPTION 'snapshot_entity_overflow'; END IF;
 RETURN jsonb_build_object('ok',true,'duplicate',false);
END; $$;

CREATE OR REPLACE FUNCTION public.finalize_mobile_sync_snapshot(p_customer_id uuid,p_device_id text,p_snapshot_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_snapshot public.mobile_sync_snapshots%ROWTYPE; v_entity text; v_target text; v_count integer;
 v_version bigint:=floor(extract(epoch FROM clock_timestamp())*1000)::bigint; i integer;
 v_entities text[]:=ARRAY['users','permissions','categories','products','manual_products','suppliers','purchases','purchase_items','clients','services','service_appointments','sales','sale_items','payments','bills','bill_payments','dashboard_daily'];
 v_targets text[]:=ARRAY['pos_users','pos_user_permissions','pos_categories','pos_products','pos_manual_products','pos_suppliers','pos_purchases','pos_purchase_items','pos_clients','pos_services','pos_service_appointments','pos_sales','pos_sale_items','pos_payments','pos_bills','pos_bill_payments','pos_dashboard_daily'];
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
 -- Check parent references before changing the active mirror.
 IF NOT EXISTS(SELECT 1 FROM public.mobile_sync_snapshot_rows u WHERE u.customer_id=p_customer_id AND u.snapshot_id=p_snapshot_id AND u.entity='users' AND (u.payload->>'is_active')::boolean=true) THEN RAISE EXCEPTION 'snapshot_has_no_active_user'; END IF;
 IF EXISTS(SELECT 1 FROM public.mobile_sync_snapshot_rows p WHERE p.customer_id=p_customer_id AND p.snapshot_id=p_snapshot_id AND p.entity='permissions' AND NOT EXISTS(SELECT 1 FROM public.mobile_sync_snapshot_rows u WHERE u.customer_id=p_customer_id AND u.snapshot_id=p_snapshot_id AND u.entity='users' AND u.source_key=p.payload->>'user_source_id')) THEN RAISE EXCEPTION 'snapshot_invalid_permission_user'; END IF;
 IF EXISTS(SELECT 1 FROM public.mobile_sync_snapshot_rows p WHERE p.customer_id=p_customer_id AND p.snapshot_id=p_snapshot_id AND p.entity='purchases' AND p.payload->>'supplier_source_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.mobile_sync_snapshot_rows u WHERE u.customer_id=p_customer_id AND u.snapshot_id=p_snapshot_id AND u.entity='suppliers' AND u.source_key=p.payload->>'supplier_source_id')) THEN RAISE EXCEPTION 'snapshot_invalid_purchase_supplier'; END IF;
 IF EXISTS(SELECT 1 FROM public.mobile_sync_snapshot_rows p WHERE p.customer_id=p_customer_id AND p.snapshot_id=p_snapshot_id AND p.entity='purchase_items' AND (NOT EXISTS(SELECT 1 FROM public.mobile_sync_snapshot_rows u WHERE u.customer_id=p_customer_id AND u.snapshot_id=p_snapshot_id AND u.entity='purchases' AND u.source_key=p.payload->>'purchase_source_id') OR NOT EXISTS(SELECT 1 FROM public.mobile_sync_snapshot_rows u WHERE u.customer_id=p_customer_id AND u.snapshot_id=p_snapshot_id AND u.entity='products' AND u.source_key=p.payload->>'product_source_id'))) THEN RAISE EXCEPTION 'snapshot_invalid_purchase_item'; END IF;
 IF EXISTS(SELECT 1 FROM public.mobile_sync_snapshot_rows p WHERE p.customer_id=p_customer_id AND p.snapshot_id=p_snapshot_id AND p.entity='sale_items' AND NOT EXISTS(SELECT 1 FROM public.mobile_sync_snapshot_rows u WHERE u.customer_id=p_customer_id AND u.snapshot_id=p_snapshot_id AND u.entity='sales' AND u.source_key=p.payload->>'sale_source_id')) THEN RAISE EXCEPTION 'snapshot_invalid_sale_item'; END IF;
 IF EXISTS(SELECT 1 FROM public.mobile_sync_snapshot_rows p WHERE p.customer_id=p_customer_id AND p.snapshot_id=p_snapshot_id AND p.entity='bill_payments' AND NOT EXISTS(SELECT 1 FROM public.mobile_sync_snapshot_rows u WHERE u.customer_id=p_customer_id AND u.snapshot_id=p_snapshot_id AND u.entity='bills' AND u.source_key=p.payload->>'bill_source_id')) THEN RAISE EXCEPTION 'snapshot_invalid_bill_payment'; END IF;
 -- Revoke sessions when an account is removed, disabled, or its password changes.
 UPDATE public.mobile_sessions s SET revoked_at=now()
 WHERE s.customer_id=p_customer_id AND s.revoked_at IS NULL AND EXISTS(
  SELECT 1 FROM public.pos_users old WHERE old.customer_id=p_customer_id AND old.source_id=s.user_source_id
  AND NOT EXISTS(SELECT 1 FROM public.mobile_sync_snapshot_rows n WHERE n.customer_id=p_customer_id AND n.snapshot_id=p_snapshot_id AND n.entity='users' AND n.source_key=old.source_id AND n.payload->>'password_hash'=old.password_hash AND (n.payload->>'is_active')::boolean=old.is_active)
 );
 -- Replace mirror rows inside this transaction. Any constraint/error rolls back the entire activation.
 FOR i IN REVERSE array_length(v_targets,1)..1 LOOP
  EXECUTE format('DELETE FROM public.%I WHERE customer_id=$1',v_targets[i]) USING p_customer_id;
 END LOOP;
 FOR i IN 1..array_length(v_targets,1) LOOP
  v_entity:=v_entities[i]; v_target:=v_targets[i];
  EXECUTE format(
   'INSERT INTO public.%I SELECT (jsonb_populate_record(NULL::public.%I, payload || jsonb_build_object(''sync_version'',$4,''deleted_at'',null) || CASE WHEN payload ? ''source_updated_at'' THEN ''{}''::jsonb ELSE jsonb_build_object(''source_updated_at'',now()) END)).* FROM public.mobile_sync_snapshot_rows WHERE customer_id=$1 AND snapshot_id=$2 AND entity=$3',
   v_target,v_target
  ) USING p_customer_id,p_snapshot_id,v_entity,v_version;
 END LOOP;
 UPDATE public.mobile_sync_snapshots SET status='superseded',updated_at=now() WHERE customer_id=p_customer_id AND status='active';
 UPDATE public.mobile_sync_snapshots SET status='active',updated_at=now(),completed_at=now() WHERE customer_id=p_customer_id AND snapshot_id=p_snapshot_id;
 RETURN jsonb_build_object('ok',true,'status','active','synced_at',now(),'sync_version',v_version);
END; $$;
REVOKE ALL ON FUNCTION public.begin_mobile_sync_snapshot(uuid,text,uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.stage_mobile_sync_chunk(uuid,text,uuid,text,integer,text,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finalize_mobile_sync_snapshot(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_mobile_sync_snapshot(uuid,text,uuid,jsonb,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.stage_mobile_sync_chunk(uuid,text,uuid,text,integer,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_mobile_sync_snapshot(uuid,text,uuid) TO service_role;
