# تحميل كسول لملف بيانات المخازن

**التاريخ:** 2026-09-07
**الحالة:** معتمد

## السياق

الحزمة الرئيسية للموقع (`dist/assets/index-*.js`) تبلغ ~776 كيلوبايت، منها ~715 كيلوبايت (92%) بيانات ساكنة (ملفات GeoJSON + `warehouses.generated.json`)، وليس كود React/D3/منطق التطبيق. هذا أول تحسين ضمن مسار "الأداء وحجم التحميل" (من ثلاثة مسارات تحسين متفق على معالجتها بالتتابع: الأداء، اللمسات البصرية/UX، ميزات جديدة — كل مسار تصميم/خطة منفصلة).

## النطاق

**داخل النطاق:** تحويل تحميل `warehouses.generated.json` (340 كيلوبايت، 44% من الحزمة) من استيراد ثابت (static import) إلى استيراد ديناميكي (dynamic `import()`) داخل `warehouseSource.ts` فقط.

**خارج النطاق (بدائل نوقشت ورُفضت لهذه الخطوة):**
- تحميل كسول لملفات `districts.json`/`subdistricts.json` — يتطلب تحويل `geoRepository.ts` إلى async ويطال `MapCanvas`/`App.tsx`/اختبارات متعددة؛ تغيير بنيوي أكبر من "تعديلات محدودة"، يُترك لمناقشة منفصلة لاحقاً إذا لزم.
- تقسيم حزمة مكتبات React/D3 عن كود التطبيق (`manualChunks`) — يحسّن التخزين المؤقت بين الزيارات فقط، لا يقلّل حجم التحميل الأول لموقع عرض يُشاهَد غالباً مرة واحدة.

## القرار التقني

`src/data/warehouseSource.ts`: استبدال `import warehousesJson from './warehouses.generated.json'` باستيراد ديناميكي داخل `getWarehouses()`، مع تخزين الـPromise في متغيّر module-level لمنع إعادة التحميل عند الاستدعاءات المتكررة:

```ts
let warehousesPromise: Promise<Warehouse[]> | null = null;

export async function getWarehouses(): Promise<Warehouse[]> {
  if (!warehousesPromise) {
    warehousesPromise = import('./warehouses.generated.json').then((mod) => mod.default as Warehouse[]);
  }
  return warehousesPromise;
}
```

Vite يفصل هذا تلقائياً لحزمة (chunk) منفصلة تُحمَّل بالتوازي بعد أول رسم للصفحة. التوقيع (`Promise<Warehouse[]>`) وسلوك المستهلك (`App.tsx`، عبر `getWarehouses().then(setWarehouses)` القائم أصلاً) لا يتغيّران — لا حاجة لتعديل أي ملف آخر أو أي اختبار.

## التحقق

- إعادة البناء (`npm run build`) والتأكد من ظهور حزمة منفصلة لملف المخازن، وانخفاض حجم الحزمة الرئيسية بمقدار مقارب لحجم الملف (340 كيلوبايت تقريباً).
- تشغيل كل الاختبارات (`npm test`) — يجب أن تبقى 64/64 ناجحة دون أي تعديل عليها.
- معاينة الموقع بالمتصفح للتأكد من ظهور الإحصائيات وعدد المخازن بشكل طبيعي بعد التحميل.
