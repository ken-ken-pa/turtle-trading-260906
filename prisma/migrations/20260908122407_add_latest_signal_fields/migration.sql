-- AlterTable
ALTER TABLE "Watchlist" ADD COLUMN     "latestSignalDate" TIMESTAMP(3),
ADD COLUMN     "latestSignalPrice" DOUBLE PRECISION,
ADD COLUMN     "latestSignalType" TEXT;
