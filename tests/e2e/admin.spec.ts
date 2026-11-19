import { expect, test, type Page } from "@playwright/test";

// Local admin users are created by `npm run admin:create` (see README).
async function signIn(page: Page, email: string, password: string) {
  await page.goto("/admin/login");
  await page.getByLabel("דוא״ל").fill(email);
  await page.getByLabel("סיסמה").fill(password);
  await page.getByRole("button", { name: "כניסה" }).click();
}

test("wrong password is rejected", async ({ page }) => {
  await signIn(page, "owner@example.com", "definitely-wrong");
  await expect(page.getByRole("alert").filter({ hasText: "פרטי ההתחברות שגויים" })).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("owner creates a product and it goes live on the storefront", async ({ page }) => {
  const stamp = Date.now().toString(36);
  const name = `מראה בדיקה ${stamp}`;
  await signIn(page, "owner@example.com", "local-owner-password");
  await expect(page.getByRole("heading", { name: "לוח בקרה" })).toBeVisible();

  await page.getByRole("link", { name: "מוצרים", exact: true }).click();
  await page.getByRole("link", { name: "+ מוצר חדש" }).click();
  await page.getByLabel("שם המוצר").fill(name);
  await page.locator("#sku").fill(`TST-${stamp}`);
  await page.getByLabel("כתובת URL (slug)").fill(`test-mirror-${stamp}`);
  await page.getByRole("tabpanel", { name: "פרטים כלליים" }).getByLabel("סטטוס").selectOption("active");
  await page.getByLabel("מראות", { exact: true }).check();

  await page.getByRole("tab", { name: "מחירים" }).click();
  await page.getByLabel("מחיר רגיל").fill("450");
  await page.locator("#sale_price").fill("500"); // invalid: not lower
  await page.getByRole("button", { name: "יצירת מוצר" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "מחיר המבצע חייב להיות נמוך" }).first()).toBeVisible();
  // The failed save kept everything that was typed.
  await expect(page.locator("#name")).toHaveValue(name);
  await page.getByRole("tab", { name: "מחירים" }).click();
  await page.locator("#sale_price").fill("399");

  await page.getByRole("tab", { name: "וריאציות ומלאי" }).click();
  await page.getByLabel("מלאי וריאציה 1").fill("3");
  await page.getByRole("button", { name: "יצירת מוצר" }).click();
  await expect(page.getByText("המוצר נוצר. עכשיו אפשר להעלות תמונות.")).toBeVisible();

  // Live on the storefront, with the sale price and real stock.
  await page.goto(`/product/test-mirror-${stamp}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page.getByText("399").first()).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "נותרו 3 יחידות אחרונות" })).toBeVisible();

  // Archive it again: it disappears from the storefront.
  await page.goto(`/admin/products?q=TST-${stamp}`);
  await page.getByRole("button", { name: "ארכיון" }).click();
  await expect(page.getByText("לא נמצאו מוצרים")).toBeVisible();
  await page.goto(`/product/test-mirror-${stamp}`);
  await expect(page.getByRole("heading", { name: "העמוד הזה לא נמצא" })).toBeVisible();
});

test("catalog manager cannot open orders", async ({ page }) => {
  await signIn(page, "catalog@example.com", "local-catalog-password");
  await expect(page.getByRole("heading", { name: "לוח בקרה" })).toBeVisible();
  await expect(page.getByRole("link", { name: "הזמנות", exact: true })).toHaveCount(0);
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/admin\?denied=1/);
  await expect(page.getByText("אין לך הרשאה לעמוד שביקשת.")).toBeVisible();
});
