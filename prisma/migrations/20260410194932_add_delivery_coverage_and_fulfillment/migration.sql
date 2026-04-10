/*
  Warnings:

  - You are about to drop the `rider_application` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "OrderFulfillmentType" AS ENUM ('OWN_DELIVERY', 'COURIER');

-- CreateEnum
CREATE TYPE "DeliveryManApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "rider_application" DROP CONSTRAINT "rider_application_reviewedById_fkey";

-- DropForeignKey
ALTER TABLE "rider_application" DROP CONSTRAINT "rider_application_userId_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "courierPartner" TEXT,
ADD COLUMN     "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "etaDays" INTEGER,
ADD COLUMN     "fulfillmentType" "OrderFulfillmentType" NOT NULL DEFAULT 'OWN_DELIVERY',
ADD COLUMN     "serviceDistrict" TEXT,
ADD COLUMN     "serviceDivision" TEXT,
ADD COLUMN     "serviceThana" TEXT,
ADD COLUMN     "trackingNumber" TEXT;

-- DropTable
DROP TABLE "rider_application";

-- DropEnum
DROP TYPE "RiderApplicationStatus";

-- CreateTable
CREATE TABLE "delivery_man_application" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "nidNumber" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "vehicleRegistrationNo" TEXT NOT NULL,
    "deliveryArea" TEXT NOT NULL,
    "currentAddress" TEXT NOT NULL,
    "emergencyContactName" TEXT NOT NULL,
    "emergencyContactPhone" TEXT NOT NULL,
    "status" "DeliveryManApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_man_application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_coverage" (
    "id" TEXT NOT NULL,
    "division" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "thana" TEXT NOT NULL,
    "deliveryMode" "OrderFulfillmentType" NOT NULL DEFAULT 'OWN_DELIVERY',
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "etaDays" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_coverage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_man_application_userId_key" ON "delivery_man_application"("userId");

-- CreateIndex
CREATE INDEX "delivery_coverage_division_district_thana_active_idx" ON "delivery_coverage"("division", "district", "thana", "active");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_coverage_division_district_thana_key" ON "delivery_coverage"("division", "district", "thana");

-- AddForeignKey
ALTER TABLE "delivery_man_application" ADD CONSTRAINT "delivery_man_application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_man_application" ADD CONSTRAINT "delivery_man_application_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
