-- Phase 6 — Size charts. Measurements in cm. DEMO source marks seed data
-- that must never be presented as official brand measurements.

-- CreateEnum
CREATE TYPE "SizeChartSource" AS ENUM ('DEMO', 'BRAND');

-- CreateTable
CREATE TABLE "SizeChart" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "source" "SizeChartSource" NOT NULL DEFAULT 'DEMO',
    "sourceLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SizeChart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SizeChartRow" (
    "id" TEXT NOT NULL,
    "chartId" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "chestCm" INTEGER,
    "waistCm" INTEGER,
    "hipCm" INTEGER,
    "heightCm" INTEGER,
    "inseamCm" INTEGER,

    CONSTRAINT "SizeChartRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SizeChart_productId_key" ON "SizeChart"("productId");

-- CreateIndex
CREATE INDEX "SizeChart_productId_idx" ON "SizeChart"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "SizeChartRow_chartId_sizeId_key" ON "SizeChartRow"("chartId", "sizeId");

-- CreateIndex
CREATE INDEX "SizeChartRow_chartId_idx" ON "SizeChartRow"("chartId");

-- CreateIndex
CREATE INDEX "SizeChartRow_sizeId_idx" ON "SizeChartRow"("sizeId");

-- AddForeignKey
ALTER TABLE "SizeChart" ADD CONSTRAINT "SizeChart_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SizeChartRow" ADD CONSTRAINT "SizeChartRow_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "SizeChart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SizeChartRow" ADD CONSTRAINT "SizeChartRow_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "Size"("id") ON DELETE RESTRICT ON UPDATE CASCADE;