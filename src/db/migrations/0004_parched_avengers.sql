CREATE TYPE "public"."enrichment_run_status" AS ENUM('pending', 'success', 'failed');--> statement-breakpoint
CREATE TABLE "enrichment_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"source" text NOT NULL,
	"status" "enrichment_run_status" DEFAULT 'pending' NOT NULL,
	"result" jsonb,
	"error_message" text,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "google_accounts" ADD COLUMN "last_contacts_sync_error" text;--> statement-breakpoint
ALTER TABLE "google_accounts" ADD COLUMN "last_calendar_sync_error" text;--> statement-breakpoint
ALTER TABLE "enrichment_runs" ADD CONSTRAINT "enrichment_runs_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;