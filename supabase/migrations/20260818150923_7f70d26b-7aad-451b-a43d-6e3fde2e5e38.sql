UPDATE public.tenants t
SET token_icon_url = 'data:image/svg+xml;utf8,' || replace(replace(replace(replace(
  '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="62" fill="' || COALESCE(t.theme->>'primary','#f59e0b') || '"/><circle cx="64" cy="64" r="62" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="4"/><text x="64" y="86" font-size="62" text-anchor="middle">🪙</text></svg>',
  '<','%3C'),'>','%3E'),'"','%22'),'#','%23')
WHERE token_icon_url IS NULL OR token_icon_url = '';