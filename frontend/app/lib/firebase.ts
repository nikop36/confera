const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '';

const FIREBASE_ERRORS: Record<
  string,
  { sl: string; en: string }
> = {
  EMAIL_NOT_FOUND: {
    sl: 'Napačen e-poštni naslov ali geslo',
    en: 'Invalid email or password',
  },
  INVALID_PASSWORD: {
    sl: 'Napačen e-poštni naslov ali geslo',
    en: 'Invalid email or password',
  },
  INVALID_LOGIN_CREDENTIALS: {
    sl: 'Napačen e-poštni naslov ali geslo',
    en: 'Invalid email or password',
  },
  USER_DISABLED: {
    sl: 'Ta račun je onemogočen',
    en: 'This account is disabled',
  },
  TOO_MANY_ATTEMPTS_TRY_LATER: {
    sl: 'Preveč poskusov. Poskusite znova pozneje.',
    en: 'Too many attempts. Please try again later.',
  },
  WEAK_PASSWORD: {
    sl: 'Geslo je prešibko',
    en: 'Password is too weak',
  },
  CREDENTIAL_TOO_OLD_LOGIN_AGAIN: {
    sl: 'Za to dejanje je potrebna ponovna prijava. Prijavite se znova.',
    en: 'This action requires re-authentication. Please sign in again.',
  },
};

function getLocale(): 'sl' | 'en' {
  if (typeof window === 'undefined') return 'sl';
  return window.localStorage.getItem('confera_locale') === 'en' ? 'en' : 'sl';
}

function firebaseErrorMessage(code: string, fallbackSl: string, fallbackEn: string): string {
  const locale = getLocale();
  return FIREBASE_ERRORS[code]?.[locale] ?? (locale === 'en' ? fallbackEn : fallbackSl);
}

export async function firebaseSignIn(
  email: string,
  password: string,
): Promise<{ idToken: string; uid: string }> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );

  const data = (await res.json()) as {
    idToken?: string;
    localId?: string;
    error?: { message: string };
  };

  if (!res.ok || data.error) {
    const code = data.error?.message ?? '';
    throw new Error(firebaseErrorMessage(code, 'Prijava ni uspela', 'Sign in failed'));
  }

  return { idToken: data.idToken ?? '', uid: data.localId ?? '' };
}

export async function firebaseChangePassword(
  idToken: string,
  newPassword: string,
): Promise<{ idToken: string }> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken,
        password: newPassword,
        returnSecureToken: true,
      }),
    },
  );

  const data = (await res.json()) as {
    idToken?: string;
    error?: { message: string };
  };

  if (!res.ok || data.error) {
    const code = data.error?.message ?? '';
    throw new Error(
      firebaseErrorMessage(code, 'Sprememba gesla ni uspela', 'Password change failed'),
    );
  }

  return { idToken: data.idToken ?? idToken };
}
