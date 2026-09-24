-- Los eventos hablan de activos, no de items (#26).
--
-- Solo datos, sin cambios de esquema. Reescribe el histórico para que el visor
-- de eventos y los filtros no mezclen dos nombres para lo mismo:
--   · los tipos de evento `item.*` pasan a `asset.*`. En producción hay
--     `item.created` (51), `item.updated` (51) y `item.deleted` (36): los dos
--     últimos ya no los emite ningún código, pero son historial y no pueden
--     quedar con un nombre distinto al de la entidad;
--   · el tipo de entidad «Item» / «item» pasa a «Asset»;
--   · los webhooks suscritos a `item.created` pasan a `asset.created`, para no
--     dejar de recibir esos avisos.
--
-- Aplicar JUSTO DESPUÉS de desplegar: el código nuevo ya emite `asset.created`,
-- y hasta entonces las suscripciones antiguas no reciben nada.

UPDATE "EventLog" SET "eventType" = 'asset.' || substring("eventType" from 6)
WHERE "eventType" LIKE 'item.%';

UPDATE "EventLog" SET "entityType" = 'Asset' WHERE "entityType" IN ('Item', 'item');

UPDATE "Webhook" SET "events" = array_replace("events", 'item.created', 'asset.created')
WHERE 'item.created' = ANY("events");
