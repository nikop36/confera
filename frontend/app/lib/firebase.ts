const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '';

const FIREBASE_ERRORS: Record<string, string> = {
  EMAIL_NOT_FOUND: 'Napačen e-poštni naslov ali geslo',
  INVALID_PASSWORD: 'Napačen e-poštni naslov ali geslo',
  INVALID_LOGIN_CREDENTIALS: 'Napačen e-poštni naslov ali geslo',
  USER_DISABLED: 'Ta račun je onemogočen',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Preveč poskusov. Poskusite znova pozneje.',
};

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
    throw new Error(FIREBASE_ERRORS[code] ?? 'Prijava ni uspela');
  }

  return { idToken: data.idToken ?? '', uid: data.localId ?? '' };
}
