ALTER TABLE "MobileIdentity" ADD COLUMN "appleGuestAppUserId" TEXT;

CREATE UNIQUE INDEX "MobileIdentity_appleGuestAppUserId_key" ON "MobileIdentity"("appleGuestAppUserId");
