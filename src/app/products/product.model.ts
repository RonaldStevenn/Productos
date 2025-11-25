export interface Proveedor {
  id: string;
  nombre: string;
  telefono?: string;
  web?: string;
}

export interface Producto {
  id: string;
  nombre: string;
  proveedorId: string;
  costoCompra: number;
  precioVenta: number;
  stock: number;
  categoria: string;
  ganancia?: number; // Es calculado, por lo tanto opcional en el modelo base
  imagenUrl?: string;
}

export interface MovimientoKardex {
  id: string;
  fecha: Date;
  descripcion: string;
  tipo: 'ENTRADA' | 'SALIDA' | 'SISTEMA';
  cantidad?: number;
}
