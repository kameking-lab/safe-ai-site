import { trackEvent } from "@/lib/track-events";
import { queueAutomationFunnelEvent } from "@/lib/automation-funnel/client";

export type AutomationAnalyticsEvent =
  | "automation_service_view"
  | "automation_pricing_view"
  | "automation_example_select"
  | "automation_cta_click"
  | "automation_form_start"
  | "automation_form_validation_error"
  | "automation_form_success"
  | "automation_form_unavailable";

export type AutomationAnalyticsPage =
  | "/"
  | "/services/automation"
  | "sitewide";

type AutomationAnalyticsParams = {
  page?: AutomationAnalyticsPage;
  cta_position?: string;
  example_id?: string;
  consultation_type?: string;
  budget_band?: string;
  success?: boolean;
};

const SAFE_TOKEN = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const SAFE_CONSULTATION_TYPE =
  /^(?:automation|ai-utilization|safety-efficiency|training|training-materials|manuals|signage|heat-illness-training|safety-education-materials|wbgt-weather-notifications|heat-signage|ky-document-automation|other)$/;
const SAFE_BUDGET_BAND =
  /^(?:under-50000|50000-100000|100000-300000|300000-500000|over-500000|undecided)$/;

/**
 * 自動化相談の計測は、固定イベントと粗い分類値だけに限定する。
 * 呼び出し元が誤って自由入力やURLを渡しても、許可値以外は送らない。
 */
export function trackAutomationEvent(
  event: AutomationAnalyticsEvent,
  params: AutomationAnalyticsParams = {},
): void {
  const safe: Record<string, string | boolean> = {};

  if (
    params.page === "/" ||
    params.page === "/services/automation" ||
    params.page === "sitewide"
  ) {
    safe.page = params.page;
  }
  if (params.cta_position && SAFE_TOKEN.test(params.cta_position)) {
    safe.cta_position = params.cta_position;
  }
  if (params.example_id && /^model-(?:0[1-9]|1[0-8])$/.test(params.example_id)) {
    safe.example_id = params.example_id;
  }
  if (
    params.consultation_type &&
    SAFE_CONSULTATION_TYPE.test(params.consultation_type)
  ) {
    safe.consultation_type = params.consultation_type;
  }
  if (params.budget_band && SAFE_BUDGET_BAND.test(params.budget_band)) {
    safe.budget_band = params.budget_band;
  }
  if (typeof params.success === "boolean") safe.success = params.success;

  trackEvent(event, safe);
  queueAutomationFunnelEvent(event, {
    ...(typeof safe.cta_position === "string"
      ? { cta_position: safe.cta_position }
      : {}),
    ...(typeof safe.consultation_type === "string"
      ? { consultation_type: safe.consultation_type }
      : {}),
    ...(typeof safe.budget_band === "string"
      ? { budget_band: safe.budget_band }
      : {}),
  });
}
