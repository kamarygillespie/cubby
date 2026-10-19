// Pure signup rules, shared by the form (live feedback) and the server
// action (authoritative check — never trust the client alone).

// Supabase's default minimum (supabase/config.toml `minimum_password_length`).
export const PASSWORD_MIN_LENGTH = 6;

export function signUpPasswordError(
  password: string,
  confirmPassword: string,
): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password !== confirmPassword) {
    return "Passwords don't match.";
  }
  return null;
}
