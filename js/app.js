const timeout = 5000; 

const inputCiudad = document.getElementById('city-input');
const botonBuscar = document.getElementById('search-btn');
const divEstado = document.getElementById('connection-status');
const divClima = document.getElementById('weather-info');

botonBuscar.addEventListener('click', buscarClima);

window.addEventListener('offline', () => {
    mostrarEstado(false);
});

window.addEventListener('online', () => {
    divEstado.style.display = 'none'; 
    mostrarEstado(true);
});

async function buscarClima() {
    const ciudad = inputCiudad.value.trim();
    
    if (ciudad === "") {
        return;
    }

    if (navigator.onLine === false) {
        console.log("Modo offline activado para:", ciudad);
        cargarDesdeCache(ciudad);
        return;
    }

    try {
        divEstado.style.display = "none";
        botonBuscar.textContent = "Cargando";
        botonBuscar.disabled = true;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        console.log("Buscando coordenadas para:", ciudad);
        const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(ciudad)}`;
        
        const geoRes = await fetch(geoUrl, { signal: controller.signal });
        const geoData = await geoRes.json();

        if (geoData.length === 0) {
            throw new Error("No encontré esa ciudad");
        }
        
        const { lat, lon, display_name } = geoData[0];

        console.log("Coordenadas encontradas, buscando clima");
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?current_weather=true&latitude=${lat}&longitude=${lon}`;
        
        const weatherRes = await fetch(weatherUrl, { signal: controller.signal });
        const weatherData = await weatherRes.json();

        clearTimeout(timeoutId);

        const nombreCorto = display_name.split(',')[0];
        const temperatura = weatherData.current_weather.temperature;
        
        actualizarUI(nombreCorto, temperatura, "En vivo");
        guardarEnCache(ciudad, nombreCorto, temperatura);

    } catch (error) {
        console.error("Error en la petición:", error);

        if (error.name === 'AbortError') {
            mostrarMensaje("El internet está muy lento. Usando datos guardados", "cached");
        } else {
            mostrarMensaje("Error: " + error.message, "offline");
        }
        cargarDesdeCache(ciudad);

    } finally {
        botonBuscar.textContent = "Ver";
        botonBuscar.disabled = false;
    }
}

function actualizarUI(nombre, temp, fuente) {
    document.getElementById('city-name').textContent = nombre;
    document.getElementById('temp-val').textContent = temp;
    document.getElementById('weather-desc').textContent = "Cielo despejado";
    document.getElementById('data-source').textContent = fuente;
    
    divClima.style.display = 'block';
}

function mostrarMensaje(texto, tipo) {
    divEstado.textContent = texto;
    divEstado.className = `status ${tipo}`;
}

function mostrarEstado(isOnline) {
    if (!isOnline) {
        mostrarMensaje("Sin conexión a Internet", "offline");
    }
}

function guardarEnCache(busqueda, nombreReal, temp) {
    const datos = { 
        nombreReal, 
        temp, 
        fecha: new Date().toLocaleTimeString() 
    };
    localStorage.setItem(busqueda.toLowerCase(), JSON.stringify(datos));
}

function cargarDesdeCache(busqueda) {
    const datosGuardados = localStorage.getItem(busqueda.toLowerCase());
    
    if (datosGuardados) {
        const d = JSON.parse(datosGuardados);
        actualizarUI(d.nombreReal, d.temp, `Modo Offline (Guardado: ${d.fecha})`);
    } else {
        if (!navigator.onLine) {
            mostrarMensaje("No hay datos guardados para esta ciudad.", "offline");
            divClima.style.display = 'none';
        }
    }
}

mostrarEstado(navigator.onLine);