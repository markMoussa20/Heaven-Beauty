import { AdminFormField } from "@/components/admin/AdminFormField";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { InlineCheckbox } from "@/components/admin/InlineCheckbox";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { saveSiteContent } from "@/lib/admin/actions";
import type { SiteContent } from "@/types/database";

function CurrentImage({ url }: { url?: string | null }) {
  if (!url) {
    return <p className="text-xs text-zinc-500">No image uploaded yet.</p>;
  }

  return (
    <a
      className="block text-xs text-zinc-500 underline"
      href={url}
      rel="noreferrer"
      target="_blank"
    >
      View current image
    </a>
  );
}

export function SiteContentForm({ block }: { block?: Partial<SiteContent> }) {
  const action = saveSiteContent.bind(null, block?.id ?? null);
  const galleryUrls = block?.gallery_image_urls ?? [];
  const isHero = block?.key === "home_hero";

  return (
    <AdminActionForm
      action={action}
      className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-2"
    >
      <AdminFormField label="Key" hint="Unique machine name, for example home_story.">
        <input
          className={`h-10 rounded-md border border-zinc-300 px-3 ${
            block?.id ? "bg-zinc-50 text-zinc-500" : ""
          }`}
          defaultValue={block?.key ?? ""}
          name="key"
          readOnly={Boolean(block?.id)}
          aria-readonly={Boolean(block?.id)}
          required
        />
      </AdminFormField>
      <AdminFormField label="Sort order">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={block?.sort_order ?? ""}
          name="sort_order"
          type="number"
        />
      </AdminFormField>
      <AdminFormField label="Title">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={block?.title ?? ""}
          name="title"
        />
      </AdminFormField>
      <AdminFormField label="Subtitle">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={block?.subtitle ?? ""}
          name="subtitle"
        />
      </AdminFormField>
      <AdminFormField label="Body">
        <textarea
          className="min-h-32 rounded-md border border-zinc-300 px-3 py-2"
          defaultValue={block?.body ?? ""}
          name="body"
        />
      </AdminFormField>
      <AdminFormField
        label="Marquee text"
        hint="Only used by the scrolling marquee block, not for slide images."
      >
        <textarea
          className="min-h-32 rounded-md border border-zinc-300 px-3 py-2"
          defaultValue={block?.marquee_text ?? ""}
          name="marquee_text"
        />
      </AdminFormField>
      <AdminFormField label="Button label">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={block?.cta_label ?? ""}
          name="cta_label"
        />
      </AdminFormField>
      <AdminFormField label="Button link">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={block?.cta_href ?? ""}
          name="cta_href"
        />
      </AdminFormField>
      <AdminFormField
        hint="Uploading replaces this image."
        label={isHero ? "Slide 1 image" : "Primary image"}
      >
        <div className="grid gap-2">
          <CurrentImage url={block?.image_url} />
          <ImageUploader name="content_primary_image" />
        </div>
      </AdminFormField>
      <AdminFormField label="Image alt text">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={block?.image_alt ?? ""}
          name="image_alt"
        />
      </AdminFormField>
      <AdminFormField
        hint="Uploading replaces this image."
        label={isHero ? "Slide 2 image" : "Second image"}
      >
        <div className="grid gap-2">
          <CurrentImage url={block?.secondary_image_url} />
          <ImageUploader name="content_secondary_image" />
        </div>
      </AdminFormField>
      <AdminFormField label="Second image alt text">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={block?.secondary_image_alt ?? ""}
          name="secondary_image_alt"
        />
      </AdminFormField>
      {isHero ? (
        <AdminFormField
          hint="Additional slides beyond the first two. Uncheck 'keep' to remove one, upload new files to add more."
          label="Additional slide images"
        >
          <div className="grid gap-3 rounded-md border border-zinc-200 p-3">
            <input name="gallery_section_present" type="hidden" value="1" />
            {galleryUrls.length > 0 ? (
              <div className="grid gap-2">
                {galleryUrls.map((url) => (
                  <label className="flex items-center gap-2 text-xs" key={url}>
                    <input
                      defaultChecked
                      name="existing_gallery_image_url"
                      type="checkbox"
                      value={url}
                    />
                    <a
                      className="truncate text-zinc-600 underline"
                      href={url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {url}
                    </a>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">No additional slides yet.</p>
            )}
            <ImageUploader multiple name="content_gallery_images" />
          </div>
        </AdminFormField>
      ) : null}
      <div className="flex items-end">
        <InlineCheckbox
          defaultChecked={block?.is_active ?? true}
          label="Active"
          name="is_active"
        />
      </div>
      <div className="md:col-span-2">
        <SubmitButton
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white"
        >
          Save content
        </SubmitButton>
      </div>
    </AdminActionForm>
  );
}
