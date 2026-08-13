DO $$ BEGIN
 CREATE TYPE "public"."hero_device" AS ENUM('desktop', 'mobile');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "hero_images" ADD COLUMN "device" "hero_device" DEFAULT 'desktop' NOT NULL;--> statement-breakpoint
ALTER TABLE "navigation_items" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "site_config" ADD COLUMN "logo_url" varchar(500);--> statement-breakpoint
ALTER TABLE "site_config" ADD COLUMN "font_family" varchar(50);--> statement-breakpoint
ALTER TABLE "site_config" ADD COLUMN "multi_language_enabled" boolean DEFAULT true NOT NULL;