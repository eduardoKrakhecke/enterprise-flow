
import {
  EnvironmentInjector,
  Injectable,
  inject,
  runInInjectionContext
} from '@angular/core';

import {
  Auth,
  authState,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  User
} from '@angular/fire/auth';

import { toSignal } from '@angular/core/rxjs-interop';

import { AuthUser } from '../models/auth-user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly auth = inject(Auth);
  private readonly environmentInjector = inject(EnvironmentInjector);

  private readonly authState$ = authState(this.auth);

  readonly firebaseUser = toSignal(
    this.authState$,
    { initialValue: null }
  );

  readonly currentUser = () => {
    const user = this.firebaseUser();

    if (!user) {
      return null;
    }

    return this.mapUser(user);
  };

  async loginWithEmail(
    email: string,
    password: string
  ): Promise<void> {

    await this.runInInjectionContext(() => signInWithEmailAndPassword(
      this.auth,
      email,
      password
    ));
  }

  async loginWithGoogle(): Promise<void> {

    const provider = new GoogleAuthProvider();

    provider.setCustomParameters({
      prompt: 'select_account'
    });

    await this.runInInjectionContext(() => signInWithPopup(
      this.auth,
      provider
    ));
  }

  async register(
    name: string,
    email: string,
    password: string
  ): Promise<void> {

    const credential =
      await this.runInInjectionContext(() => createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      ));

    await this.runInInjectionContext(() => updateProfile(credential.user, {
      displayName: name
    }));
  }

  async sendPasswordReset(
    email: string
  ): Promise<void> {

    await this.runInInjectionContext(() => sendPasswordResetEmail(
      this.auth,
      email
    ));
  }

  async logout(): Promise<void> {
    await this.runInInjectionContext(() => signOut(this.auth));
  }

  private runInInjectionContext<T>(operation: () => T): T {
    return runInInjectionContext(this.environmentInjector, operation);
  }

  private mapUser(user: User): AuthUser {

    return {
      uid: user.uid,
      name: user.displayName ?? 'Usuário',
      email: user.email ?? '',
      photoURL: user.photoURL,
      emailVerified: user.emailVerified
    };
  }

  getCurrentFirebaseUser(): User | null {
    return this.auth.currentUser;
  }
}
