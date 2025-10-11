-- AlterTable
ALTER TABLE `user` ADD COLUMN `createdBy` VARCHAR(191) NULL,
    ADD COLUMN `passwordChangeRequired` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `user_passwordChangeRequired_idx` ON `user`(`passwordChangeRequired`);

-- CreateIndex
CREATE INDEX `user_createdBy_idx` ON `user`(`createdBy`);
