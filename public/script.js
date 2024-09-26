document.addEventListener('DOMContentLoaded', function() { 
    const artGrid = document.getElementById('artGrid');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const loader = document.getElementById('loader'); 
    const departmentSelect = document.getElementById('departmentSelect');
    const keywordInput = document.getElementById('keywordInput'); 
    const locationInput = document.getElementById('locationInput');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn'); // Botón de restablecer
    const additionalImagesOnlyCheckbox = document.getElementById('additionalImagesOnly');
    const defaultImage = "https://www.jpeg-repair.org/img/idndex_sample3A.jpg";
    let currentPage = 1;
    const itemsPerPage = 20;
    let totalItems = 0;
    let objectIDs = [];
    let shownObjectIDs = new Set(); 
    let additionalImagesOnly = false;
    let filtersApplied = false;

    // Inicialmente, deshabilitar los botones de paginación
    prevPageBtn.disabled = true;
    nextPageBtn.disabled = true;

    // Mostrar la página principal del museo al hacer clic en el botón de entrada
    document.getElementById('enterMuseumBtn').addEventListener('click', function() {
        document.getElementById('welcome-screen').style.display = 'none';
        document.getElementById('museum-page').style.display = 'block';
        // No mostrar imágenes destacadas inicialmente
        artGrid.innerHTML = '<p>Por favor, aplica un filtro para ver los resultados.</p>';
    });

    // Obtener departamentos al cargar la página
    async function fetchDepartments() {
        try {
            const response = await fetch('https://collectionapi.metmuseum.org/public/collection/v1/departments');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            populateDepartmentSelect(data.departments);
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    }

    // Poblar el select de departamentos
    function populateDepartmentSelect(departments) {
        departments.forEach(department => {
            const option = document.createElement('option');
            option.value = department.departmentId;
            option.textContent = department.displayName;
            departmentSelect.appendChild(option);
        });
    }

    // Función para traducir texto
    async function translateText(text, targetLanguage) {
        try {
            const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLanguage}`);
            const data = await response.json();
            return data.responseData.translatedText;
        } catch (error) {
            console.error('Error translating text:', error);
            return text; // Si falla, devuelve el texto original
        }
    }

    // Función para mostrar objetos con imágenes
    async function displayObjectsWithImages() {
        loader.style.display = 'block';
        artGrid.innerHTML = '';
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const objectsToDisplay = objectIDs.slice(start, end);
    
        const fetchPromises = objectsToDisplay.map(async (objectID) => {
            if (shownObjectIDs.has(objectID)) return;
    
            try {
                const response = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectID}`);
                const data = await response.json();
                if (!data.primaryImageSmall) return;
    
                const hasAdditionalImages = data.additionalImages && data.additionalImages.length > 0;
                if (additionalImagesOnly && !hasAdditionalImages) return;
    
                const title = await translateText(data.title || 'Sin título', 'es');
                const culture = await translateText(data.culture || 'Desconocido', 'es');
                const dynasty = await translateText(data.dynasty || 'Desconocido', 'es');
                const creationDate = await translateText(data.objectDate || 'Fecha desconocida', 'es');
                
                let imageSrc = data.primaryImageSmall || defaultImage;
                let viewMoreButton = '';
                if (hasAdditionalImages) {
                    viewMoreButton = `<button class="view-more" onclick="showAdditionalImages('${encodeURIComponent(JSON.stringify(data.additionalImages))}')">Ver más imágenes</button>`;
                }
    
                const card = `
                    <div class="card" title="Fecha de creación: ${creationDate}">
                        <img src="${imageSrc}" alt="${title}" onerror="this.onerror=null; this.src='${defaultImage}';">
                        <h3>${title}</h3>
                        <p><strong>Cultura:</strong> ${culture}</p>
                        <p><strong>Dinastía:</strong> ${dynasty}</p>
                        ${viewMoreButton}
                    </div>
                `;
                artGrid.insertAdjacentHTML('beforeend', card);
                shownObjectIDs.add(objectID);
            } catch (error) {
                console.error(`Error al recuperar el objeto con ID ${objectID}:`, error);
            }
        });
    
        await Promise.all(fetchPromises);
        loader.style.display = 'none';
        updatePaginationButtons();
    }

    // Función para obtener los IDs de objetos según los filtros aplicados
    async function fetchObjectIDs() {
        loader.style.display = 'block';
        const department = departmentSelect.value;
        const keyword = keywordInput.value.trim();            
        const location = locationInput.value;
        
        let apiUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q=${encodeURIComponent(keyword)}`;
        
        if (department) {
            apiUrl += `&departmentId=${department}`;
        }
        
        if (location) {
            apiUrl += `&geoLocation=${encodeURIComponent(location)}`;
        }
        
        try {   
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            if (data.objectIDs && data.objectIDs.length > 0) {
                objectIDs = data.objectIDs;
                totalItems = objectIDs.length;
                console.log(`Se encontraron ${totalItems} objetos con los filtros aplicados.`);
                await displayObjectsWithImages();
            } else {
                console.warn('No se encontraron objetos con los filtros aplicados.');
                artGrid.innerHTML = '<p>No se encontraron resultados. Intente con otros filtros.</p>';
            }
        } catch (error) {
            console.error('Error fetching object IDs:', error);
        } finally {
            loader.style.display = 'none';
        }
    }

    // Función para actualizar los botones de paginación
    function updatePaginationButtons() {
        prevPageBtn.disabled = currentPage === 1 || !filtersApplied;
        nextPageBtn.disabled = !filtersApplied || (currentPage * itemsPerPage) >= totalItems;
    }

    // Función para restablecer los filtros
    resetFiltersBtn.addEventListener('click', function() {
        // Limpiar campos de entrada
        departmentSelect.value = "";
        keywordInput.value = "";
        locationInput.value = "";
        additionalImagesOnlyCheckbox.checked = false;

        // Restablecer las variables internas
        currentPage = 1;
        totalItems = 0;
        objectIDs = [];
        shownObjectIDs = new Set();
        additionalImagesOnly = false;
        filtersApplied = false;

        // Limpiar el grid de arte para dejar la página vacía
        artGrid.innerHTML = '<p>No se han aplicado filtros. Por favor, utiliza los filtros para ver los resultados.</p>';

        // Desactivar botones de paginación
        prevPageBtn.disabled = true;
        nextPageBtn.disabled = true;

        console.log('Filtros restablecidos y página vacía.');
    });

    // Funciones para manejar la paginación
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loader.style.display = 'block';
            displayObjectsWithImages();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        if (filtersApplied && currentPage * itemsPerPage < totalItems) {
            currentPage++;
            loader.style.display = 'block';
            displayObjectsWithImages();
        }
    });

    // Evento para aplicar filtros
    applyFiltersBtn.addEventListener('click', () => {
        additionalImagesOnly = additionalImagesOnlyCheckbox.checked;
        currentPage = 1;
        filtersApplied = true;
        fetchObjectIDs();
        updatePaginationButtons();
    });

    // Obtener los departamentos al cargar la página
    fetchDepartments();

    // Función para mostrar imágenes adicionales
    window.showAdditionalImages = function (encodedImages) {
        const images = JSON.parse(decodeURIComponent(encodedImages));
        const modalContent = images.map(image => `<img src="${image}" class="modal-image" alt="Imagen adicional">`).join('');
        const modal = `
            <div class="modal" id="imageModal">
                <div class="modal-content">
                    <span class="close-button" onclick="closeModal()">×</span>
                    ${modalContent}
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modal);
        document.getElementById('imageModal').style.display = 'block';
    };

    // Función para cerrar el modal
    window.closeModal = function () {
        const modal = document.getElementById('imageModal');
        if (modal) {
            modal.remove();
        }
    };
});
