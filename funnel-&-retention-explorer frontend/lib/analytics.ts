type GTagEvent = {
  page_view: { page_path: string };
  csv_upload: { file_name: string; row_count: number };
  sample_data_load: { sample_type: string };
  funnel_analysis: { step_count: number };
  retention_analysis: { retention_type: string };
  ai_insight_request: Record<string, never>;
  report_export: { format: 'png' | 'pdf' };
  upgrade_modal_open: { reason: string };
  pro_conversion: { billing_cycle: string };
  signup_complete: Record<string, never>;
  signup_success: Record<string, never>;
  upgrade_banner_click: { page: string };
  trial_started: Record<string, never>;
  api_import: { connector_id: string; row_count: number };
  beta_signup: Record<string, never>;
  beta_feature_use: { feature: string };
  beta_feedback_submit: { rating: number; category: string };
};

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

let initialized = false;

export function initGA(): void {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId || !import.meta.env.PROD) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  initialized = true;
}

export function trackPageView(path: string): void {
  if (!initialized) return;
  window.gtag('event', 'page_view', { page_path: path });
}

export function trackEvent<K extends keyof GTagEvent>(
  eventName: K,
  params?: GTagEvent[K]
): void {
  if (!initialized) return;
  window.gtag('event', eventName, params ?? {});
}
