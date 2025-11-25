CREATE DATABASE IF NOT EXISTS gestion_db;

USE gestion_db;

CREATE TABLE IF NOT EXISTS proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(50),
    email VARCHAR(255),
    web VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    proveedor_id INT,
    costo_compra DECIMAL(10, 2),
    precio_venta DECIMAL(10, 2),
    stock INT,
    categoria VARCHAR(100),
    imagen_url TEXT,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS kardex (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    descripcion TEXT,
    tipo VARCHAR(20) NOT NULL, -- "entrada" o "salida"
    cantidad INT NOT NULL,
    producto_id INT,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);
