/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `user` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `dateOfBirth` to the `user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gender` to the `user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lga` to the `user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state` to the `user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `user` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `session` MODIFY `userAgent` TEXT NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `address` TEXT NULL,
    ADD COLUMN `dateOfBirth` DATETIME(3) NOT NULL,
    ADD COLUMN `gender` ENUM('MALE', 'FEMALE') NOT NULL,
    ADD COLUMN `lga` VARCHAR(191) NOT NULL,
    ADD COLUMN `phoneNumber` VARCHAR(191) NULL,
    ADD COLUMN `schoolName` VARCHAR(191) NULL,
    ADD COLUMN `state` VARCHAR(191) NOT NULL,
    ADD COLUMN `username` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `session_token_idx` ON `session`(`token`);

-- CreateIndex
CREATE UNIQUE INDEX `user_username_key` ON `user`(`username`);

-- CreateIndex
CREATE INDEX `user_email_idx` ON `user`(`email`);

-- CreateIndex
CREATE INDEX `user_username_idx` ON `user`(`username`);

-- CreateIndex
CREATE INDEX `verification_value_idx` ON `verification`(`value`);

-- RenameIndex
ALTER TABLE `account` RENAME INDEX `account_userId_fkey` TO `account_userId_idx`;

-- RenameIndex
ALTER TABLE `session` RENAME INDEX `session_userId_fkey` TO `session_userId_idx`;
