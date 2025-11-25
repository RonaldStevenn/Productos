import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductService } from './product.service';
import { Observable, combineLatest } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { MovimientoKardex, Producto, Proveedor } from './product.model';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './products.component.html',
})
export class ProductsComponent implements OnInit {
  // Flujos de datos
  productos$: Observable<Producto[]>;
  proveedores$: Observable<Proveedor[]>;
  movimientos$: Observable<MovimientoKardex[]>;
  private productosOriginales$: Observable<Producto[]>;

  // KPIs para el Dashboard
  totalProductos$: Observable<number>;
  valorInventario$: Observable<number>;
  stockBajo$: Observable<number>;

  // Formularios y Buscador
  productoForm: FormGroup;
  proveedorForm: FormGroup;
  buscador = new FormControl('', { nonNullable: true });

  // Estado de la UI
  vista: 'listaProductos' | 'formProducto' | 'listaProveedores' | 'kardex' = 'listaProductos';
  productoEnEdicion: Producto | null = null;
  proveedorEnEdicion: Proveedor | null = null;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService
  ) {
    // Inicialización de flujos de datos del servicio
    this.productosOriginales$ = this.productService.getProductos();
    this.proveedores$ = this.productService.getProveedores();
    this.movimientos$ = this.productService.movimientos$;

    // Inicialización de formularios
    this.productoForm = this.fb.group({
      nombre: ['', Validators.required],
      proveedorId: ['', Validators.required],
      categoria: ['', Validators.required],
      stock: [0, [Validators.required, Validators.min(0)]],
      costoCompra: [0, [Validators.required, Validators.min(0)]],
      precioVenta: [0, [Validators.required, Validators.min(0)]],
      imagenUrl: [''],
    });

    this.proveedorForm = this.fb.group({
      nombre: ['', Validators.required],
      telefono: [''],
      web: [''],
    });

    // Lógica del buscador y productos filtrados
    const terminoBusqueda$ = this.buscador.valueChanges.pipe(startWith(''));
    this.productos$ = combineLatest([this.productosOriginales$, terminoBusqueda$]).pipe(
      map(([productos, termino]) => {
        const terminoLower = termino.toLowerCase();
        if (!terminoLower) {
          return productos;
        }
        return productos.filter(p =>
          p.nombre.toLowerCase().includes(terminoLower) ||
          p.categoria.toLowerCase().includes(terminoLower)
        );
      })
    );

    // Lógica para los KPIs del dashboard (calculados desde la lista original)
    this.totalProductos$ = this.productosOriginales$.pipe(map(p => p.length));
    this.valorInventario$ = this.productosOriginales$.pipe(
      map(productos => productos.reduce((acc, p) => acc + (p.costoCompra * p.stock), 0))
    );
    this.stockBajo$ = this.productosOriginales$.pipe(
      map(productos => productos.filter(p => p.stock < 5).length)
    );
  }

  ngOnInit(): void {}

  // --- Control de Vistas ---
  cambiarVista(vista: 'listaProductos' | 'formProducto' | 'listaProveedores' | 'kardex') {
    this.vista = vista;
    if (vista === 'listaProductos') {
      this.productoEnEdicion = null;
      this.productoForm.reset();
    }
    if (vista === 'listaProveedores') {
      this.proveedorEnEdicion = null;
      this.proveedorForm.reset();
    }
  }

  mostrarFormularioProducto(producto?: Producto) {
    if (producto) {
      this.productoEnEdicion = producto;
      this.productoForm.patchValue(producto);
    } else {
      this.productoEnEdicion = null;
      this.productoForm.reset();
    }
    this.vista = 'formProducto';
  }

  mostrarFormularioProveedor(proveedor?: Proveedor) {
    if (proveedor) {
      this.proveedorEnEdicion = proveedor;
      this.proveedorForm.patchValue(proveedor);
    } else {
      this.proveedorEnEdicion = null;
      this.proveedorForm.reset();
    }
    this.vista = 'listaProveedores';
  }

  verKardex() {
    this.cambiarVista('kardex');
  }

  // --- Lógica de Productos ---
  // --- Acciones Producto ---
  guardarProducto() {
    // 1. Validar formulario
    if (this.productoForm.invalid) {
      this.productoForm.markAllAsTouched();
      return;
    }

    const datos = this.productoForm.value;
    
    // 2. Verificar si es EDICIÓN o CREACIÓN
    if (this.productoEnEdicion) {
      const productoActualizado = { ...this.productoEnEdicion, ...datos };
      
      // CASO EDITAR: Usamos .subscribe()
      this.productService.updateProducto(productoActualizado).subscribe({
        next: () => {
          this.mostrarToast('Producto actualizado correctamente');
          this.cambiarVista('listaProductos');
        },
        error: (err) => {
          console.error(err);
          Swal.fire('Error', 'No se pudo actualizar el producto', 'error');
        }
      });

    } else {
      // CASO CREAR: Usamos .subscribe()
      this.productService.addProducto(datos).subscribe({
        next: () => {
          this.mostrarToast('Producto creado con éxito');
          this.cambiarVista('listaProductos');
        },
        error: (err) => {
          console.error(err);
          Swal.fire('Error', 'No se pudo crear el producto', 'error');
        }
      });
    }
  }

