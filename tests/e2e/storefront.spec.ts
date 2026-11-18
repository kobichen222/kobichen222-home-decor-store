import { expect, test } from "@playwright/test";

test("home page renders the managed sections", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("מעצבים את החלל");
  await expect(page.getByRole("heading", { name: "הנמכרים ביותר" })).toBeVisible();
  await expect(page.locator('script[type="application/ld+json"]').first()).toBeAttached();
});

test("search matches across name, colour and size", async ({ page }) => {
  await page.goto("/shop?q=" + encodeURIComponent("שעון קיר שחור גדול"));
  await expect(page.getByRole("status").filter({ hasText: "מוצרים" })).toHaveText("2 מוצרים");
  await expect(page.getByRole("link", { name: "שעון קיר מודרני שחור" })).toBeVisible();
});

test("filters narrow a category and are not indexable", async ({ page }) => {
  await page.goto("/category/wall-clocks");
  await expect(page.getByRole("status").filter({ hasText: "מוצרים" })).toHaveText("4 מוצרים");
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  await page.getByRole("complementary", { name: "סינון מוצרים" }).getByText("עץ").click();
  await expect(page).toHaveURL(/f=/);
  await expect(page.getByRole("status").filter({ hasText: "מוצרים" })).toHaveText("1 מוצרים");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/category\/wall-clocks$/);
});

test("product page exposes Product structured data", async ({ page }) => {
  await page.goto("/product/modern-wall-clock");
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const product = blocks.map((b) => JSON.parse(b)).find((b) => b["@type"] === "Product");
  expect(product.offers.priceCurrency).toBe("ILS");
  expect(product.offers.price ?? product.offers.lowPrice).toBe(229);
});

test("sold-out product cannot be added to the cart", async ({ page }) => {
  await page.goto("/product/sage-wall-clock");
  await expect(page.getByRole("status").filter({ hasText: "אזל מהמלאי" })).toBeVisible();
  await expect(page.getByRole("button", { name: "הוספה לסל" })).toBeDisabled();
});

test("admin area requires sign-in", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("navigating to another page starts at the top", async ({ page }) => {
  await page.goto("/");
  const link = page.locator('a[href^="/product/"]').first();
  await link.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
  await link.click();
  await page.waitForURL(/\/product\//);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});
