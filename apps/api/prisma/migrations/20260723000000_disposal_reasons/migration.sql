CREATE TABLE "DisposalReason" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "DisposalReason_name_key" ON "DisposalReason"("name");

INSERT INTO "DisposalReason" ("id", "name", "description", "active", "updatedAt")
VALUES
  ('disposal-reason-expired', 'Expired', 'Past expiry date or no longer safe to use.', true, CURRENT_TIMESTAMP),
  ('disposal-reason-damaged', 'Damaged', 'Physically damaged stock.', true, CURRENT_TIMESTAMP),
  ('disposal-reason-broken', 'Broken', 'Broken equipment or supplies.', true, CURRENT_TIMESTAMP),
  ('disposal-reason-contaminated', 'Contaminated', 'Contaminated or compromised stock.', true, CURRENT_TIMESTAMP),
  ('disposal-reason-obsolete', 'Obsolete', 'No longer required or superseded.', true, CURRENT_TIMESTAMP),
  ('disposal-reason-recalled', 'Recalled', 'Recalled by supplier, manufacturer, or authority.', true, CURRENT_TIMESTAMP),
  ('disposal-reason-other', 'Other', 'Other documented disposal reason.', true, CURRENT_TIMESTAMP);
