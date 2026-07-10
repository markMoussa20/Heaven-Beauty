import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/AdminTable";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmDialog";
import { ErrorMessage } from "@/components/admin/ErrorMessage";
import { FooterLinkForm } from "@/components/admin/forms/FooterLinkForm";
import { FooterSettingsForm } from "@/components/admin/forms/FooterSettingsForm";
import { PublicPageFaqItemForm } from "@/components/admin/forms/PublicPageFaqItemForm";
import { PublicPageForm } from "@/components/admin/forms/PublicPageForm";
import { SiteContentForm } from "@/components/admin/forms/SiteContentForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { deleteFooterLink, deletePublicPageFaqItem } from "@/lib/admin/actions";
import { listRows } from "@/lib/admin/data";
import type {
  FooterLink,
  PublicPage,
  PublicPageFaqItem,
  SiteContent,
} from "@/types/database";

export const metadata = { title: "Content" };

export default async function AdminContentPage() {
  const [
    pagesResult,
    faqItemsResult,
    siteContentResult,
    footerSettingsResult,
    footerLinksResult,
  ] = await Promise.all([
      listRows("public_pages", {
        order: "sort_order",
        searchColumns: ["slug", "title", "body"],
      }),
      listRows("public_page_faq_items", {
        order: "sort_order",
        searchColumns: ["question", "answer", "group_title"],
      }),
      listRows("site_content", {
        order: "sort_order",
        searchColumns: ["key", "title", "body"],
      }),
      listRows("site_content", {
        filters: { key: "footer_settings" },
        order: "created_at",
      }),
      listRows("footer_links", {
        order: "sort_order",
        searchColumns: ["label", "href", "group_key"],
      }),
    ]);

  const pages = pagesResult.data as PublicPage[];
  const faqItems = faqItemsResult.data as PublicPageFaqItem[];
  const siteBlocks = siteContentResult.data as SiteContent[];
  const footerSettings = footerSettingsResult.data[0] as SiteContent | undefined;
  const footerLinks = footerLinksResult.data as FooterLink[];
  const error =
    pagesResult.error ??
    faqItemsResult.error ??
    siteContentResult.error ??
    footerSettingsResult.error ??
    footerLinksResult.error;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Content"
        description="Manage public pages, homepage sections, and footer content from one place."
      />
      <ErrorMessage message={error} />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">Public pages</h2>
          <p className="text-sm text-zinc-500">
            These rows feed URLs like /our-story, /faq, and /privacy-policy.
          </p>
        </div>
        <details className="rounded-lg border border-zinc-200 bg-white p-4">
          <summary className="cursor-pointer font-medium">Create page</summary>
          <div className="mt-4">
            <PublicPageForm />
          </div>
        </details>
        <AdminTable
          columns={[
            { key: "slug", header: "Slug", render: (row) => row.slug },
            { key: "title", header: "Title", render: (row) => row.title },
            { key: "sort", header: "Sort", render: (row) => row.sort_order ?? "-" },
            {
              key: "active",
              header: "Status",
              render: (row) => (
                <StatusBadge tone={row.is_active ? "green" : "neutral"}>
                  {row.is_active ? "Active" : "Inactive"}
                </StatusBadge>
              ),
            },
          ]}
          rows={pages}
        />
        <div className="grid gap-4">
          {pages.map((page) => (
            <details
              className="rounded-lg border border-zinc-200 bg-white p-4"
              key={page.id}
            >
              <summary className="cursor-pointer font-medium">
                Edit {page.title}
              </summary>
              <div className="mt-4">
                <PublicPageForm page={page} />
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">FAQ questions</h2>
          <p className="text-sm text-zinc-500">
            Each row feeds an accordion question on /faq.
          </p>
        </div>
        <details className="rounded-lg border border-zinc-200 bg-white p-4">
          <summary className="cursor-pointer font-medium">
            Create FAQ question
          </summary>
          <div className="mt-4">
            <PublicPageFaqItemForm />
          </div>
        </details>
        <AdminTable
          columns={[
            { key: "group", header: "Group", render: (row) => row.group_title ?? "-" },
            { key: "question", header: "Question", render: (row) => row.question },
            { key: "sort", header: "Sort", render: (row) => row.sort_order ?? "-" },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <StatusBadge tone={row.is_active ? "green" : "neutral"}>
                  {row.is_active ? "Active" : "Inactive"}
                </StatusBadge>
              ),
            },
            {
              key: "delete",
              header: "Delete",
              render: (row) => (
                <form action={deletePublicPageFaqItem.bind(null, row.id)}>
                  <ConfirmSubmitButton
                    className="text-sm text-red-600 underline"
                    message="Delete this FAQ item?"
                  >
                    Delete
                  </ConfirmSubmitButton>
                </form>
              ),
            },
          ]}
          rows={faqItems}
        />
        <div className="grid gap-4">
          {faqItems.map((item) => (
            <details
              className="rounded-lg border border-zinc-200 bg-white p-4"
              key={item.id}
            >
              <summary className="cursor-pointer font-medium">
                Edit {item.question}
              </summary>
              <div className="mt-4">
                <PublicPageFaqItemForm item={item} />
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">Homepage blocks</h2>
          <p className="text-sm text-zinc-500">
            These blocks feed homepage sections and reusable site copy.
          </p>
        </div>
        <details className="rounded-lg border border-zinc-200 bg-white p-4">
          <summary className="cursor-pointer font-medium">
            Create content block
          </summary>
          <div className="mt-4">
            <SiteContentForm />
          </div>
        </details>
        <AdminTable
          columns={[
            { key: "key", header: "Key", render: (row) => row.key },
            { key: "title", header: "Title", render: (row) => row.title ?? "-" },
            { key: "sort", header: "Sort", render: (row) => row.sort_order ?? "-" },
            {
              key: "active",
              header: "Status",
              render: (row) => (
                <StatusBadge tone={row.is_active ? "green" : "neutral"}>
                  {row.is_active ? "Active" : "Inactive"}
                </StatusBadge>
              ),
            },
          ]}
          rows={siteBlocks}
        />
        <div className="grid gap-4">
          {siteBlocks.map((block) => (
            <details
              className="rounded-lg border border-zinc-200 bg-white p-4"
              key={block.id}
            >
              <summary className="cursor-pointer font-medium">
                Edit {block.title ?? block.key}
              </summary>
              <div className="mt-4">
                <SiteContentForm block={block} />
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">Footer</h2>
          <p className="text-sm text-zinc-500">
            Footer brand text, contact lines, columns, and social links.
          </p>
        </div>
        <FooterSettingsForm settings={footerSettings} />
        <details className="rounded-lg border border-zinc-200 bg-white p-4">
          <summary className="cursor-pointer font-medium">
            Create footer link
          </summary>
          <div className="mt-4">
            <FooterLinkForm />
          </div>
        </details>
        <AdminTable
          columns={[
            { key: "group", header: "Group", render: (row) => row.group_key },
            { key: "label", header: "Label", render: (row) => row.label },
            { key: "href", header: "Link", render: (row) => row.href },
            { key: "sort", header: "Sort", render: (row) => row.sort_order ?? "-" },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <StatusBadge tone={row.is_active ? "green" : "neutral"}>
                  {row.is_active ? "Active" : "Inactive"}
                </StatusBadge>
              ),
            },
            {
              key: "delete",
              header: "Delete",
              render: (row) => (
                <form action={deleteFooterLink.bind(null, row.id)}>
                  <ConfirmSubmitButton
                    className="text-sm text-red-600 underline"
                    message="Delete this footer link?"
                  >
                    Delete
                  </ConfirmSubmitButton>
                </form>
              ),
            },
          ]}
          rows={footerLinks}
        />
        <div className="grid gap-4">
          {footerLinks.map((link) => (
            <details
              className="rounded-lg border border-zinc-200 bg-white p-4"
              key={link.id}
            >
              <summary className="cursor-pointer font-medium">
                Edit {link.label}
              </summary>
              <div className="mt-4">
                <FooterLinkForm link={link} />
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
