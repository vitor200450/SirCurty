-- CreateEnum
CREATE TYPE "link_status" AS ENUM ('ACTIVE', 'DISABLED', 'DELETED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "google_sub" VARCHAR(255) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "name" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "links" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "original_url" VARCHAR(2048) NOT NULL,
    "owner_anon_id" CHAR(64),
    "owner_user_id" INTEGER,
    "password_hash" VARCHAR(255),
    "is_single_use" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "status" "link_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "links_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "links_exactly_one_owner_check" CHECK (
        (owner_anon_id IS NOT NULL AND owner_user_id IS NULL)
        OR
        (owner_anon_id IS NULL AND owner_user_id IS NOT NULL)
    ),
    CONSTRAINT "links_owner_anon_id_hex_check" CHECK (
        owner_anon_id IS NULL
        OR owner_anon_id ~ '^[0-9a-fA-F]{64}$'
    )
);

-- CreateTable
CREATE TABLE "clicks" (
    "id" SERIAL NOT NULL,
    "link_id" INTEGER NOT NULL,
    "clicked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_hash" CHAR(64),
    "user_agent" VARCHAR(512),
    "referrer" VARCHAR(2048),
    "country" CHAR(2),
    "city" VARCHAR(100),
    "is_bot" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "clicks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_google_sub_key" ON "users"("google_sub");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "links_slug_key" ON "links"("slug");

-- CreateIndex
CREATE INDEX "idx_links_owner_anon_id" ON "links"("owner_anon_id");

-- CreateIndex
CREATE INDEX "idx_links_owner_user_id" ON "links"("owner_user_id");

-- CreateIndex
CREATE INDEX "idx_links_expires_at" ON "links"("expires_at");

-- CreateIndex
CREATE INDEX "idx_links_status" ON "links"("status");

-- CreateIndex
CREATE INDEX "idx_clicks_link_id_clicked_at" ON "clicks"("link_id", "clicked_at");

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "links"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
