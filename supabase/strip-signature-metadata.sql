-- Remove PNG signatures stored in auth user metadata.
-- Large base64 signatures inflate JWT/session cookies and can trigger HTTP 431
-- (Request Header Fields Too Large) on every authenticated page load.
--
-- Run once in the Supabase SQL editor, then clear browser cookies for localhost.
-- Note: via Admin API you must set signature to null (not omit the key) to delete it.

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'signature'
WHERE raw_user_meta_data ? 'signature';
