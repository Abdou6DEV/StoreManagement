WITH ranked_sessions AS (
  SELECT
    session_hash,
    ROW_NUMBER() OVER (
      PARTITION BY mobile_device_id
      ORDER BY (expires_at > now()) DESC, last_used_at DESC, created_at DESC
    ) AS session_rank
  FROM public.mobile_sessions
  WHERE revoked_at IS NULL
)
UPDATE public.mobile_sessions AS sessions
SET revoked_at = now()
FROM ranked_sessions
WHERE sessions.session_hash = ranked_sessions.session_hash
  AND ranked_sessions.session_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS mobile_sessions_one_unrevoked_per_device_idx
  ON public.mobile_sessions (mobile_device_id)
  WHERE revoked_at IS NULL;