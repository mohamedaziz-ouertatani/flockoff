import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/admin/page-header";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { listTaxonomy } from "@/lib/services/admin/taxonomy";

export const metadata: Metadata = { title: "Categories & collections" };

export default async function AdminCatalogPage() {
  const { categories, collections } = await listTaxonomy();
  return (
    <>
      <PageHeader title="Categories & collections" description="Collections appear in the shop's top navigation." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <h2 className="mb-1 text-sm font-medium">Categories</h2>
          <p className="mb-2 text-xs text-muted-foreground">Every product needs one (Hoodie, T-shirt…).</p>
          <TaxonomyManager kind="category" items={categories} />
        </Panel>
        <Panel>
          <h2 className="mb-1 text-sm font-medium">Collections</h2>
          <p className="mb-2 text-xs text-muted-foreground">Optional drops or themes (Winter 2023, 1st Anniversary…).</p>
          <TaxonomyManager kind="collection" items={collections} />
        </Panel>
      </div>
    </>
  );
}
