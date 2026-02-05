const inputCiudad = document.getElementById('city-input');
const botonBuscar = document.getElementById('search-btn');
const pError = document.getElementById('p-error');
const divClima = document.getElementById('weather-info');

botonBuscar.addEventListener('click', buscarClima);

window.addEventListener('offline', () => {
    pError.textContent = "Sin conexión a Internet";
    pError.classList.remove('hidden');
    pError.className = "text-red-500 text-sm mb-2";
});

window.addEventListener('online', () => {
    pError.classList.add('hidden');
});

async function buscarClima() {
    const ciudad = inputCiudad.value.trim();

    if (ciudad === "") {
        return;
    }

    if (navigator.onLine === false) {
        pError.textContent = "Sin conexión a internet.";
        pError.classList.remove('hidden');
        pError.classList.add

        return;
    }

    try {
        pError.classList.add('hidden');
        botonBuscar.textContent = "Cargando";
        botonBuscar.disabled = true;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ciudad)}&count=1&language=es&format=json`;
        const geoRes = await fetch(geoUrl, { signal: controller.signal });
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error("Ciudad no encontrada");
        }

        const { latitude, longitude, name } = geoData.results[0];
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?current_weather=true&latitude=${latitude}&longitude=${longitude}`;

        const weatherRes = await fetch(weatherUrl, { signal: controller.signal });
        const weatherData = await weatherRes.json();

        clearTimeout(timeoutId);

        const nombreCorto = name;
        const temperatura = weatherData.current_weather.temperature;

        actualizarUI(nombreCorto, temperatura, "En vivo");

    } catch (error) {
        pError.classList.remove('hidden');
        pError.className = "text-red-500 text-sm mb-2";
        pError.textContent = `Error al obtener datos: ${error.message}`;

    } finally {
        botonBuscar.textContent = "Ver";
        botonBuscar.disabled = false;
    }
}

function actualizarUI(nombre, temp, fuente) {
    document.getElementById('city-name').textContent = nombre;
    document.getElementById('temp-val').textContent = temp;
    document.getElementById('data-source').textContent = fuente;
    divClima.style.display = 'block';
}

if (!navigator.onLine) {
    pError.textContent = "Sin conexión a Internet";
    pError.classList.remove('hidden');
}