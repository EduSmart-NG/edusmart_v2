/*
  Warnings:

  - You are about to drop the column `subject` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `subject` on the `questions` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `exams_exam_type_year_subject_idx` ON `exams`;

-- DropIndex
DROP INDEX `questions_exam_type_year_subject_idx` ON `questions`;

-- AlterTable
ALTER TABLE `exams` DROP COLUMN `subject`,
    ADD COLUMN `subject_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `questions` DROP COLUMN `subject`,
    ADD COLUMN `subject_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `subjects` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `subjects_name_key`(`name`),
    UNIQUE INDEX `subjects_code_key`(`code`),
    INDEX `subjects_name_idx`(`name`),
    INDEX `subjects_code_idx`(`code`),
    INDEX `subjects_is_active_idx`(`is_active`),
    INDEX `subjects_deleted_at_idx`(`deleted_at`),
    INDEX `subjects_created_by_idx`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `exams_exam_type_year_subject_id_idx` ON `exams`(`exam_type`, `year`, `subject_id`);

-- CreateIndex
CREATE INDEX `exams_subject_id_idx` ON `exams`(`subject_id`);

-- CreateIndex
CREATE INDEX `questions_exam_type_year_subject_id_idx` ON `questions`(`exam_type`, `year`, `subject_id`);

-- CreateIndex
CREATE INDEX `questions_subject_id_idx` ON `questions`(`subject_id`);

-- AddForeignKey
ALTER TABLE `questions` ADD CONSTRAINT `questions_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exams` ADD CONSTRAINT `exams_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
