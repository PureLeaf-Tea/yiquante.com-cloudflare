DO $$ BEGIN
 CREATE TYPE "public"."user_role" AS ENUM('admin', 'editor', 'customer_service');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."user_status" AS ENUM('active', 'disabled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(20) NOT NULL,
	"password" varchar(128) NOT NULL,
	"name" varchar(50) NOT NULL,
	"role" "user_role" DEFAULT 'editor' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp,
	"last_login_at" timestamp,
	"last_activity_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_zh" varchar(50) NOT NULL,
	"name_en" varchar(50) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"image" varchar(500),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"parent_id" uuid,
	"is_protected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "showcase_access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"showcase_category_id" uuid NOT NULL,
	"token" varchar(64) NOT NULL,
	"ip" varchar(45),
	"user_agent" varchar(500),
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "showcase_access_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "showcase_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_zh" varchar(50) NOT NULL,
	"name_en" varchar(50) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"image" varchar(500),
	"password" varchar(255) NOT NULL,
	"description_zh" text,
	"description_en" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "showcase_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "showcase_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"showcase_category_id" uuid NOT NULL,
	"showcase_locale" varchar(10),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"url" varchar(500) NOT NULL,
	"alt" varchar(200),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_page_layouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"layout_json" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_page_layouts_product_id_unique" UNIQUE("product_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"locale" varchar(10) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"brewing_guide" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"url" varchar(500) NOT NULL,
	"type" varchar(20) NOT NULL,
	"title" varchar(200),
	"thumbnail" varchar(500),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" varchar(50),
	"name_zh" varchar(200) NOT NULL,
	"name_en" varchar(200) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"category_id" uuid NOT NULL,
	"price_cny" numeric(10, 2) DEFAULT '0' NOT NULL,
	"price_usd" numeric(10, 2) DEFAULT '0' NOT NULL,
	"spec" varchar(200),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"is_recommended" boolean DEFAULT false NOT NULL,
	"og_title" varchar(200),
	"og_description" varchar(500),
	"og_image" varchar(500),
	"show_price_in_showcase" boolean DEFAULT true NOT NULL,
	"seo_title" varchar(200),
	"seo_desc" varchar(500),
	"seo_keywords" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"recommended_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "showcase_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"locale" varchar(10) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"brewing_guide" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"sender_type" varchar(20) NOT NULL,
	"sender_id" uuid,
	"sender_name" varchar(100),
	"content" text NOT NULL,
	"attachment" varchar(500),
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(100) NOT NULL,
	"phone" varchar(30),
	"company" varchar(200),
	"country" varchar(10),
	"message" text,
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"priority" varchar(20) DEFAULT 'normal' NOT NULL,
	"assigned_to" uuid,
	"source" varchar(20) DEFAULT 'website' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inquiry_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"product_id" uuid,
	"product_name" varchar(200) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sample_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(100) NOT NULL,
	"phone" varchar(30),
	"company" varchar(200),
	"country" varchar(10),
	"address" varchar(500),
	"product_id" uuid,
	"product_name" varchar(200),
	"quantity" integer DEFAULT 1 NOT NULL,
	"message" text,
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"tracking_no" varchar(100),
	"approved_by" uuid,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "review_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"url" varchar(500) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"name" varchar(100) NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"content" text NOT NULL,
	"locale" varchar(10),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "certifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"homepage_config_id" uuid,
	"name_zh" varchar(100) NOT NULL,
	"name_en" varchar(100) NOT NULL,
	"image_url" varchar(500),
	"link_url" varchar(500),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cta_buttons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"homepage_config_id" uuid,
	"text_zh" varchar(100) NOT NULL,
	"text_en" varchar(100) NOT NULL,
	"link_url" varchar(500) NOT NULL,
	"variant" varchar(20) DEFAULT 'primary' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hero_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"homepage_config_id" uuid,
	"image_url" varchar(500) NOT NULL,
	"title_zh" varchar(200),
	"title_en" varchar(200),
	"subtitle_zh" varchar(300),
	"subtitle_en" varchar(300),
	"link_url" varchar(500),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "homepage_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_json" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "selling_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"homepage_config_id" uuid,
	"icon" varchar(50),
	"title_zh" varchar(100) NOT NULL,
	"title_en" varchar(100) NOT NULL,
	"description_zh" varchar(500),
	"description_en" varchar(500),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "navigation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label_zh" varchar(50) NOT NULL,
	"label_en" varchar(50) NOT NULL,
	"href" varchar(200) NOT NULL,
	"open_in_new_tab" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" varchar(30) NOT NULL,
	"label_zh" varchar(50),
	"label_en" varchar(50),
	"url" varchar(500) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "page_contents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_key" varchar(50) NOT NULL,
	"title_zh" varchar(200),
	"title_en" varchar(200),
	"content_zh" text,
	"content_en" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "page_contents_page_key_unique" UNIQUE("page_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "site_config" (
	"id" varchar(10) PRIMARY KEY DEFAULT 'main' NOT NULL,
	"brand_name_zh" varchar(100),
	"brand_name_en" varchar(100),
	"slogan_zh" varchar(200),
	"slogan_en" varchar(200),
	"brand_color_primary" varchar(20),
	"brand_color_secondary" varchar(20),
	"contact_email" varchar(100),
	"contact_phone" varchar(30),
	"whatsapp" varchar(30),
	"wechat" varchar(50),
	"address_zh" varchar(200),
	"address_en" varchar(200),
	"gdpr_enabled" boolean DEFAULT true NOT NULL,
	"hcaptcha_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seo_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_key" varchar(50) NOT NULL,
	"title_zh" varchar(200),
	"title_en" varchar(200),
	"description_zh" varchar(500),
	"description_en" varchar(500),
	"keywords" varchar(500),
	"hreflang_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "seo_settings_page_key_unique" UNIQUE("page_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "search_keywords" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"keyword" varchar(100) NOT NULL,
	"target_path" varchar(200) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "search_keywords_keyword_unique" UNIQUE("keyword")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "operation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"username" varchar(20),
	"action" varchar(50) NOT NULL,
	"target_type" varchar(50),
	"target_id" varchar(50),
	"detail" text,
	"ip" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(20) NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255),
	"url" varchar(500) NOT NULL,
	"mime_type" varchar(100),
	"size" integer DEFAULT 0 NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_view_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"locale" varchar(10),
	"country" varchar(10),
	"source" varchar(20) DEFAULT 'website' NOT NULL,
	"referer" varchar(500),
	"ip" varchar(45),
	"user_agent" varchar(500),
	"duration_ms" integer,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gdpr_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"ip" varchar(45),
	"country" varchar(10),
	"consent" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "showcase_access_tokens" ADD CONSTRAINT "showcase_access_tokens_showcase_category_id_showcase_categories_id_fk" FOREIGN KEY ("showcase_category_id") REFERENCES "public"."showcase_categories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "showcase_products" ADD CONSTRAINT "showcase_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "showcase_products" ADD CONSTRAINT "showcase_products_showcase_category_id_showcase_categories_id_fk" FOREIGN KEY ("showcase_category_id") REFERENCES "public"."showcase_categories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_page_layouts" ADD CONSTRAINT "product_page_layouts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_translations" ADD CONSTRAINT "product_translations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_videos" ADD CONSTRAINT "product_videos_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_recommended_id_products_id_fk" FOREIGN KEY ("recommended_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "showcase_translations" ADD CONSTRAINT "showcase_translations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inquiry_items" ADD CONSTRAINT "inquiry_items_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inquiry_items" ADD CONSTRAINT "inquiry_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sample_requests" ADD CONSTRAINT "sample_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "review_images" ADD CONSTRAINT "review_images_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "certifications" ADD CONSTRAINT "certifications_homepage_config_id_homepage_config_id_fk" FOREIGN KEY ("homepage_config_id") REFERENCES "public"."homepage_config"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cta_buttons" ADD CONSTRAINT "cta_buttons_homepage_config_id_homepage_config_id_fk" FOREIGN KEY ("homepage_config_id") REFERENCES "public"."homepage_config"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hero_images" ADD CONSTRAINT "hero_images_homepage_config_id_homepage_config_id_fk" FOREIGN KEY ("homepage_config_id") REFERENCES "public"."homepage_config"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "selling_points" ADD CONSTRAINT "selling_points_homepage_config_id_homepage_config_id_fk" FOREIGN KEY ("homepage_config_id") REFERENCES "public"."homepage_config"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "operation_logs" ADD CONSTRAINT "operation_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uploads" ADD CONSTRAINT "uploads_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_view_logs" ADD CONSTRAINT "product_view_logs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_categories_parent" ON "categories" ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_categories_sort" ON "categories" ("parent_id","sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_showcase_token" ON "showcase_access_tokens" ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_showcase_token_expires" ON "showcase_access_tokens" ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_showcase_cat_parent" ON "showcase_categories" ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_showcase_cat_slug" ON "showcase_categories" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_showcase_prod_unique" ON "showcase_products" ("product_id","showcase_category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_showcase_prod_category" ON "showcase_products" ("showcase_category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_translations_product" ON "product_translations" ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_translations_unique" ON "product_translations" ("product_id","locale");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_videos_product" ON "product_videos" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_products_category" ON "products" ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_products_status" ON "products" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_products_slug" ON "products" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_recommendations_product" ON "recommendations" ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_recommendations_unique" ON "recommendations" ("product_id","recommended_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_showcase_trans_product" ON "showcase_translations" ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_showcase_trans_unique" ON "showcase_translations" ("product_id","locale");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chat_inquiry" ON "chat_messages" ("inquiry_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_inquiries_status" ON "inquiries" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_samples_status" ON "sample_requests" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reviews_status" ON "reviews" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_logs_user" ON "operation_logs" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_logs_created" ON "operation_logs" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_views_product" ON "product_view_logs" ("product_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_views_country" ON "product_view_logs" ("country","timestamp");