ALTER TABLE "user" ADD COLUMN "extra_new_day" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "extra_new_count" integer DEFAULT 0 NOT NULL;