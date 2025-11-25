const mysql = require('mysql2');

// Configura la conexión a la base de datos
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Clases.2025.2025',
  database: 'gestion_db'
});

// Conecta a la base de datos y maneja errores
connection.connect(error => {
  if (error) {
    console.error('Error al conectar a la base de datos:', error);
    // En un entorno de producción, es recomendable usar un pool de conexiones
    // que maneje automáticamente la reconexión.
    return;
  }
  console.log('Conexión exitosa a la base de datos MySQL.');
});

module.exports = connection;
