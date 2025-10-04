-- AlterTable
ALTER TABLE `user` MODIFY `dateOfBirth` DATETIME(3) NULL,
    MODIFY `gender` ENUM('MALE', 'FEMALE') NULL,
    MODIFY `lga` VARCHAR(191) NULL,
    MODIFY `state` VARCHAR(191) NULL;
