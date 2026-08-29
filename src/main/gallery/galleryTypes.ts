export type GalleryErrorCode =
  | 'DISK_FULL'
  | 'EMPTY_IMAGE'
  | 'PERMISSION_DENIED'
  | 'PATH_TRAVERSAL'
  | 'NOT_FOUND'
  | 'INVALID_PATH'
  | 'INVALID_PAYLOAD'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNKNOWN';

export interface GalleryError {
  code: string;
  message: string;
}

export interface GalleryItem {
  name: string;
  path: string;
  size: number;
  modified: number;
  ext: string;
}

export interface GalleryResult<T = void> {
  success: boolean;
  data?: T;
  error?: GalleryError;
}
