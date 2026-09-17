-- AlterTable
ALTER TABLE "TryOnSession" ADD COLUMN     "errorCode" TEXT,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "inputImageName" TEXT,
ADD COLUMN     "inputImageSource" TEXT,
ADD COLUMN     "processingMs" INTEGER,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "providerRequestId" TEXT;

