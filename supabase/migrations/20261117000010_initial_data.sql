-- =====================================================================
-- 0010 · Initial store data (settings, shipping, attributes, home page)
-- Everything here is editable later from the admin; it only makes a
-- fresh install render a complete storefront.
-- =====================================================================
insert into public.store_settings (key, value, is_public) values
  ('business', jsonb_build_object(
     'name', 'בית ועיצוב',
     'tagline', 'עיצוב הבית, המשרד והעסק',
     'phone', '03-0000000',
     'whatsapp', '972500000000',
     'email', 'hello@example.co.il',
     'address', 'רחוב הדוגמה 1, תל אביב',
     'hours', 'א׳–ה׳ 9:00–18:00 · ו׳ 9:00–13:00',
     'social', jsonb_build_object('instagram', '', 'facebook', '')), true),
  ('commerce', jsonb_build_object(
     'currency', 'ILS', 'vat_rate', 18, 'prices_include_vat', true, 'reservation_minutes', 30), true),
  ('announcements', jsonb_build_array(
     'משלוחים לכל הארץ · חינם בקנייה מעל 499 ₪',
     'קולקציית חורף חדשה באתר',
     '10% הנחה בהזמנה ראשונה עם הקוד WELCOME10'), true),
  ('seo', jsonb_build_object(
     'title', 'בית ועיצוב · מוצרים נבחרים לעיצוב הבית, המשרד והעסק',
     'description', 'תמונות קיר, שעונים, מראות, גופי תאורה ופריטי נוי לעיצוב הבית, המשרד והעסק. משלוחים לכל הארץ.'), true);

insert into public.shipping_methods (code, name, description, kind, price, free_above, delivery_days_min, delivery_days_max, requires_address, sort_order) values
  ('home',     'משלוח עד הבית', 'שליח עד הדלת',                   'delivery', 35, 499, 3, 7, true,  1),
  ('business', 'משלוח לעסק',    'אספקה לבית העסק בשעות הפעילות', 'business', 45, 799, 3, 7, true,  2),
  ('pickup',   'איסוף עצמי',    'איסוף מהמחסן בתיאום מראש',       'pickup',    0, null, 1, 3, false, 3);

insert into public.product_attributes (code, name, kind, sort_order) values
  ('color', 'צבע', 'color', 1), ('material', 'חומר', 'select', 2),
  ('size', 'גודל', 'select', 3), ('style', 'סגנון', 'select', 4);

insert into public.product_attribute_values (attribute_id, value, color_hex, sort_order)
select a.id, v.value, v.hex, v.ord
from public.product_attributes a
join (values
  ('color','שחור','#242424',1),('color','לבן','#FFFFFF',2),('color','זהב','#B49A76',3),('color','טבעי','#C9A27E',4),
  ('color','אפור','#9A9A9A',5),('color','ירוק','#5F7161',6),('color','כחול','#3E5C76',7),('color','חום','#705B4B',8),
  ('material','עץ',null,1),('material','מתכת',null,2),('material','זכוכית',null,3),('material','קנבס',null,4),
  ('material','קרמיקה',null,5),('material','בד',null,6),
  ('size','קטן',null,1),('size','בינוני',null,2),('size','גדול',null,3),
  ('style','מודרני',null,1),('style','מינימליסטי',null,2),('style','יוקרתי',null,3),('style','כפרי',null,4),('style','תעשייתי',null,5)
) as v(code, value, hex, ord) on v.code = a.code;

insert into public.pages (slug, title, status, is_system) values
  ('home', 'עמוד הבית', 'published', true),
  ('about', 'אודות', 'published', true),
  ('shipping', 'משלוחים', 'published', true),
  ('returns', 'החזרות וביטולים', 'published', true),
  ('terms', 'תקנון', 'published', true),
  ('privacy', 'מדיניות פרטיות', 'published', true),
  ('accessibility', 'הצהרת נגישות', 'published', true);

insert into public.page_sections (page_id, kind, title, sort_order, data)
select p.id, s.kind, s.title, s.ord, s.data
from public.pages p
cross join (values
  ('hero', null, 10, jsonb_build_object(
     'eyebrow', 'קולקציית 2026',
     'title', 'מעצבים את החלל. משנים את האווירה.',
     'subtitle', 'מוצרים נבחרים לעיצוב הבית, המשרד והעסק.',
     'image_url', '/hero/living-room.svg',
     'image_alt', 'סלון מעוצב בגווני בז׳ וחום עם תמונות קיר, מנורת רצפה וכורסה',
     'primary', jsonb_build_object('label', 'לגלות את הקולקציה', 'href', '/collections'),
     'secondary', jsonb_build_object('label', 'לכל המוצרים', 'href', '/shop'))),
  ('categories', 'קטגוריות מובילות', 20, '{}'::jsonb),
  ('product_grid', 'הנמכרים ביותר', 30, jsonb_build_object('source', 'bestsellers', 'limit', 8, 'href', '/shop?sort=bestsellers')),
  ('rooms', 'עיצוב לפי חלל', 40, jsonb_build_object('items', jsonb_build_array(
     jsonb_build_object('label', 'סלון', 'href', '/category/living-room'),
     jsonb_build_object('label', 'חדר שינה', 'href', '/category/bedroom'),
     jsonb_build_object('label', 'מטבח', 'href', '/category/kitchen'),
     jsonb_build_object('label', 'משרד', 'href', '/category/office-decor'),
     jsonb_build_object('label', 'חדר ישיבות', 'href', '/category/meeting-rooms'),
     jsonb_build_object('label', 'חנות או קליניקה', 'href', '/category/business-decor')))),
  ('collections', 'קולקציות נבחרות', 50, '{}'::jsonb),
  ('product_grid', 'חדש באתר', 60, jsonb_build_object('source', 'newest', 'limit', 4, 'href', '/shop?sort=newest')),
  ('product_grid', 'מבצעים מיוחדים', 70, jsonb_build_object('source', 'sale', 'limit', 4, 'href', '/shop?sale=1')),
  ('benefits', 'למה לקנות אצלנו', 80, jsonb_build_object('items', jsonb_build_array(
     jsonb_build_object('icon', 'truck', 'title', 'משלוחים לכל הארץ', 'text', 'אספקה מהירה עד הבית או העסק, חינם מעל 499 ₪'),
     jsonb_build_object('icon', 'shield', 'title', 'אחריות מלאה', 'text', 'שנה אחריות על כל מוצר ו־14 יום להחזרה'),
     jsonb_build_object('icon', 'gem', 'title', 'איכות נבחרת', 'text', 'כל פריט נבחר ונבדק בקפידה לפני שהוא עולה לאתר'),
     jsonb_build_object('icon', 'headset', 'title', 'שירות אישי', 'text', 'ייעוץ בבחירת מוצרים לבית ולפרויקטים עסקיים')))),
  ('newsletter', 'הצטרפו לרשימת התפוצה', 90, jsonb_build_object(
     'text', 'השראה לעיצוב, קולקציות חדשות והטבות לרשומים בלבד.'))
) as s(kind, title, ord, data)
where p.slug = 'home';
