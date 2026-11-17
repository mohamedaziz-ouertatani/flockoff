import { expect, test } from "@playwright/test";
import { E2E_ADMIN } from "../../playwright.config";

/**
 * Guest checkout, end to end: product page -> cart -> checkout -> confirmation.
 * Seed product "Migration Tee – Bone" costs 75 TND; shipping is a flat 7 TND.
 */
test("guest can buy a product with cash on delivery", async ({ page }) => {
  await page.goto("/product/migration-tee-bone");
  await expect(page.getByRole("heading", { level: 1, name: "Migration Tee – Bone" })).toBeVisible();

  // Size is required, and the error is inline (no toast).
  await page.getByRole("button", { name: "Add to cart" }).click();
  // (By id: Next's own route announcer also has role="alert".)
  await expect(page.locator("#size-error")).toHaveText("Please select a size.");

  await page.getByRole("radio", { name: "M", exact: true }).click();
  const available = Number((await page.locator("#qty-hint").textContent())?.match(/^(\d+) available/)?.[1]);
  expect(available).toBeGreaterThanOrEqual(5);

  // Quantity can't be pushed past stock, even by typing.
  const qty = page.getByRole("textbox", { name: "Quantity" });
  await qty.fill("999");
  await expect(qty).toHaveValue(String(available));
  await qty.fill("2");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("status")).toContainText("You have 2 in size M");

  // Header badge shows total quantity.
  const cartLink = page.getByRole("link", { name: "Cart, 2 items" });
  await expect(cartLink).toBeVisible();
  await cartLink.click();

  await expect(page).toHaveURL("/cart");
  const summary = page.getByRole("complementary", { name: "Order summary" });
  await expect(summary).toContainText("Subtotal (2 items)150 TND");
  await expect(summary).toContainText("Shipping7 TND");
  await expect(summary).toContainText("Total157 TND");
  await summary.getByRole("link", { name: "Checkout" }).click();

  // Checkout: the item count must agree with the badge; fields validate inline.
  await expect(page).toHaveURL("/checkout");
  await expect(page.getByRole("complementary", { name: "Order summary" })).toContainText("Subtotal (2 items)");
  await page.getByRole("button", { name: /Place order/ }).click();
  await expect(page.getByText("First name is required")).toBeVisible();

  await page.getByLabel("First name").fill("Yasmine");
  await page.getByLabel("Last name").fill("Trabelsi");
  await page.getByLabel("Email").fill("yasmine.e2e@test.local");
  await page.getByLabel("Phone").fill("22 123 456");
  await page.getByLabel("Street address").fill("12 Rue de Marseille");
  await page.getByLabel("City").fill("Tunis");
  await page.getByLabel("Postal code").fill("1000");
  await page.getByRole("button", { name: "Place order · 157 TND" }).click();

  // Confirmation page with the server-computed total; the cart is emptied.
  await expect(page).toHaveURL(/\/order\/FO-[2-9A-HJ-NP-Z]{4}$/);
  const shortCode = page.url().split("/").pop()!;
  await expect(page.getByRole("heading", { level: 1, name: "Thanks, Yasmine" })).toBeVisible();
  await expect(page.getByText("Have 157 TND ready in cash")).toBeVisible();
  await expect(page.getByText("+216 22 123 456").first()).toBeVisible();
  await expect(page.getByText("Migration Tee – Bone")).toBeVisible();
  await expect(page.getByRole("link", { name: "Cart", exact: true })).toBeVisible();

  // Stock went down by exactly 2.
  await page.goto("/product/migration-tee-bone");
  await page.getByRole("radio", { name: "M", exact: true }).click();
  await expect(page.locator("#qty-hint")).toHaveText(`${available - 2} available`);

  // The admin sees the order, with its date in the "Order date" column (the old site showed IDs there).
  await page.goto(`/login?callbackUrl=${encodeURIComponent(`/admin/orders?q=${shortCode}`)}`);
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/orders\?q=/);
  const row = page.getByRole("row", { name: new RegExp(shortCode) });
  const dateCol = await page.getByRole("columnheader").allTextContents().then((h) => h.indexOf("Order date"));
  expect(dateCol).toBeGreaterThan(-1);
  await expect(row.getByRole("cell").nth(dateCol)).toHaveText(/^\d{1,2} [A-Z][a-z]{2} \d{4}, \d{2}:\d{2}$/);
  await expect(row).toContainText("157 TND");
});
