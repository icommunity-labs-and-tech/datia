-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;


-- Rellena la posición desde la plantilla, donde vivía hasta ahora (#37).
-- Cualquier campo del template cuyo valor tenga lat y lng numéricos sirve: así
-- no depende de cómo se llamara el campo en cada plantilla.
UPDATE "Item" i
SET "latitude" = (campo.valor->>'lat')::double precision,
    "longitude" = (campo.valor->>'lng')::double precision
FROM (
  SELECT it."id",
         (SELECT value FROM jsonb_each(it."templateFields")
          WHERE jsonb_typeof(value) = 'object'
            AND value ? 'lat' AND value ? 'lng'
            AND jsonb_typeof(value->'lat') = 'number'
            AND jsonb_typeof(value->'lng') = 'number'
          LIMIT 1) AS valor
  FROM "Item" it
  WHERE jsonb_typeof(it."templateFields") = 'object'
) campo
WHERE i."id" = campo."id"
  AND campo.valor IS NOT NULL
  AND i."latitude" IS NULL;
