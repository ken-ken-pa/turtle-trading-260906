-- AlterTable
ALTER TABLE "UserSetting" ADD COLUMN     "watchlistSortDirection" TEXT NOT NULL DEFAULT 'desc',
ADD COLUMN     "watchlistSortKey" TEXT;
