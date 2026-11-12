
import {
  ApplicationConfig
} from '@angular/core';

import {
  provideRouter
} from '@angular/router';

import {
  provideHttpClient
} from '@angular/common/http';

import {
  provideAnimationsAsync
} from '@angular/platform-browser/animations/async';

import {
  provideFirebaseApp,
  initializeApp
} from '@angular/fire/app';

import {
  provideAuth,
  getAuth
} from '@angular/fire/auth';

import {
  provideFirestore,
  getFirestore
} from '@angular/fire/firestore';

import {
  provideStorage,
  getStorage
} from '@angular/fire/storage';

import {
  provideFunctions,
  getFunctions,
  connectFunctionsEmulator
} from '@angular/fire/functions';

import {
  providePrimeNG
} from 'primeng/config';

import Aura from '@primeuix/themes/aura';

import {
  routes
} from './app.routes';

import {
  environment
} from '../environments/environment';

import { isDevMode } from '@angular/core';

export const appConfig: ApplicationConfig = {

  providers: [

    provideRouter(routes),

    provideHttpClient(),

    provideAnimationsAsync(),

    provideFirebaseApp(() =>
      initializeApp(environment.firebase)
    ),

    provideAuth(() => getAuth()),

    provideFirestore(() => getFirestore()),

    provideStorage(() => getStorage()),

    provideFunctions(() => {
      const functions = getFunctions(
        undefined,
        'southamerica-east1'
      );

      if (isDevMode()) {
        connectFunctionsEmulator(functions, 'localhost', 5001);
      }

      return functions;
    }),

    providePrimeNG({
      theme: {
        preset: Aura,

        options: {
          darkModeSelector: '.app-dark',
          cssLayer: false
        }
      }
    })

  ]

};
