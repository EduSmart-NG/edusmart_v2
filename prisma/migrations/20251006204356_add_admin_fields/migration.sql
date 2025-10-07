-- AlterTable
ALTER TABLE `session` ADD COLUMN `impersonatedBy` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `banExpires` DATETIME(3) NULL,
    ADD COLUMN `banReason` TEXT NULL,
    ADD COLUMN `banned` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `role` VARCHAR(191) NULL DEFAULT 'user';

-- CreateIndex
CREATE INDEX `session_impersonatedBy_idx` ON `session`(`impersonatedBy`);

-- CreateIndex
CREATE INDEX `user_role_idx` ON `user`(`role`);

-- CreateIndex
CREATE INDEX `user_banned_idx` ON `user`(`banned`);
