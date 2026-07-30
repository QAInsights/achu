import { ACHU_SITE_URL } from '../../shared/branding';

export type SharePlatform = 'x' | 'linkedin' | 'whatsapp' | 'product-hunt' | 'generic';

/**
 * Short, platform-tuned captions that plug achu into every share.
 * Keep X under ~200 chars so room remains for the user's own words.
 */
export function getShareCaption(platform: SharePlatform): string {
  switch (platform) {
    case 'x':
      return `Beautified with achu - free open-source screenshot polish ✨\n${ACHU_SITE_URL}`;
    case 'linkedin':
      return `Beautified this screenshot with achu - free, local, and open source.\n${ACHU_SITE_URL}`;
    case 'whatsapp':
      return `Check out this screenshot I polished with achu (free): ${ACHU_SITE_URL}`;
    case 'product-hunt':
      return `Launch assets made with achu - free open-source screenshot beautifier for Windows, macOS & Linux.\n${ACHU_SITE_URL}`;
    case 'generic':
    default:
      return `Beautified with achu · ${ACHU_SITE_URL}`;
  }
}

/** Build web intent URLs that prefill text where the platform allows it. */
export function buildShareIntentUrl(platform: 'x' | 'whatsapp' | 'linkedin', caption: string): string {
  const encoded = encodeURIComponent(caption);
  switch (platform) {
    case 'x':
      return `https://x.com/intent/post?text=${encoded}`;
    case 'whatsapp':
      return `https://api.whatsapp.com/send?text=${encoded}`;
    case 'linkedin':
      // LinkedIn no longer supports reliable text prefill for feed posts;
      // open the feed so the user can paste the image + caption from clipboard.
      return 'https://www.linkedin.com/feed/';
    default:
      return ACHU_SITE_URL;
  }
}
