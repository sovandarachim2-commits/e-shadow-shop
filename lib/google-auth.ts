type GoogleTokenInfo = {
  aud?: string;
  email?: string;
  email_verified?: string | boolean;
  family_name?: string;
  given_name?: string;
  iss?: string;
  name?: string;
  picture?: string;
  sub?: string;
};

type VerifiedGoogleProfile = {
  email: string;
  googleId: string;
  name: string;
  picture: string | null;
};

export function getGoogleClientId() {
  return process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
}

export function isGoogleAuthConfigured() {
  return Boolean(getGoogleClientId());
}

export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleProfile | null> {
  const clientId = getGoogleClientId();
  if (!clientId) return null;

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, {
    cache: "no-store"
  });
  if (!response.ok) return null;

  const data = (await response.json()) as GoogleTokenInfo;
  const emailVerified = data.email_verified === true || data.email_verified === "true";
  const validIssuer = data.iss === "accounts.google.com" || data.iss === "https://accounts.google.com";

  if (!validIssuer || data.aud !== clientId || !emailVerified || !data.email || !data.sub) {
    return null;
  }

  return {
    email: data.email.trim().toLowerCase(),
    googleId: data.sub,
    name: data.name?.trim() || data.given_name?.trim() || data.email.split("@")[0],
    picture: data.picture?.trim() || null
  };
}
