ALTER TABLE "Item" ADD COLUMN "gtin" TEXT;
CREATE UNIQUE INDEX "Item_gtin_key" ON "Item"("gtin");

ALTER TABLE "StorageLocation" ADD COLUMN "gln" TEXT;
CREATE UNIQUE INDEX "StorageLocation_gln_key" ON "StorageLocation"("gln");

ALTER TABLE "BarcodeQRCode" ADD COLUMN "gs1ElementString" TEXT;
