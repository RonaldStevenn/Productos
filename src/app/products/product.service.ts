import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map } from 'rxjs';
import { Producto, Proveedor, MovimientoKardex } from './product.model';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = 'http://localhost:3000/api'; // Asegúrate que tu backend corre aquí

  // Stores en memoria
  private productosSubject = new BehaviorSubject<Producto[]>([]);
  public productos$ = this.productosSubject.asObservable();

  private proveedoresSubject = new BehaviorSubject<Proveedor[]>([]);
  public proveedores$ = this.proveedoresSubject.asObservable();

  private movimientosSubject = new BehaviorSubject<MovimientoKardex[]>([]);
  public movimientos$ = this.movimientosSubject.asObservable();

  constructor(private http: HttpClient) {
    this.recargarDatos().subscribe(); // Importante: Iniciar carga de datos
  }

  // === CARGA DE DATOS ===
  recargarDatos(): Observable<boolean> {
    // Cargar Proveedores
    this.http.get<any[]>(`${this.apiUrl}/proveedores`).subscribe(data => {
      this.proveedoresSubject.next(data);
    });

    // Cargar Kardex
    this.http.get<any[]>(`${this.apiUrl}/kardex`).subscribe(data => {
      this.movimientosSubject.next(data);
    });

    // Cargar Productos (y mapear nombres de BD a Frontend)
    return this.http.get<any[]>(`${this.apiUrl}/productos`).pipe(
      map(dbData => dbData.map(p => this.mapToClient(p))),
      tap(productos => this.productosSubject.next(productos)),
      map(() => true)
    );
  }

  // --- MAPEOS (Traducción Angular <-> MySQL) ---
  
  // De MySQL (snake_case) a Angular (camelCase)
  private mapToClient(data: any): Producto {
    return {
      id: data.id,
      nombre: data.nombre,
      proveedorId: data.proveedor_id, // Ojo al guion bajo
      costoCompra: data.costo_compra,
      precioVenta: data.precio_venta,
      stock: data.stock,
      categoria: data.categoria,
      imagenUrl: data.imagen_url,
      ganancia: (data.precio_venta - data.costo_compra) * data.stock
    };
  }

  // De Angular (camelCase) a MySQL (snake_case)
  private mapToServer(producto: any): any {
    return {
      nombre: producto.nombre,
      proveedor_id: producto.proveedorId,
      costo_compra: producto.costoCompra,
      precio_venta: producto.precioVenta,
      stock: producto.stock,
      categoria: producto.categoria,
      imagen_url: producto.imagenUrl
    };
  }

  // === MÉTODOS CRUD (Con traducción) ===

  getProductos(): Observable<Producto[]> {
    return this.productos$;
  }

  addProducto(producto: any): Observable<any> {
    const datosBD = this.mapToServer(producto); // Traducir antes de enviar
    return this.http.post(`${this.apiUrl}/productos`, datosBD).pipe(
      tap(() => {
        this.recargarDatos().subscribe(); // Actualizar lista visual
        this.registrarMovimiento(`Creado: ${producto.nombre}`, 'ENTRADA', producto.stock);
      })
    );
  }

  updateProducto(producto: Producto): Observable<any> {
    const datosBD = this.mapToServer(producto);
    return this.http.put(`${this.apiUrl}/productos/${producto.id}`, datosBD).pipe(
      tap(() => {
        this.recargarDatos().subscribe();
        this.registrarMovimiento(`Editado: ${producto.nombre}`, 'SISTEMA');
      })
    );
  }

  deleteProducto(id: string | number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/productos/${id}`).pipe(
      tap(() => {
        this.recargarDatos().subscribe();
        this.registrarMovimiento('Producto eliminado', 'SALIDA');
      })
    );
  }

  // === PROVEEDORES ===
  getProveedores() { return this.proveedores$; }

  addProveedor(prov: any) {
    this.http.post(`${this.apiUrl}/proveedores`, prov).subscribe(() => this.recargarDatos().subscribe());
  }

  updateProveedor(prov: Proveedor) {
    this.http.put(`${this.apiUrl}/proveedores/${prov.id}`, prov).subscribe(() => this.recargarDatos().subscribe());
  }

  deleteProveedor(id: string | number) {
    this.http.delete(`${this.apiUrl}/proveedores/${id}`).subscribe(() => this.recargarDatos().subscribe());
  }

  // === KARDEX & EXCEL ===
  private registrarMovimiento(descripcion: string, tipo: string, cantidad: number = 0) {
    this.http.post(`${this.apiUrl}/kardex`, { descripcion, tipo, cantidad, fecha: new Date() }).subscribe();
  }

  limpiarKardex() {
    // Si implementaste el endpoint DELETE en el backend, descomenta la siguiente línea:
    // this.http.delete(`${this.apiUrl}/kardex`).subscribe(() => this.movimientosSubject.next([]));
    this.movimientosSubject.next([]); // Limpieza visual temporal
  }

  exportarExcel() {
    const data = this.productosSubject.getValue().map(p => {
      // Forzamos 'any' para evitar errores de tipado estricto en el reduce
      const pAny = p as any;
      const prov = this.proveedoresSubject.getValue().find(pr => pr.id == p.proveedorId)?.nombre || 'N/A';
      return {
        'ID': p.id, 'Producto': p.nombre, 'Categoría': p.categoria, 'Proveedor': prov,
        'Stock': p.stock, 'Costo': p.costoCompra, 'Venta': p.precioVenta,
        'Ganancia Total': (p.precioVenta - p.costoCompra) * p.stock
      };
    });

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    // Ajuste de ancho de columnas corregido
    if (data.length > 0) {
      const keys = Object.keys(data[0]);
      ws['!cols'] = keys.map(key => ({
        wch: Math.max(key.length, ...data.map(row => (row as any)[key]?.toString().length ?? 0)) + 2
      }));
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    XLSX.writeFile(wb, 'Inventario_Completo.xlsx');
  }
}