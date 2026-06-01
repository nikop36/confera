import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const PROFILE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET ?? 'pplProfilePics';

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export type ProfileImageKind = 'avatar' | 'cover';

function locale(): 'sl' | 'en' {
  if (typeof window === 'undefined') return 'sl';
  return window.localStorage.getItem('confera_locale') === 'en' ? 'en' : 'sl';
}

function extensionFromFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension && /^[a-z0-9]+$/.test(extension)) return extension;

  return file.type.split('/').pop()?.toLowerCase() || 'jpg';
}

export async function uploadProfileImage({
  file,
  uid,
  kind,
}: {
  file: File;
  uid: string;
  kind: ProfileImageKind;
}) {
  if (!supabase) {
    throw new Error(
      locale() === 'en'
        ? 'Supabase storage is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
        : 'Supabase shramba ni nastavljena. Preverite NEXT_PUBLIC_SUPABASE_URL in NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  const extension = extensionFromFile(file);
  const filePath = `users/${uid}/${kind}-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from(PROFILE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    throw new Error(
      error.message ||
        (locale() === 'en'
          ? 'Could not upload image to Supabase.'
          : 'Slike ni bilo mogoče naložiti v Supabase.'),
    );
  }

  const { data } = supabase.storage
    .from(PROFILE_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}
