/*
  Warnings:

  - A unique constraint covering the columns `[displayUsername]` on the table `user` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `displayUsername` to the `user` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `user` ADD COLUMN `displayUsername` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `user_displayUsername_key` ON `user`(`displayUsername`);

-- CreateIndex
CREATE INDEX `user_displayUsername_idx` ON `user`(`displayUsername`);
