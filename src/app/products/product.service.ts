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

  // Stores en memoria para la vista (se actualizan automáticamente tras cada petición)
  private productosSubject = new BehaviorSubject<Producto[]>([]);
  public productos$ = this.productosSubject.asObservable();

  private proveedoresSubject = new BehaviorSubject<Proveedor[]>([]);
  public proveedores$ = this.proveedoresSubject.asObservable();

  private movimientosSubject = new BehaviorSubject<MovimientoKardex[]>([]);
  public movimientos$ = this.movimientosSubject.asObservable();

  constructor(private http: HttpClient) {
    this.recargarDatos().subscribe(); // Carga inicial de datos reales
  }

  // === CARGA DE DATOS DESDE MYSQL ===
  recargarDatos(): Observable<boolean> {
    // 1. Cargar Proveedores
    this.http.get<Proveedor[]>(`${this.apiUrl}/proveedores`).subscribe(data => {
      this.proveedoresSubject.next(data);
    });

    // 2. Cargar Kardex (Historial)
    this.http.get<any[]>(`${this.apiUrl}/kardex`).subscribe(data => {
      // Convertir fecha de texto a Objeto Date para que Angular la entienda
      const movimientos = data.map(m => ({ ...m, fecha: new Date(m.fecha) }));
      this.movimientosSubject.next(movimientos);
    });

    // 3. Cargar Productos (Traduciendo nombres de columna)
    return this.http.get<any[]>(`${this.apiUrl}/productos`).pipe(
      map(dbProducts => dbProducts.map(p => this.mapToClient(p))),
      tap(productos => this.productosSubject.next(productos)),
      map(() => true)
    );
  }

  // --- TRADUCTORES (MySQL <-> Angular) ---
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

  // === PRODUCTOS (CONECTADO A BD) ===

  getProductos(): Observable<Producto[]> { return this.productos$; }

  addProducto(producto: any): Observable<any> {
    const datos = this.mapToServer(producto);
    return this.http.post(`${this.apiUrl}/productos`, datos).pipe(
      tap(() => {
        this.recargarDatos().subscribe();
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

  // === PROVEEDORES (AHORA SÍ CONECTADO A BD) ===

  getProveedores() { return this.proveedores$; }

  addProveedor(prov: any) {
    // Enviamos al backend
    this.http.post(`${this.apiUrl}/proveedores`, prov).subscribe(() => {
      this.recargarDatos().subscribe(); // Actualizamos la lista visual
      this.registrarMovimiento(`Nuevo proveedor: ${prov.nombre}`, 'SISTEMA');
    });
  }

  updateProveedor(prov: Proveedor) {
    this.http.put(`${this.apiUrl}/proveedores/${prov.id}`, prov).subscribe(() => {
      this.recargarDatos().subscribe();
    });
  }

  deleteProveedor(id: string | number) {
    this.http.delete(`${this.apiUrl}/proveedores/${id}`).subscribe(() => {
      this.recargarDatos().subscribe();
      this.registrarMovimiento('Proveedor eliminado', 'SISTEMA');
    });
  }

  // === KARDEX E HISTORIAL ===

  private registrarMovimiento(descripcion: string, tipo: string, cantidad: number = 0) {
    // Enviamos sin fecha (MySQL la pone automática)
    const mov = { descripcion, tipo, cantidad };
    this.http.post(`${this.apiUrl}/kardex`, mov).subscribe(() => {
      // Actualizamos visualmente sin esperar recarga completa
      this.recargarDatos().subscribe(); 
    });
  }

limpiarKardex() {
    // 1. Llamamos al endpoint DELETE del backend
    this.http.delete(`${this.apiUrl}/kardex`).subscribe({
      next: () => {
        // 2. Si se borró bien en BD, limpiamos la lista visual
        this.movimientosSubject.next([]);
        
        // 3. Agregamos un registro de sistema indicando la limpieza
        this.registrarMovimiento('Historial depurado completamente', 'SISTEMA');
        
        // Opcional: Mostrar una alerta pequeña si usas SweetAlert aquí o dejar que el componente lo maneje
      },
      error: (err) => console.error('Error al borrar historial:', err)
    });
  }

  // === EXPORTAR EXCEL ===
  exportarExcel() {
    const data = this.productosSubject.getValue().map(p => {
      // Usamos '==' para comparar ID numérico con string sin problemas
      const prov = this.proveedoresSubject.getValue().find(pr => pr.id == p.proveedorId)?.nombre || 'N/A';
      const ganancia = (p.precioVenta - p.costoCompra) * p.stock;

      return {
        'ID': p.id, 'Producto': p.nombre, 'Categoría': p.categoria, 'Proveedor': prov,
        'Stock': p.stock, 'Costo ($)': p.costoCompra, 'Venta ($)': p.precioVenta,
        'Ganancia Total ($)': ganancia
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
    XLSX.writeFile(wb, 'Inventario_Gestion.xlsx');
  }
}