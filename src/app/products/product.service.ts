import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map } from 'rxjs';
import { Producto, Proveedor, MovimientoKardex } from './product.model';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = 'http://localhost:3000/api'; // Conexión al Backend

  // Estado en memoria para la vista
  private productosSubject = new BehaviorSubject<Producto[]>([]);
  public productos$ = this.productosSubject.asObservable();

  private proveedoresSubject = new BehaviorSubject<Proveedor[]>([]);
  public proveedores$ = this.proveedoresSubject.asObservable();

  private movimientosSubject = new BehaviorSubject<MovimientoKardex[]>([]);
  public movimientos$ = this.movimientosSubject.asObservable();

  constructor(private http: HttpClient) {
    this.recargarDatos().subscribe(); // Carga inicial
  }

  // --- CARGA DE DATOS DESDE BD ---
  recargarDatos(): Observable<boolean> {
    // 1. Cargar Proveedores
    this.http.get<Proveedor[]>(`${this.apiUrl}/proveedores`).subscribe(data => {
      this.proveedoresSubject.next(data);
    });

    // 2. Cargar Kardex (Historial)
    this.http.get<any[]>(`${this.apiUrl}/kardex`).subscribe(data => {
      // Convertir la fecha de texto (MySQL) a Objeto Date (Angular)
      const movimientos = data.map(m => ({ ...m, fecha: new Date(m.fecha) }));
      this.movimientosSubject.next(movimientos);
    });
    // 3. Cargar Productos (Mapeando nombres de BD a Angular)
    return this.http.get<any[]>(`${this.apiUrl}/productos`).pipe(
      map(dbProducts => dbProducts.map(p => this.mapToClient(p))),
      tap(productos => this.productosSubject.next(productos)),
      map(() => true)
    );
  }

  // --- TRADUCTORES (MySQL <-> Angular) ---
  // MySQL usa guiones bajos (costo_compra), Angular usa camelCase (costoCompra)
  
  private mapToClient(dbData: any): Producto {
    return {
      id: dbData.id,
      nombre: dbData.nombre,
      proveedorId: dbData.proveedor_id,
      costoCompra: dbData.costo_compra,
      precioVenta: dbData.precio_venta,
      stock: dbData.stock,
      categoria: dbData.categoria,
      imagenUrl: dbData.imagen_url,
      ganancia: (dbData.precio_venta - dbData.costo_compra) * dbData.stock
    };
  }

  private mapToServer(prod: any): any {
    return {
      nombre: prod.nombre,
      proveedor_id: prod.proveedorId,
      costo_compra: prod.costoCompra,
      precio_venta: prod.precioVenta,
      stock: prod.stock,
      categoria: prod.categoria,
      imagen_url: prod.imagenUrl
    };
  }

  // --- PRODUCTOS ---

  getProductos(): Observable<Producto[]> { return this.productos$; }

  addProducto(producto: any): Observable<any> {
    const datos = this.mapToServer(producto);
    return this.http.post(`${this.apiUrl}/productos`, datos).pipe(
      tap(() => {
        this.recargarDatos().subscribe();
        // Registrar en Kardex
        this.registrarMovimiento(`Creado: ${producto.nombre}`, 'ENTRADA', producto.stock);
      })
    );
  }

  updateProducto(producto: Producto): Observable<any> {
    const datos = this.mapToServer(producto);
    return this.http.put(`${this.apiUrl}/productos/${producto.id}`, datos).pipe(
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

  // --- PROVEEDORES ---

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

  // --- KARDEX E HISTORIAL ---

// --- CORRECCIÓN KARDEX ---
  private registrarMovimiento(descripcion: string, tipo: string, cantidad: number = 0) {
    // 1. Creamos el objeto SIN fecha (MySQL la pondrá automáticamente)
    const movimientoParaBD = { descripcion, tipo, cantidad };

    // 2. Enviamos al Backend
    this.http.post(`${this.apiUrl}/kardex`, movimientoParaBD).subscribe({
      next: (resp: any) => {
        // 3. Al recibir respuesta, actualizamos la lista visualmente
        // Aquí sí agregamos la fecha local para que lo veas sin recargar
        const movimientoVisual = { 
          ...movimientoParaBD, 
          id: resp.id, 
          fecha: new Date() // Fecha visual instantánea
        };
        
        const actual = this.movimientosSubject.getValue();
        this.movimientosSubject.next([movimientoVisual as any, ...actual]);
      },
      error: (err) => console.error('Error guardando historial:', err)
    });
  }
// --- Agrega esta función que falta ---
  limpiarKardex() {
    // Limpiamos la lista local visualmente
    this.movimientosSubject.next([]);
    
    // Opcional: Si quisieras borrarlo de la BD, descomenta la siguiente línea:
    // this.http.delete(`${this.apiUrl}/kardex`).subscribe();

    this.registrarMovimiento('Historial depurado visualmente', 'SISTEMA');
  }
  // --- EXPORTAR EXCEL ---
  exportarExcel() {
    const data = this.productosSubject.getValue().map(p => {
      const prov = this.proveedoresSubject.getValue().find(pr => pr.id == p.proveedorId)?.nombre || 'N/A';
      return {
        'ID': p.id, 'Producto': p.nombre, 'Categoría': p.categoria, 'Proveedor': prov,
        'Stock': p.stock, 'Costo': p.costoCompra, 'Venta': p.precioVenta,
        'Ganancia Total': (p.precioVenta - p.costoCompra) * p.stock
      };
    });

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    if (data.length > 0) {
      const keys = Object.keys(data[0]);
      ws['!cols'] = keys.map(key => ({
        wch: Math.max(key.length, ...data.map(row => (row as any)[key]?.toString().length ?? 0)) + 5
      }));
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    XLSX.writeFile(wb, 'Inventario.xlsx');
  }
}