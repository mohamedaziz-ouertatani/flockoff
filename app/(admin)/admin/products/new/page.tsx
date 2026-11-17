import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Panel } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { getCategories, getCollections } from "@/lib/services/catalog";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  const [categories, collections] = await Promise.all([getCategories(), getCollections()]);
  return (
    <>
      <Link href="/admin/products" className="text-sm text-muted-foreground hover:text-foreground">
        ← Products
      </Link>
      <PageHeader title="New product" description="Images can be added once the product is created." />
      <Panel className="max-w-3xl">
        <ProductForm
          mode="create"
          categories={categories}
          collections={collections}
          initial={{
            name: "",
            slug: "",
            price: "",
            categoryId: "",
            collectionId: "",
            description: "",
            isFeatured: false,
            isActive: true,
            variants: (["S", "M", "L", "XL"] as const).map((size) => ({ size, stock: 0 })),
          }}
        />
      </Panel>
    </>
  );
}
