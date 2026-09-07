# ملفات GeoJSON

هذه نسخة **مؤقتة/تجريبية** بمحافظتين ومناطق ونواحٍ افتراضية (لبناء واختبار البنية الكاملة). عند استلام ملفات GeoJSON الحقيقية لمحافظات سوريا الـ14، استبدل هذه الملفات الثلاثة بنفس الأسماء تماماً، مع الحفاظ على نفس البنية:

- `governorates.json`: `FeatureCollection`، كل `Feature.properties` يحوي `{ id, name }`.
- `districts.json`: كل `Feature.properties` يحوي `{ id, name, governorateId }` (يشير إلى `id` محافظة أب).
- `subdistricts.json`: كل `Feature.properties` يحوي `{ id, name, districtId, governorateId }`.

لا حاجة لتعديل أي كود عند الاستبدال — `geoRepository.ts` والمولّد (`scripts/generate-fake-warehouses.mjs`) يقرآن هذه الملفات ديناميكياً بغض النظر عن عدد المعالم (features) بداخلها.
