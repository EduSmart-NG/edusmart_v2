-- CreateTable
CREATE TABLE `questions` (
    `id` VARCHAR(191) NOT NULL,
    `exam_type` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `question_type` VARCHAR(191) NOT NULL,
    `question_text` TEXT NOT NULL,
    `question_image` VARCHAR(191) NULL,
    `question_point` DOUBLE NOT NULL,
    `answer_explanation` TEXT NULL,
    `difficulty_level` VARCHAR(191) NOT NULL,
    `tags` JSON NOT NULL,
    `time_limit` INTEGER NULL,
    `language` VARCHAR(191) NOT NULL DEFAULT 'en',
    `created_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `questions_exam_type_year_subject_idx`(`exam_type`, `year`, `subject`),
    INDEX `questions_question_type_idx`(`question_type`),
    INDEX `questions_difficulty_level_idx`(`difficulty_level`),
    INDEX `questions_created_by_idx`(`created_by`),
    INDEX `questions_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `question_options` (
    `id` VARCHAR(191) NOT NULL,
    `question_id` VARCHAR(191) NOT NULL,
    `option_text` TEXT NOT NULL,
    `option_image` VARCHAR(191) NULL,
    `is_correct` BOOLEAN NOT NULL,
    `order_index` INTEGER NOT NULL,

    INDEX `question_options_question_id_idx`(`question_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `question_options` ADD CONSTRAINT `question_options_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
