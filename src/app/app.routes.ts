import { Routes } from '@angular/router';
import { ProductsComponent } from './products/products.component'; // Ruta corregida con ./

export const routes: Routes = [
    // Esta línea redirige automáticamente de la raíz ('') a '/products'
    { path: '', redirectTo: '/products', pathMatch: 'full' },
    
    {
        path: 'products',
        component: ProductsComponent,
        title: 'Gestión de Productos'
    }
];