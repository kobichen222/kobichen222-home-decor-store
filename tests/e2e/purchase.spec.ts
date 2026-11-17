import { expect, test } from "@playwright/test";

// The acceptance path: find a product, pick a variant, add to cart, apply
// a coupon, check out as a guest, pay, land on the order confirmation.
test("guest can buy a product variant end to end", async ({ page }) => {
  await page.goto("/category/wall-art");
  await page.getByRole("link", { name: "תמונת קיר אבסטרקט חולות" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("תמונת קיר אבסטרקט חולות");

  // 50×70 costs 90 ₪ more than the base 189 ₪.
  await page.getByRole("button", { name: "50×70 ס״מ" }).click();
  await expect(page.getByText("279").first()).toBeVisible();
  await page.getByRole("button", { name: "הגדלת כמות" }).click();
  await page.getByRole("button", { name: "הוספה לסל" }).click();

  const drawer = page.getByRole("dialog", { name: /סל הקניות/ });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("558")).toHaveCount(3); // line, subtotal, total

  await drawer.getByLabel("קוד קופון").fill("save50");
  await drawer.getByRole("button", { name: "החלה" }).click();
  await expect(drawer.getByText("קופון SAVE50 הופעל")).toBeVisible();
  await drawer.getByRole("link", { name: "מעבר לתשלום" }).click();

  await expect(page).toHaveURL(/\/checkout$/);
  // 558 − 50 = 508 ≥ 499 → home delivery is free.
  await expect(page.getByTestId("checkout-total")).toContainText("508");
  await page.getByLabel("שם מלא").fill("ישראל ישראלי");
  await page.getByLabel("טלפון נייד").fill("050-1234567");
  await page.getByLabel("דוא״ל").fill("buyer@example.com");
  await page.getByLabel("עיר").fill("תל אביב");
  await page.getByLabel("רחוב").fill("הרצל");
  await page.getByLabel("מספר בית").fill("10");

  // Terms not accepted yet → server-side validation error, no order.
  await page.getByRole("button", { name: "אישור ומעבר לתשלום" }).click();
  await expect(page.getByText("יש לאשר את התקנון ומדיניות הפרטיות")).toBeVisible();
  // A validation error must not wipe what the shopper already typed.
  await expect(page.getByLabel("שם מלא")).toHaveValue("ישראל ישראלי");
  await expect(page.getByLabel("עיר")).toHaveValue("תל אביב");
  await page.getByRole("checkbox", { name: /קראתי ואני מאשר/ }).check();
  await page.getByRole("button", { name: "אישור ומעבר לתשלום" }).click();

  await expect(page).toHaveURL(/\/checkout\/pay\//);
  await expect(page.getByRole("paragraph").filter({ hasText: "508" })).toBeVisible();
  await page.getByRole("button", { name: "סימולציית תשלום מוצלח" }).click();

  await expect(page).toHaveURL(/\/order\//);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("תודה! ההזמנה התקבלה");
  await expect(page.getByTestId("payment-status")).toContainText("שולם");
  await expect(page.getByTestId("order-total")).toContainText("508");
  await expect(page.getByTestId("order-number")).toHaveText(/^\d{5,}$/);

  // The cart was converted into the order.
  await page.goto("/cart");
  await expect(page.getByText("הסל שלכם ריק")).toBeVisible();
});

test("failed payment releases the order and keeps the cart", async ({ page }) => {
  await page.goto("/product/matte-ceramic-vase");
  await page.getByRole("button", { name: "הוספה לסל" }).click();
  await page.getByRole("dialog", { name: /סל הקניות/ }).getByRole("link", { name: "מעבר לתשלום" }).click();
  await page.getByRole("radio", { name: /איסוף עצמי/ }).check();
  await expect(page.getByLabel("עיר")).toHaveCount(0);
  await page.getByLabel("שם מלא").fill("דנה כהן");
  await page.getByLabel("טלפון נייד").fill("0521234567");
  await page.getByLabel("דוא״ל").fill("dana@example.com");
  await page.getByRole("checkbox", { name: /קראתי ואני מאשר/ }).check();
  await page.getByRole("button", { name: "אישור ומעבר לתשלום" }).click();
  await page.getByRole("button", { name: "סימולציית תשלום שנכשל" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("התשלום לא הושלם");
  await expect(page.getByTestId("order-status")).toContainText("בוטלה");
  await page.goto("/cart");
  await expect(page.getByRole("link", { name: "אגרטל קרמיקה מט" }).first()).toBeVisible();
});
