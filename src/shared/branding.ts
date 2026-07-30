/** Public site URL used in captions, watermarks, and share intents. */
export const ACHU_SITE_URL = 'https://achu.app';

/** Default brand watermark shown on new installs (user can turn off anytime). */
export const ACHU_BRAND_WATERMARK = 'Made with achu · achu.app';

/** New installs get the brand watermark on by default for viral growth. */
export const ACHU_DEFAULT_WATERMARK_ENABLED = true;

/** Default opacity — visible enough to brand, subtle enough not to dominate. */
export const ACHU_DEFAULT_WATERMARK_OPACITY = 0.38;

/** Bottom-right is the standard social brand badge position. */
export const ACHU_DEFAULT_WATERMARK_POSITION = 'right' as const;
