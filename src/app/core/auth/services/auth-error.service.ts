
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthErrorService {

  getMessage(error: unknown): string {

    const code = (
      error as { code?: string }
    )?.code;

    switch (code) {

      case 'auth/invalid-email':
        return 'O e-mail informado é inválido.';

      case 'auth/user-not-found':
        return 'Usuário não encontrado.';

      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'E-mail ou senha incorretos.';

      case 'auth/email-already-in-use':
        return 'Este e-mail já está cadastrado.';

      case 'auth/weak-password':
        return 'A senha deve possuir pelo menos 6 caracteres.';

      case 'auth/popup-closed-by-user':
        return 'A janela de autenticação foi fechada.';

      case 'auth/popup-blocked':
        return 'O navegador bloqueou a janela de autenticação.';

      case 'auth/network-request-failed':
        return 'Falha de conexão. Verifique sua internet.';

      case 'auth/too-many-requests':
        return 'Muitas tentativas. Aguarde antes de tentar novamente.';

      case 'auth/unauthorized-domain':
        return 'Este domínio não está autorizado no Firebase.';

      default:
        return 'Não foi possível realizar a operação. Tente novamente.';
    }
  }
}
