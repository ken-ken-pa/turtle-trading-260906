/*
  Warnings:

  - You are about to drop the column `watchlistSortDirection` on the `UserSetting` table. All the data in the column will be lost.
  - You are about to drop the column `watchlistSortKey` on the `UserSetting` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserSetting" DROP COLUMN "watchlistSortDirection",
DROP COLUMN "watchlistSortKey",
ADD COLUMN     "watchlistSortKeys" JSONB;
