-- DropForeignKey
ALTER TABLE "Expat" DROP CONSTRAINT "Expat_clientId_fkey";

-- AlterTable
ALTER TABLE "Expat" ALTER COLUMN "clientId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Expat" ADD CONSTRAINT "Expat_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
