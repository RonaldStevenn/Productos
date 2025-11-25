import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withFetch } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    // ✅ Usamos Zoneless (sin Zone.js) para que coincida con tu proyecto
    provideZonelessChangeDetection(),
    
    provideRouter(routes),
    
    // Mantenemos la conexión HTTP necesaria para el backend
    provideHttpClient(withFetch())
  ]
};