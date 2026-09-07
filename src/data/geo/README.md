# ملفات GeoJSON

هذه الحدود الإدارية **حقيقية** لسوريا (14 محافظة، 62 منطقة، 272 ناحية)، مستوردة عبر `scripts/import-real-geo.mjs` من ملف مصدر بصيغة OCHA/COD-AB القياسية (`adm0`/`adm1`/`adm2`/`adm3`)، ومبسّطة هندسياً (`@turf/simplify`) لتصبح مناسبة الحجم لموقع ويب.

## البنية

- `governorates.json`: `FeatureCollection`، كل `Feature.properties` يحوي `{ id, name }`.
- `districts.json`: كل `Feature.properties` يحوي `{ id, name, governorateId }` (يشير إلى `id` محافظة أب).
- `subdistricts.json`: كل `Feature.properties` يحوي `{ id, name, districtId, governorateId }`.

المعرّفات (`id`) هي رموز pcode القياسية (مثل `SY02` لحلب، `SY0202` لمنطقة الباب، `SY020206` لناحية عريمة) — لا تُغيَّر يدوياً.

## تحديث البيانات لاحقاً

إذا توفر ملف حدود إدارية أحدث (نفس صيغة OCHA: `FeatureCollection` واحدة تخلط صفوف على مستوى الدولة/المحافظة/المنطقة/الناحية معاً، حيث تميّز حقول `adm1_pcode`/`adm2_pcode`/`adm3_pcode` الفارغة كل مستوى)، أعد التشغيل:

```bash
node scripts/import-real-geo.mjs "<مسار الملف المصدر>.geojson"
npm run generate:warehouses
```

لا حاجة لتعديل أي كود — `geoRepository.ts` يقرأ هذه الملفات الثلاثة ديناميكياً بغض النظر عن عدد المعالم (features) بداخلها، ويطبّع اتجاه دوران الإحداثيات تلقائياً (`@turf/rewind`) بغض النظر عن اتجاهها في المصدر.

إذا اختلفت صيغة الملف المصدر جوهرياً (مثلاً ثلاثة ملفات منفصلة بدل ملف واحد مدمج)، يحتاج `scripts/import-real-geo.mjs` نفسه للتعديل — راجع التعليقات بداخله.
