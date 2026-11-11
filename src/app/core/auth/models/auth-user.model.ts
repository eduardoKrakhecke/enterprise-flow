
export interface AuthUser {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
  emailVerified: boolean;
}
