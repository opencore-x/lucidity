CREATE TYPE "public"."comment_source" AS ENUM('user', 'claude');--> statement-breakpoint
CREATE TYPE "public"."ai_review_depth" AS ENUM('deep', 'light', 'none');--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "source" "comment_source" DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "reminder_at" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "ai_review_depth" "ai_review_depth" DEFAULT 'light' NOT NULL;