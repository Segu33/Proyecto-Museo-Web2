const express = require('express');
const path = require('path');
const translate = require('node-google-translate-skidz'); // Importa el paquete de traducción
const fetch = require('node-fetch'); // Necesario si estás usando Node.js sin compatibilidad nativa con fetch
const app = express();
const port = 3000;

// URL de departamentos
const URL_DPTOS = 'https://ejemplo.com/api/departamentos'; // Reemplaza con la URL real de la API

// Middleware para analizar el cuerpo de la solicitud JSON
app.use(express.json());

// Ruta para traducir texto
app.post('/translate', (req, res) => {
    const { text, targetLang } = req.body;

    translate({
        text: text,
        source: 'en', // Idioma de origen (Inglés)
        target: targetLang, // Idioma de destino (como 'es' para español)
    }, (result) => {
        if (result && result.translation) {
            res.json({ translatedText: result.translation });
        } else {
            res.status(500).json({ error: 'Error al traducir el texto' });
        }
    });
});

// Ruta para cargar departamentos y traducir el resultado
app.get("/dpto", (req, res) => {
    fetch(URL_DPTOS)
        .then((response) => response.json())
        .then((data) => {
            const departments = data.departments.map(department => department.displayName).join(". "); // Unir todos los nombres en un string

            // Traducir todos los nombres de departamentos
            translate({
                text: departments,
                source: 'en',
                target: 'es'
            }, function (result) {
                if (result && result.translation) {
                    const translatedNames = result.translation.split(". "); // Dividir el string traducido de vuelta en un array
                    // Mapear nombres traducidos de nuevo a los departamentos
                    const translatedDepartments = data.departments.map((department, index) => {
                        return {
                            ...department,
                            displayName: translatedNames[index] || department.displayName
                        };
                    });
                    res.send({ departments: translatedDepartments });
                } else {
                    res.status(500).json({ error: 'Error al traducir los nombres de los departamentos' });
                }
            });
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
