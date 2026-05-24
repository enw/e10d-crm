CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_account_id" uuid NOT NULL,
	"google_event_id" text NOT NULL,
	"title" text,
	"description" text,
	"start_time" timestamp with time zone,
	"end_time" timestamp with time zone,
	"attendees" jsonb,
	"linked_contact_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text DEFAULT '' NOT NULL,
	"emails" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"phones" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"company" text,
	"title" text,
	"location" text,
	"enrichment_blob" jsonb,
	"user_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_interaction_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_contact_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"google_account_id" uuid NOT NULL,
	"google_resource_id" text NOT NULL,
	"raw_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_google_account_id_google_accounts_id_fk" FOREIGN KEY ("google_account_id") REFERENCES "public"."google_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_linked_contact_id_contacts_id_fk" FOREIGN KEY ("linked_contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_contact_links" ADD CONSTRAINT "google_contact_links_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_contact_links" ADD CONSTRAINT "google_contact_links_google_account_id_google_accounts_id_fk" FOREIGN KEY ("google_account_id") REFERENCES "public"."google_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_events_account_event_idx" ON "calendar_events" USING btree ("google_account_id","google_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "google_contact_links_account_resource_idx" ON "google_contact_links" USING btree ("google_account_id","google_resource_id");