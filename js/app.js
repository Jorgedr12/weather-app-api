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

const circuitBreaker = {
    failureCount: 0,
    state: 'CLOSED',
    resetTimeout: 10000,
    maxFailures: 3,
    nextAttempt: Date.now()
}

async function fetchWithRetry(url, options = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error("Error en el servidor");
            }

            return await response.json();

        } catch (error) {
            if (error.name === 'AbortError' || i === retries - 1) {
                throw error;
            }
            await new Promise(res => setTimeout(res, 1000));
        }
    }
}

async function buscarClima() {
    const ciudad = inputCiudad.value.trim();

    if (ciudad === "") {
        return;
    }

    if (circuitBreaker.state === 'OPEN') {
        if (Date.now() < circuitBreaker.nextAttempt) {
            pError.textContent = "El servicio no está disponible en este momento";
            pError.classList.remove('hidden');
            pError.className = "text-red-500 text-sm mb-2";
            return;
        }
    }

    if (navigator.onLine === false) {
        pError.textContent = "Sin conexión a internet";
        pError.classList.remove('hidden');
        pError.classList.add('text-red-500 text-sm mb-2');

        return;
    }

    try {
        pError.classList.add('hidden');
        botonBuscar.textContent = "Cargando";
        botonBuscar.disabled = true;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ciudad)}&count=1&language=es&format=json`;
        const geoData = await fetchWithRetry(geoUrl, { signal: controller.signal }, 3);

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error("Ciudad no encontrada");
        }

        const { latitude, longitude, name } = geoData.results[0];
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?current_weather=true&latitude=${latitude}&longitude=${longitude}`;

        const weatherData = await fetchWithRetry(weatherUrl, { signal: controller.signal }, 3);

        clearTimeout(timeoutId);

        const nombreCorto = name;
        const temperatura = weatherData.current_weather.temperature;

        circuitBreaker.failureCount = 0;
        circuitBreaker.state = 'CLOSED';
        actualizarUI(nombreCorto, temperatura, "En vivo");

    } catch (error) {
        if (error.name === 'AbortError') {
            circuitBreaker.failureCount++;
            if (circuitBreaker.failureCount >= circuitBreaker.maxFailures) {
                circuitBreaker.state = 'OPEN';
                circuitBreaker.nextAttempt = Date.now() + circuitBreaker.resetTimeout;
            }
        }

        if (error.message === "Ciudad no encontrada") {
            circuitBreaker.failureCount++;
            if (circuitBreaker.failureCount >= circuitBreaker.maxFailures) {
                circuitBreaker.state = 'OPEN';
                circuitBreaker.nextAttempt = Date.now() + circuitBreaker.resetTimeout;
            }
        }

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
