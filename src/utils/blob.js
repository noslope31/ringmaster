import { upload } from '@vercel/blob/client';

const BLOB_HOST_MARKER = '.public.blob.vercel-storage.com';

export const isBlobUrl = (url) => typeof url === 'string' && url.includes(BLOB_HOST_MARKER);

// Accepts a data URL (from compressImage) or a plain http(s) URL (e.g. a Drive link)
export const uploadImageToBlob = async (source, filenameHint = 'ring') => {
  const res = await fetch(source);
  const blob = await res.blob();
  const ext = blob.type === 'image/png' ? 'png' : 'jpg';
  const pathname = `rings/${filenameHint}-${Date.now()}.${ext}`;

  const result = await upload(pathname, blob, {
    access: 'public',
    handleUploadUrl: '/api/upload',
    contentType: blob.type,
  });

  return result.url;
};
