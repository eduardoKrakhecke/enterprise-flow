import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthErrorService {
  getMessage(error: unknown): string {
    const code = (error as { code?: string })?.code;

    switch (code) {
      case 'auth/invalid-email':
        return 'O e-mail informado é inválido.';
      case 'auth/user-not-found':
        return 'Usuário não encontrado.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'E-mail ou senha incorretos.';
      case 'auth/user-disabled':
        return 'Esta conta foi desativada. Entre em contato com o administrador.';
      case 'auth/operation-not-allowed':
        return 'Este método de autenticação não está habilitado no Firebase.';
      case 'auth/account-exists-with-different-credential':
        return 'Este e-mail já possui uma conta criada com outro método. Use o login com e-mail e senha ou o mesmo método usado no cadastro.';
      case 'auth/credential-already-in-use':
        return 'Esta credencial já está vinculada a outra conta.';
      case 'auth/email-already-in-use':
        return 'Este e-mail já possui cadastro. Volte ao login e use o método original da conta.';
      case 'auth/weak-password':
        return 'A senha deve possuir pelo menos 6 caracteres.';
      case 'auth/popup-closed-by-user':
        return 'A janela de autenticação foi fechada.';
      case 'auth/popup-blocked':
        return 'O navegador bloqueou a janela de autenticação.';
      case 'auth/cancelled-popup-request':
        return 'Outra tentativa de autenticação já está em andamento.';
      case 'auth/network-request-failed':
        return 'Falha de conexão. Verifique sua internet.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas. Aguarde antes de tentar novamente.';
      case 'auth/unauthorized-domain':
        return 'Este domínio não está autorizado no Firebase.';
      case 'auth/invalid-api-key':
        return 'A configuração do Firebase está inválida. Verifique a chave da aplicação.';
      case 'auth/internal-error':
        return 'O Firebase encontrou um erro interno. Tente novamente.';
      case 'permission-denied':
        return 'A autenticação foi concluída, mas o acesso ao Firebase foi negado.';
      case 'failed-precondition':
        return 'O Firebase ainda não possui o índice necessário para esta operação.';
      default:
        return 'Não foi possível realizar a operação. Tente novamente.';
    }
  }
}
