
import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);

  if (!/^\d{11}$/.test(cpf) || /^(\d)\1+$/.test(cpf)) {
    return false;
  }

  const calculateDigit = (length: number): number => {
    let sum = 0;

    for (let i = 0; i < length; i++) {
      sum += Number(cpf[i]) * (length + 1 - i);
    }

    const result = (sum * 10) % 11;
    return result === 10 ? 0 : result;
  };

  return calculateDigit(9) === Number(cpf[9])
    && calculateDigit(10) === Number(cpf[10]);
}

export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);

  // Validação para CNPJ numérico de 14 dígitos.
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1+$/.test(cnpj)) {
    return false;
  }

  const calculateDigit = (base: string): number => {
    let weight = base.length - 7;
    let sum = 0;

    for (const digit of base) {
      sum += Number(digit) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }

    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calculateDigit(cnpj.slice(0, 12));
  const secondDigit = calculateDigit(cnpj.slice(0, 13));

  return firstDigit === Number(cnpj[12])
    && secondDigit === Number(cnpj[13]);
}

export function documentValidator(
  type: 'individual' | 'company'
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();

    // Documento opcional, mas válido quando informado.
    if (!value) return null;

    const valid = type === 'individual'
      ? isValidCpf(value)
      : isValidCnpj(value);

    return valid ? null : { invalidDocument: true };
  };
}
