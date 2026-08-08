-- Additive-only migration for the privacy-safe automation consultation funnel.
-- Existing tables, columns, types, constraints, and rows are not modified.
BEGIN;

CREATE TABLE IF NOT EXISTS "AutomationFunnelEvent" (
  "id" BIGSERIAL PRIMARY KEY,
  "event" VARCHAR(48) NOT NULL,
  "routeTemplate" VARCHAR(120) NOT NULL,
  "ctaPosition" VARCHAR(48),
  "consultationCategory" VARCHAR(48),
  "budgetBucket" VARCHAR(32),
  "deviceClass" VARCHAR(12) NOT NULL,
  "eventDate" DATE NOT NULL,
  "anonymousBucket" VARCHAR(64) NOT NULL,
  "consentState" VARCHAR(12) NOT NULL,
  "deployment" VARCHAR(80) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomationFunnelEvent_event_check"
    CHECK (
      "event" IN (
        'automation_service_view',
        'automation_pricing_view',
        'automation_example_select',
        'automation_cta_click',
        'automation_form_start',
        'automation_form_unavailable',
        'automation_form_validation_error',
        'automation_form_success'
      )
    ),
  CONSTRAINT "AutomationFunnelEvent_route_check"
    CHECK (
      "routeTemplate" IN (
        '/',
        '/services/automation',
        '/safety-ai',
        '/chemical-ra',
        '/ky/paper',
        '/signage',
        '/chatbot',
        '/safety-diary',
        '/features',
        '/education',
        '/strategy/plan-generator',
        '/heat-illness-prevention',
        '/heat-illness-prevention/slides',
        '/heat-illness-prevention/elearning',
        'sitewide'
      )
    ),
  CONSTRAINT "AutomationFunnelEvent_device_check"
    CHECK ("deviceClass" IN ('mobile', 'tablet', 'desktop')),
  CONSTRAINT "AutomationFunnelEvent_consent_check"
    CHECK ("consentState" = 'granted')
);

CREATE INDEX IF NOT EXISTS "AutomationFunnelEvent_expiresAt_idx"
  ON "AutomationFunnelEvent"("expiresAt");

CREATE INDEX IF NOT EXISTS "AutomationFunnelEvent_eventDate_event_idx"
  ON "AutomationFunnelEvent"("eventDate", "event");

CREATE INDEX IF NOT EXISTS "AutomationFunnelEvent_routeTemplate_eventDate_idx"
  ON "AutomationFunnelEvent"("routeTemplate", "eventDate");

CREATE INDEX IF NOT EXISTS "AutomationFunnelEvent_deployment_eventDate_idx"
  ON "AutomationFunnelEvent"("deployment", "eventDate");

COMMIT;
