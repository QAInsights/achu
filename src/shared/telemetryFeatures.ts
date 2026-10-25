export const TELEMETRY_FEATURES = [
  'export_png', 'export_jpeg', 'export_webp', 'export_copy', 'export_before_after',
  'gallery_save', 'err_gallery_save', 'burst_pack_save', 'err_burst_pack',
  'privacy_scan', 'err_privacy_scan', 'redact_all', 'ocr_grab', 'err_ocr',
  'ai_issue_ollama', 'ai_issue_openai', 'ai_issue_google', 'ai_issue_claude', 'ai_issue_offline', 'err_ai_issue',
  'github_push', 'err_github_push', 'code_studio_open',
  'bg_color', 'bg_gradient', 'bg_blur', 'bg_mesh', 'bg_shader', 'preset_apply',
  'annot_rect', 'annot_filled_rect', 'annot_circle', 'annot_filled_circle', 'annot_line', 'annot_arrow', 'annot_text', 'annot_pen', 'annot_emoji',
  'image_open', 'paste_clipboard', 'onboarding_done', 'onboarding_skip', 'share_prompt_shown',
  'capture_hotkey', 'capture_tray', 'capture_button', 'capture_import', 'update_install',
] as const;

export type TelemetryFeature = (typeof TELEMETRY_FEATURES)[number];

export function isTelemetryFeature(name: unknown): name is TelemetryFeature {
  return typeof name === 'string' && (TELEMETRY_FEATURES as readonly string[]).includes(name);
}
