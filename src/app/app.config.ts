import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withFetch } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    // ✅ CORRECCIÓN: Usamos 'Zoneless' para evitar el error de Zone.js
    provideZonelessChangeDetection(), 
    
    provideRouter(routes),
    provideHttpClient(withFetch())
  ]
};