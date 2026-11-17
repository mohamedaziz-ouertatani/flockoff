import { expect, test } from "@playwright/test";

/** A new customer signs up, buys something, and finds it in their order history. */
test("customer can sign up, order, and see the order in their account", async ({ page }) => {
  const email = `e2e-${Date.now()}@test.local`;
  const password = "e2e correct horse";

  await page.goto("/login");
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page).toHaveURL("/signup");

  // Mismatched passwords are caught inline, and the other fields are kept.
  await page.getByLabel("First name").fill("Sami");
  await page.getByLabel("Last name").fill("Haddad");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill("something else");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Passwords don't match")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue(email);

  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  // Signed in and on the (empty) account page.
  await expect(page).toHaveURL("/account");
  await expect(page.getByRole("heading", { level: 1, name: "Hi, Sami" })).toBeVisible();
  await expect(page.getByText("No orders yet")).toBeVisible();

  // Buy something. Checkout is prefilled from the account.
  await page.goto("/product/medina-street-tee");
  await page.getByRole("radio", { name: "L", exact: true }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.goto("/checkout");
  await expect(page.getByLabel("Email")).toHaveValue(email);
  await expect(page.getByLabel("First name")).toHaveValue("Sami");
  await expect(page.getByText("Checking out as a guest")).toHaveCount(0);
  await page.getByLabel("Phone").fill("98 765 432");
  await page.getByLabel("Street address").fill("3 Avenue Habib Bourguiba");
  await page.getByLabel("City").fill("Sousse");
  await page.getByLabel("Postal code").fill("4000");
  await page.getByRole("button", { name: "Place order · 77 TND" }).click();
  await expect(page).toHaveURL(/\/order\/FO-[2-9A-HJ-NP-Z]{4}$/);
  const shortCode = page.url().split("/").pop()!;

  // The header's account icon leads to the history, which lists the order.
  await page.getByRole("link", { name: "Your account" }).click();
  await expect(page).toHaveURL("/account");
  const row = page.getByRole("link", { name: new RegExp(shortCode) });
  await expect(row).toContainText("Received");
  await expect(row).toContainText("Medina Street Tee (L)");
  await expect(row).toContainText("77 TND");

  // Signing up again with the same email is refused.
  await page.getByRole("button", { name: "Sign out" }).click();
  // Wait for sign-out to finish; navigating earlier would still carry the old session.
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
  await page.goto("/signup");
  await page.getByLabel("First name").fill("Someone");
  await page.getByLabel("Last name").fill("Else");
  await page.getByLabel("Email").fill(email.toUpperCase());
  await page.getByLabel("Password", { exact: true }).fill("another password");
  await page.getByLabel("Confirm password").fill("another password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("An account with this email already exists")).toBeVisible();
});
