const express = require('express');
const path = require('path');
const fetch = require('node-fetch'); // Necesario si estás usando Node.js sin compatibilidad nativa con fetch
const app = express();
const port = 3000;

// URL de departamentos
const URL_DPTOS = 'https://collectionapi.metmuseum.org/public/collection/v1/departments'; // Reemplaza con la URL real de la API

// Middleware para analizar el cuerpo de la solicitud JSON
app.use(express.json());

// Ruta para cargar departamentos
app.get("/dpto", (req, res) => {
    fetch(URL_DPTOS)
        .then((response) => response.json())
        .then((data) => {
            res.send({ departments: data.departments });
        })
        .catch(error => res.status(500).json({ error: 'Error fetching departments' }));
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Enviar el archivo HTML al acceder a la raíz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
