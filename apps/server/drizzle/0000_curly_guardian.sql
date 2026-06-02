CREATE TABLE `invites` (
	`id` varchar(36) NOT NULL,
	`email` varchar(320) NOT NULL,
	`school_id` varchar(36) NOT NULL,
	`token` varchar(255) NOT NULL,
	`status` enum('pending','accepted','revoked') NOT NULL DEFAULT 'pending',
	`invited_by` varchar(36),
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `invites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `professors` (
	`id` varchar(36) NOT NULL,
	`school_id` varchar(36) NOT NULL,
	`first_name` varchar(255) NOT NULL,
	`last_name` varchar(255) NOT NULL,
	`department` varchar(255) NOT NULL,
	`title` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `professors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `review_tags` (
	`id` varchar(36) NOT NULL,
	`review_id` varchar(36) NOT NULL,
	`tag` varchar(255) NOT NULL,
	CONSTRAINT `review_tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `review_tag_unique` UNIQUE(`review_id`,`tag`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` varchar(36) NOT NULL,
	`professor_id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`course_code` text,
	`quality_rating` smallint NOT NULL,
	`difficulty_rating` smallint NOT NULL,
	`would_take_again` boolean NOT NULL DEFAULT false,
	`grade` text,
	`comment` text NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`moderated_by` varchar(36),
	`moderated_at` timestamp,
	`deletion_requested` boolean NOT NULL DEFAULT false,
	`deletion_requested_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `review_author_unique` UNIQUE(`professor_id`,`author_id`)
);
--> statement-breakpoint
CREATE TABLE `schools` (
	`id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`slug` varchar(255) NOT NULL,
	`domain` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `schools_id` PRIMARY KEY(`id`),
	CONSTRAINT `schools_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(320) NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text NOT NULL,
	`role` enum('student','admin') NOT NULL DEFAULT 'student',
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`school_id` varchar(36),
	`reset_token` varchar(255),
	`reset_token_expiry` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `votes` (
	`id` varchar(36) NOT NULL,
	`review_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`value` int NOT NULL,
	CONSTRAINT `votes_id` PRIMARY KEY(`id`),
	CONSTRAINT `vote_unique` UNIQUE(`review_id`,`user_id`)
);
--> statement-breakpoint
ALTER TABLE `invites` ADD CONSTRAINT `invites_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invites` ADD CONSTRAINT `invites_invited_by_users_id_fk` FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `professors` ADD CONSTRAINT `professors_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `review_tags` ADD CONSTRAINT `review_tags_review_id_reviews_id_fk` FOREIGN KEY (`review_id`) REFERENCES `reviews`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_professor_id_professors_id_fk` FOREIGN KEY (`professor_id`) REFERENCES `professors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_moderated_by_users_id_fk` FOREIGN KEY (`moderated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `votes` ADD CONSTRAINT `votes_review_id_reviews_id_fk` FOREIGN KEY (`review_id`) REFERENCES `reviews`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `votes` ADD CONSTRAINT `votes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;