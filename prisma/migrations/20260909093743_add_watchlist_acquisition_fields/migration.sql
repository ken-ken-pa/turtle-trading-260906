-- AlterTable
ALTER TABLE "Watchlist" ADD COLUMN     "acquisitionDate" DATE,
ADD COLUMN     "acquisitionPrice" INTEGER,
ADD COLUMN     "acquisitionShares" INTEGER,
ADD COLUMN     "totalProfit" DOUBLE PRECISION,
ADD COLUMN     "unitProfit" DOUBLE PRECISION;
