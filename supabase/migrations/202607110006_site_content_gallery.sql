-- Adds upload-backed gallery image support to site_content, replacing the
-- marquee_text-as-image-list hack the hero banner previously relied on.
alter table public.site_content add column if not exists gallery_image_urls text[];
