CREATE TABLE "time_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"elapsed_seconds" integer DEFAULT 0 NOT NULL,
	"device" varchar(50),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "active_timer_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "total_elapsed_seconds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "time_sessions" ADD CONSTRAINT "time_sessions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_sessions" ADD CONSTRAINT "time_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "time_sessions_task_id_idx" ON "time_sessions" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "time_sessions_user_id_idx" ON "time_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "time_sessions_user_active_idx" ON "time_sessions" USING btree ("user_id","ended_at");