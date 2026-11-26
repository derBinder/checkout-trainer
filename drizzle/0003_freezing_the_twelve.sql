CREATE TABLE "practice_day" (
	"user_id" text NOT NULL,
	"day" text NOT NULL,
	CONSTRAINT "practice_day_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
ALTER TABLE "practice_day" ADD CONSTRAINT "practice_day_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;