/*
  Warnings:

  - A unique constraint covering the columns `[identifier,value]` on the table `verification` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `verification_identifier_value_key` ON `verification`;

-- DropIndex
DROP INDEX `verification_value_idx` ON `verification`;

-- DropIndex
DROP INDEX `verification_value_key` ON `verification`;

-- AlterTable
ALTER TABLE `verification` MODIFY `value` TEXT NOT NULL;

-- CreateIndex
CREATE INDEX `verification_value_idx` ON `verification`(`value`(255));

-- CreateIndex
CREATE UNIQUE INDEX `verification_identifier_value_key` ON `verification`(`identifier`, `value`(255));