borrarProducto(id: string | number) { 
    Swal.fire({
      title: '¿Estás seguro?',
      text: "No podrás revertir esto",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, borrar'
    }).then((result) => {
      if (result.isConfirmed) {
        // AQUÍ AGREGAMOS EL .subscribe()
        this.productService.deleteProducto(id).subscribe({
          next: () => {
            Swal.fire('¡Borrado!', 'El producto ha sido eliminado.', 'success');
          },
          error: (err) => {
            console.error(err);
            Swal.fire('Error', 'No se pudo borrar el producto', 'error');
          }
        });
      }
    });
  }

  // --- Lógica de Proveedores ---
  guardarProveedor() {
    if (this.proveedorForm.invalid) {
      this.proveedorForm.markAllAsTouched();
      return;
    }
    const datosProveedor = this.proveedorForm.value;
    if (this.proveedorEnEdicion) {
      const proveedorActualizado: Proveedor = { ...this.proveedorEnEdicion, ...datosProveedor };
      this.productService.updateProveedor(proveedorActualizado);
    } else {
      this.productService.addProveedor(datosProveedor);
    }
    this.mostrarToast('Proveedor guardado correctamente');
    this.proveedorEnEdicion = null;
    this.proveedorForm.reset();
  }

  borrarProveedor(id: string) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "No podrás revertir esto",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, ¡bórralo!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.productService.deleteProveedor(id);
        Swal.fire('¡Borrado!', 'El proveedor ha sido eliminado.', 'success');
      }
    });
  }

  cancelarEdicionProveedor() {
    this.proveedorEnEdicion = null;
    this.proveedorForm.reset();
  }

  // --- Otras Acciones ---
  recargar() {
    this.isLoading = true;
    this.productService.recargarDatos().subscribe(() => {
      this.isLoading = false;
      this.mostrarToast('Datos recargados');
    });
  }

  exportarExcel() {
    this.productService.exportarExcel();
    this.mostrarToast('Inventario exportado a Excel');
  }

  borrarHistorial() {
    Swal.fire({
      title: '¿Limpiar Historial?',
      text: "Esta acción no se puede deshacer y borrará todos los movimientos.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, ¡límpialo!',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.productService.limpiarKardex();
        Swal.fire('¡Historial Limpio!', 'El kardex de movimientos ha sido depurado.', 'success');
      }
    });
  }

  
  // --- Helpers ---
  getNombreProveedor(proveedorId: string, proveedores: Proveedor[] | null): string {
    if (!proveedores) return '...';
    const proveedor = proveedores.find(p => p.id === proveedorId);
    return proveedor ? proveedor.nombre : 'Desconocido';
  }

  private mostrarToast(mensaje: string, icon: 'success' | 'error' | 'warning' = 'success') {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      }
    });
    Toast.fire({ icon, title: mensaje });
  }
}