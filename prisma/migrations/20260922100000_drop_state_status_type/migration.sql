-- Retira el historial de estados del activo (#63).
--
-- Las 129 pruebas de emisiones que vivían aquí ya se copiaron a Certification
-- en 20260918100000_certification_entity. Lo que se borra son las 99 filas de
-- historial (Recibida, Inspeccionada, Instalación…) y los tipos de estado:
-- Pablo confirmó el 2026-09-18 que no hace falta conservarlas. Sus evidencias
-- siguen en iBS.
--
-- Borra columnas que el código anterior usaba: aplicar DESPUÉS de desplegar.

-- DropForeignKey
ALTER TABLE "State" DROP CONSTRAINT "State_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "State" DROP CONSTRAINT "State_itemId_fkey";

-- DropForeignKey
ALTER TABLE "State" DROP CONSTRAINT "State_statusTypeId_fkey";

-- DropForeignKey
ALTER TABLE "StatusType" DROP CONSTRAINT "StatusType_organizationId_fkey";

-- DropTable
DROP TABLE "State";

-- DropTable
DROP TABLE "StatusType";

