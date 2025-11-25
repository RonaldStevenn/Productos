import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { MovimientoKardex, Producto, Proveedor } from './product.model';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private proveedoresSubject = new BehaviorSubject<Proveedor[]>([
    { id: 'prov-1', nombre: 'Samsung Electronics', telefono: '123-456-7890', web: 'samsung.com' },
    { id: 'prov-2', nombre: 'Distribuidora Ronald', telefono: '098-765-4321' },
    { id: 'prov-3', nombre: 'Tech Supplies Inc.', telefono: '555-555-5555', web: 'techsupplies.com' }
  ]);
  public proveedores$ = this.proveedoresSubject.asObservable();

  private productosSubject = new BehaviorSubject<Producto[]>([]);
  public productos$ = this.productosSubject.asObservable();

  private movimientosSubject = new BehaviorSubject<MovimientoKardex[]>([]);
  public movimientos$ = this.movimientosSubject.asObservable();

  constructor() { }

  private registrarMovimiento(descripcion: string, tipo: 'ENTRADA' | 'SALIDA' | 'SISTEMA', cantidad?: number) {
    const nuevoMovimiento: MovimientoKardex = {
      id: `mov-${new Date().getTime()}`,
      fecha: new Date(),
      descripcion,
      tipo,
      cantidad
    };
    const movimientosActuales = this.movimientosSubject.getValue();
    this.movimientosSubject.next([nuevoMovimiento, ...movimientosActuales]);
  }

  // --- Métodos de Proveedores ---
  getProveedores(): Observable<Proveedor[]> {
    return this.proveedores$;
  }

  addProveedor(proveedor: Omit<Proveedor, 'id'>) {
    const nuevoProveedor: Proveedor = {
      ...proveedor,
      id: `prov-${new Date().getTime()}`
    };
    const proveedoresActuales = this.proveedoresSubject.getValue();
    this.proveedoresSubject.next([...proveedoresActuales, nuevoProveedor]);
    this.registrarMovimiento(`Se creó el proveedor ${nuevoProveedor.nombre}`, 'SISTEMA');
  }

  updateProveedor(proveedorActualizado: Proveedor) {
    const proveedores = this.proveedoresSubject.getValue();
    const index = proveedores.findIndex(p => p.id === proveedorActualizado.id);
    if (index !== -1) {
      proveedores[index] = proveedorActualizado;
      this.proveedoresSubject.next([...proveedores]);
      this.registrarMovimiento(`Se actualizó el proveedor ${proveedorActualizado.nombre}`, 'SISTEMA');
    }
  }

  deleteProveedor(id: string) {
    const proveedoresActuales = this.proveedoresSubject.getValue();
    const proveedorEliminado = proveedoresActuales.find(p => p.id === id);
    if (proveedorEliminado) {
      const proveedoresFiltrados = proveedoresActuales.filter(p => p.id !== id);
      this.proveedoresSubject.next(proveedoresFiltrados);
      this.registrarMovimiento(`Se eliminó el proveedor ${proveedorEliminado.nombre}`, 'SISTEMA');
    }
  }

  // --- Métodos de Productos ---
  getProductos(): Observable<Producto[]> {
    return this.productos$.pipe(
      map(productos => productos.map(p => ({
        ...p,
        ganancia: (p.precioVenta - p.costoCompra) * p.stock
      })))
    );
  }

  addProducto(producto: Omit<Producto, 'id' | 'ganancia'>) {
    const nuevoProducto: Producto = {
      ...producto,
      id: `prod-${new Date().getTime()}`
    };
    const productosActuales = this.productosSubject.getValue();
    this.productosSubject.next([...productosActuales, nuevoProducto]);
    this.registrarMovimiento(`Se creó el producto ${nuevoProducto.nombre}`, 'ENTRADA', nuevoProducto.stock);
  }

  updateProducto(productoActualizado: Producto) {
    const productos = this.productosSubject.getValue();
    const productoOriginal = productos.find(p => p.id === productoActualizado.id);
    const index = productos.findIndex(p => p.id === productoActualizado.id);

    if (index !== -1 && productoOriginal) {
      const stockAnterior = productoOriginal.stock;
      const stockNuevo = productoActualizado.stock;

      productos[index] = productoActualizado;
      this.productosSubject.next([...productos]);

      if (stockNuevo > stockAnterior) {
        this.registrarMovimiento(`Ajuste de stock para ${productoActualizado.nombre}`, 'ENTRADA', stockNuevo - stockAnterior);
      } else if (stockNuevo < stockAnterior) {
        this.registrarMovimiento(`Ajuste de stock para ${productoActualizado.nombre}`, 'SALIDA', stockAnterior - stockNuevo);
      } else {
        this.registrarMovimiento(`Se actualizó información de ${productoActualizado.nombre}`, 'SISTEMA');
      }
    }
  }

  deleteProducto(id: string) {
    const productosActuales = this.productosSubject.getValue();
    const productoEliminado = productosActuales.find(p => p.id === id);
    if (productoEliminado) {
      const productosFiltrados = productosActuales.filter(p => p.id !== id);
      this.productosSubject.next(productosFiltrados);
      this.registrarMovimiento(`Se eliminó el producto ${productoEliminado.nombre}`, 'SALIDA', productoEliminado.stock);
    }
  }

  // --- Métodos de Exportación y Kardex ---
  limpiarKardex(): void {
    this.movimientosSubject.next([]);
    this.registrarMovimiento('Historial depurado', 'SISTEMA');
  }

  exportarExcel(): void {
    const proveedores = this.proveedoresSubject.getValue();
    const dataParaExportar = this.productosSubject.getValue().map(p => {
      const proveedor = proveedores.find(prov => prov.id === p.proveedorId);
      return {
        'ID Producto': p.id,
        'Nombre': p.nombre,
        'Categoría': p.categoria,
        'Proveedor': proveedor ? proveedor.nombre : 'N/A',
        'Stock': p.stock,
        'Costo Compra ($)': p.costoCompra,
        'Precio Venta ($)': p.precioVenta,
        'Ganancia Total ($)': (p.precioVenta - p.costoCompra) * p.stock,
        'URL Imagen': p.imagenUrl || 'Sin imagen'
      };
    });

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataParaExportar);

    // Ajustar ancho de columnas
// Ajustar ancho de columnas
const anchos = Object.keys(dataParaExportar[0] || {}).map(key => ({
  // Agregamos 'as any' para que TypeScript nos deje acceder dinámicamente
  wch: Math.max(key.length, ...dataParaExportar.map(row => (row as any)[key]?.toString().length ?? 0)) + 2
}));
    ws['!cols'] = anchos;


    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

    XLSX.writeFile(wb, 'Inventario_Productos.xlsx');
    this.registrarMovimiento('Se exportó el inventario a Excel', 'SISTEMA');
  }

  // --- Simulación de recarga ---
  recargarDatos(): Observable<boolean> {
    this.productosSubject.next(this.productosSubject.getValue());
    this.proveedoresSubject.next(this.proveedoresSubject.getValue());
    return of(true).pipe(delay(500));
  }
}