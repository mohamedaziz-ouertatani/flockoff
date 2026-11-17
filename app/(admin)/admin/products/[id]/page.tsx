import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLinkIcon } from "lucide-react";
import { DeleteProductButton } from "@/components/admin/delete-product-button";
import { ImageManager } from "@/components/admin/image-manager";
import { PageHeader, Panel } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { Button } from "@/components/ui/button";
import { millimesToTndInput } from "@/lib/money";
import { getAdminProduct } from "@/lib/services/admin/products";
import { getCategories, getCollections } from "@/lib/services/catalog";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getAdminProduct((await params).id);
  return { title: p ? p.name : "Product not found" };
}

export default async function EditProductPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { created } = await searchParams;
  const [product, categories, collections] = await Promise.all([getAdminProduct(id), getCategories(), getCollections()]);
  if (!product) notFound();

  return (
    <>
      <Link href="/admin/products" className="text-sm text-muted-foreground hover:text-foreground">
        ← Products
      </Link>
      <PageHeader
        title={product.name}
        description={created ? "Product created. Add some images below." : undefined}
        actions={
          product.isActive && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/product/${product.slug}`} target="_blank">
                View in shop <ExternalLinkIcon />
              </Link>
            </Button>
          )
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel>
          <ProductForm
            mode="edit"
            productId={product.id}
            categories={categories}
            collections={collections}
            initial={{
              name: product.name,
              slug: product.slug,
              price: millimesToTndInput(product.price),
              categoryId: product.categoryId,
              collectionId: product.collectionId ?? "",
              description: product.description,
              isFeatured: product.isFeatured,
              isActive: product.isActive,
              variants: product.variants,
            }}
          />
        </Panel>
        <div className="flex flex-col gap-6">
          <Panel>
            <h2 className="mb-4 text-sm font-medium">Images</h2>
            <ImageManager productId={product.id} images={product.images} />
          </Panel>
          <Panel>
            <h2 className="mb-3 text-sm font-medium">Danger zone</h2>
            <DeleteProductButton productId={product.id} name={product.name} />
          </Panel>
        </div>
      </div>
    </>
  );
}
