-- CreateTable
CREATE TABLE `exam_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `exam_id` VARCHAR(191) NOT NULL,
    `exam_type` VARCHAR(191) NOT NULL,
    `started_at` DATETIME(3) NOT NULL,
    `completed_at` DATETIME(3) NULL,
    `time_limit` INTEGER NULL,
    `configured_questions` INTEGER NOT NULL,
    `shuffle_questions` BOOLEAN NOT NULL DEFAULT false,
    `shuffle_options` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `score` DOUBLE NULL,
    `total_questions` INTEGER NOT NULL,
    `answered_questions` INTEGER NOT NULL DEFAULT 0,
    `violation_count` INTEGER NOT NULL DEFAULT 0,
    `question_order` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `exam_sessions_user_id_idx`(`user_id`),
    INDEX `exam_sessions_exam_id_idx`(`exam_id`),
    INDEX `exam_sessions_status_idx`(`status`),
    INDEX `exam_sessions_user_id_exam_id_status_idx`(`user_id`, `exam_id`, `status`),
    INDEX `exam_sessions_started_at_idx`(`started_at`),
    INDEX `exam_sessions_completed_at_idx`(`completed_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_answers` (
    `id` VARCHAR(191) NOT NULL,
    `session_id` VARCHAR(191) NOT NULL,
    `question_id` VARCHAR(191) NOT NULL,
    `selected_option_id` VARCHAR(191) NULL,
    `text_answer` TEXT NULL,
    `is_correct` BOOLEAN NULL,
    `time_spent` INTEGER NOT NULL,
    `answered_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `exam_answers_session_id_idx`(`session_id`),
    INDEX `exam_answers_question_id_idx`(`question_id`),
    INDEX `exam_answers_answered_at_idx`(`answered_at`),
    UNIQUE INDEX `exam_answers_session_id_question_id_key`(`session_id`, `question_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_violations` (
    `id` VARCHAR(191) NOT NULL,
    `session_id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL,
    `metadata` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `exam_violations_session_id_idx`(`session_id`),
    INDEX `exam_violations_type_idx`(`type`),
    INDEX `exam_violations_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_invitations` (
    `id` VARCHAR(191) NOT NULL,
    `exam_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NULL,
    `used_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `exam_invitations_token_key`(`token`),
    INDEX `exam_invitations_exam_id_idx`(`exam_id`),
    INDEX `exam_invitations_user_id_idx`(`user_id`),
    INDEX `exam_invitations_email_idx`(`email`),
    INDEX `exam_invitations_token_idx`(`token`),
    INDEX `exam_invitations_created_by_idx`(`created_by`),
    INDEX `exam_invitations_expires_at_idx`(`expires_at`),
    INDEX `exam_invitations_used_at_idx`(`used_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `exams_category_idx` ON `exams`(`category`);

-- CreateIndex
CREATE INDEX `exams_start_date_idx` ON `exams`(`start_date`);

-- CreateIndex
CREATE INDEX `exams_end_date_idx` ON `exams`(`end_date`);

-- AddForeignKey
ALTER TABLE `exam_sessions` ADD CONSTRAINT `exam_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_answers` ADD CONSTRAINT `exam_answers_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `exam_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_violations` ADD CONSTRAINT `exam_violations_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `exam_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_invitations` ADD CONSTRAINT `exam_invitations_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_invitations` ADD CONSTRAINT `exam_invitations_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
