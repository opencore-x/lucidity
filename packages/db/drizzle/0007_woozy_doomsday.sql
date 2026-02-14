ALTER TABLE "tasks" ADD COLUMN "task_number" integer;--> statement-breakpoint
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY project_id ORDER BY created_at ASC
  ) AS rn
  FROM tasks
  WHERE project_id IS NOT NULL
)
UPDATE tasks SET task_number = numbered.rn
FROM numbered WHERE tasks.id = numbered.id;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_task_number_unique" UNIQUE("project_id","task_number");