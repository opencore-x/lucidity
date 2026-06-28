CREATE TYPE "public"."project_visibility" AS ENUM('private', 'shared', 'public');--> statement-breakpoint
CREATE TYPE "public"."member_access" AS ENUM('view', 'edit');--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"access" "member_access" DEFAULT 'edit' NOT NULL,
	"invited_by" uuid,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "project_members_project_user_unique" UNIQUE("project_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "visibility" "project_visibility" DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;