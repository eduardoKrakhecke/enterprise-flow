
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface CepAddress {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CepService {
  private readonly http = inject(HttpClient);

  async search(cep: string): Promise<CepAddress | null> {
    const digits = cep.replace(/\D/g, '');

    if (digits.length !== 8) {
      throw new Error('CEP inválido.');
    }

    const result = await firstValueFrom(
      this.http.get<CepAddress>(
        `https://viacep.com.br/ws/${digits}/json/`
      )
    );

    return result.erro ? null : result;
  }
}
