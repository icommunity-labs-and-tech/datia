-- Los eventos hablan de activos, no de items (#26).
--
-- Solo datos, sin cambios de esquema. Reescribe el histórico para que el visor
-- de eventos y los filtros no mezclen dos nombres para lo mismo:
--   · el tipo de evento `item.created` pasa a `asset.created`;
--   · el tipo de entidad «Item» pasa a «Asset»;
--   · los webhooks suscritos a `item.created` pasan a `asset.created`, para no
--     dejar de recibir esos avisos.
--
-- Aplicar JUSTO DESPUÉS de desplegar: el código nuevo ya emite `asset.created`,
-- y hasta entonces las suscripciones antiguas no reciben nada.

UPDATE "EventLog" SET "eventType" = 'asset.created' WHERE "eventType" = 'item.created';
UPDATE "EventLog" SET "entityType" = 'Asset' WHERE "entityType" IN ('Item', 'item');
UPDATE "Webhook" SET "events" = array_replace("events", 'item.created', 'asset.created')
WHERE 'item.created' = ANY("events");
