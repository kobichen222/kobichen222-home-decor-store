# בית ועיצוב · חנות אונליין לעיצוב הבית והעסק

פלטפורמת מסחר עצמאית: **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + Supabase**, לפריסה על Vercel.
עברית מלאה ו־RTL. אתר לקוחות + מערכת ניהול ב־`/admin`.

## מצב הפרויקט

מומשו שלבים 1–6 מתוך האפיון (ליבת החנות):

| שלב | תכולה | מצב |
|---|---|---|
| 1 | Next.js, CI, מבנה פרויקט | ✅ |
| 2 | סכמת בסיס נתונים מלאה (65 טבלאות), Auth, RBAC, RLS, יומן פעולות | ✅ |
| 3 | ניהול מוצרים, וריאציות, תמונות, קטגוריות, מלאי | ✅ |
| 4 | עיצוב האתר, עמוד בית מבוסס מקטעים, קטלוג עם סינון, מיון וחיפוש | ✅ |
| 5 | עמוד מוצר עם וריאציות, גלריה ונתונים מובנים | ✅ |
| 6 | סל קניות, קופונים, Checkout, יצירת הזמנה ושמירת מלאי אטומית | ✅ |
| 7 | סליקה | ממשק ספק + **סימולטור בלבד**. ספק ישראלי אמיתי טרם חובר |
| 7 | ניהול הזמנות | רשימה, מסך הזמנה, סטטוסים, הערות. ללא החזרים וחשבוניות |
| 8–17 | משלוחים מתקדמים, CMS, לקוחות, דוחות, ייבוא, B2B, אוטומציות, AI | טרם מומש (הטבלאות קיימות) |

**עוד לא קיים ונדרש לפני השקה:** ספק סליקה אמיתי, שליחת דוא״ל אישור הזמנה, אזור אישי ללקוח, עריכת תוכן מהניהול
(עמוד הבית, עמודים, הגדרות, קופונים, קולקציות נערכים כרגע רק בבסיס הנתונים), Rate limiting, אימות דו־שלבי למנהלים,
ניטור שגיאות (Sentry) ואנליטיקה. תמונות ההדגמה הן איורים וקטוריים שנוצרו בסקריפט, לא צילומי מוצר.

## הרצה מקומית

דרישות: Node 22, Docker.

```bash
npm install
npx supabase start          # Postgres + Auth + Storage מקומיים; מריץ migrations ו-seed
cp .env.example .env.local  # ולמלא את המפתחות ש-`supabase start` הדפיס
npm run admin:create -- owner@example.com 'סיסמה-של-12-תווים-לפחות'
npm run dev                 # http://localhost:3000  ·  ניהול: /admin
```

| פקודה | מה היא עושה |
|---|---|
| `npm run lint` / `npm run typecheck` | ESLint, TypeScript |
| `npm test` | בדיקות יחידה |
| `npm run test:integration` | בדיקות מול בסיס הנתונים: תמחור, מלאי, תשלומים, RLS |
| `npm run test:e2e` | Playwright: רכישה מלאה, ניהול, הרשאות. להריץ אחרי `npm run db:reset` ויצירת משתמשי הבדיקה (ראו `.github/workflows/ci.yml`) |
| `npm run db:reset` | בנייה מחדש של ה־DB המקומי מה־migrations + נתוני הדגמה |
| `npm run db:types` | יצירת `types/database.ts` מהסכמה |
| `npm run seed:generate` | יצירה מחדש של קטלוג ההדגמה (`supabase/seed.sql` + איורים) |

## פריסה

1. **Supabase**: ליצור פרויקט (מומלץ נפרד ל־Staging ול־Production) ולהריץ `npx supabase link` ואז `npx supabase db push`.
   `seed.sql` הוא נתוני הדגמה בלבד ואינו מיועד ל־Production.
2. **Vercel**: לייבא את הריפו ולהגדיר את המשתנים מ־`.env.example`. `SUPABASE_SECRET_KEY` הוא סוד שרת בלבד.
3. **בעלים ראשון**: `npm run admin:create -- <email> <password>` מול הפרויקט המרוחק.
4. **Cron**: `vercel.json` מריץ פעם ביום שחרור של שמירות מלאי שפג תוקפן. אותו שחרור רץ גם בתחילת כל הזמנה חדשה, כך שמלאי לא נשאר תקוע.
5. **אתר הדגמה**: `PAYMENT_PROVIDER=mock` יחד עם `ALLOW_MOCK_PAYMENTS=true` מפעילים את סימולטור התשלום גם ב־Production. להסיר לפני מכירה אמיתית.

## ארכיטקטורה

```
app/(store)/        אתר הלקוחות: בית, קטלוג, מוצר, סל, קופה, מעקב הזמנה, עמודי תוכן
app/admin/          מערכת הניהול (מוגנת)
app/api/            webhook של ספק הסליקה, cron
features/           לוגיקה לפי תחום: catalog, cart, checkout, orders, cms, admin
lib/supabase/       שלושה לקוחות: public (אנונימי, נשמר במטמון), server (סשן משתמש), service (שרת בלבד)
lib/payments/       ממשק PaymentProvider + סימולטור
supabase/migrations סכמה, RLS, פונקציות
tests/              unit · integration · e2e
```

### עקרונות שחשוב לשמר

- **כסף מחושב רק בבסיס הנתונים.** הדפדפן שולח מזהה וריאציה וכמות בלבד. `cart_summary()` מתמחר, ו־`create_order()`
  משתמש באותה פונקציה לסכום החיוב. מחיר שמגיע מהלקוח לא נקרא בשום מקום.
- **אין מכירת יתר.** `create_order()` שומר מלאי ב־`UPDATE` מותנה אטומי, והאילוץ `inventory_no_oversell` אוכף זאת גם
  ברמת הטבלה. הזמנה שלא שולמה משוחררת אחרי 30 דקות (`release_expired_orders`).
- **תשלום מעובד פעם אחת.** כל הודעת ספק נרשמת תחת מפתח ייחודי, `confirm_order_payment()` אידמפוטנטי, והסכום מאומת
  מול ההזמנה.
- **הרשאות נאכפות ב־DB.** RLS פעיל בכל הטבלאות. מערכת הניהול פועלת בסשן של המשתמש, כך ש־`has_permission()` חוסם
  גם אם הממשק עוקף. מפתח ה־service משמש רק לסל, לקופה ולתשלומים.
- **מטמון.** קריאות קטלוג ותוכן נשמרות (`"use cache"`, תג `catalog`) ומתרעננות בכל שינוי מהניהול ובכל תשלום.
  עמודי סינון, מיון ועימוד מסומנים `noindex` עם canonical לעמוד הבסיס.

### הוספת ספק סליקה

לממש את `PaymentProvider` (`lib/payments/types.ts`): `createPayment` מחזיר כתובת לעמוד התשלום של הספק,
ו־`parseWebhook` מאמת חתימה ומחזיר אירוע מנורמל. לרשום ב־`lib/payments/index.ts` ולהגדיר `PAYMENT_PROVIDER`.
שאר הזרימה (אידמפוטנטיות, התחייבות מלאי, ביטול) כבר קיימת ב־`features/checkout/payment-events.ts`.

## ענפים

`main` = Production · `develop` = פיתוח · `feature/*` = תכונות. כל Pull Request עובר את `ci.yml`.
