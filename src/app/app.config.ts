import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes), provideClientHydration(withEventReplay()), provideFirebaseApp(() => initializeApp({ projectId: "vote-app-6dc6b", appId: "1:621581520601:web:49cd1f6756c27f63fe38c8", storageBucket: "vote-app-6dc6b.firebasestorage.app", apiKey: "AIzaSyCi_oV291JXsE0BsgSQBkj7Uy5p1aFoW5g", authDomain: "vote-app-6dc6b.firebaseapp.com", messagingSenderId: "621581520601" })), provideAuth(() => getAuth()), provideFirestore(() => getFirestore())]
};
