import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Mirrors BE PasswordPolicyService (auth-service):
 * app.password.min-length=10, require-uppercase/lowercase/digit/special=true.
 * Keep in sync with RegistrationRequest / ResetPasswordRequest / ChangePasswordRequest (@Size min 10).
 */
export const PASSWORD_POLICY = {
  minLength: 10,
  maxLength: 72,
  hint: 'Min 10 chars with uppercase, lowercase, digit and special character.',
} as const;

export function passwordPolicyValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value ?? '') as string;
    if (!value) return null; // Validators.required handles emptiness
    const errors: ValidationErrors = {};
    if (value.length < PASSWORD_POLICY.minLength || value.length > PASSWORD_POLICY.maxLength) {
      errors['policyLength'] = `Use ${PASSWORD_POLICY.minLength}-${PASSWORD_POLICY.maxLength} characters.`;
    }
    if (!/[A-Z]/.test(value)) errors['policyUppercase'] = 'Add an uppercase letter.';
    if (!/[a-z]/.test(value)) errors['policyLowercase'] = 'Add a lowercase letter.';
    if (!/\d/.test(value)) errors['policyDigit'] = 'Add a digit.';
    if (!/[^A-Za-z0-9]/.test(value)) errors['policySpecial'] = 'Add a special character.';
    return Object.keys(errors).length ? { passwordPolicy: errors } : null;
  };
}

export function passwordMatchValidator(passwordKey = 'password', confirmKey = 'confirmPassword'): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get(passwordKey)?.value;
    const confirm = group.get(confirmKey)?.value;
    if (password && confirm && password !== confirm) {
      group.get(confirmKey)?.setErrors({ ...(group.get(confirmKey)?.errors ?? {}), mismatch: true });
      return { mismatch: true };
    }
    return null;
  };
}

/** Extract human message from BE ErrorResponse {message, details?: Record<string,string>}. */
export function backendErrorMessage(err: any, fallback: string): string {
  const data = err?.error;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.details && typeof data.details === 'object') {
    const first = Object.values(data.details)[0] as string | undefined;
    if (first) return `${data.message ?? 'Validation failed'}: ${first}`;
  }
  if (data?.message) return data.message;
  if (typeof err?.message === 'string' && err.message.trim()) return err.message;
  return fallback;
}
