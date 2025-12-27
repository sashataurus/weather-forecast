const cityInput = document.getElementById("cityInput");
const addCityBtn = document.getElementById("addCityBtn");
const citiesContainer = document.getElementById("cities");
const refreshBtn = document.getElementById("refreshBtn");
const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error");
const cityError = document.getElementById("cityError");
const suggestionsEl = document.getElementById("suggestions");

const SAVED_CITIES_KEY = "weatherCities";
let cities = JSON.parse(localStorage.getItem(SAVED_CITIES_KEY)) || [];

const CITY_SUGGESTIONS = [
    "Москва", "Санкт-Петербург", "Новосибирск",
    "Екатеринбург", "Казань", "Нижний Новгород",
    "Самара", "Омск", "Ростов-на-Дону", "Уфа", "Волгоград", "Краснодар"
];

window.onload = () => {
    if (cities.length === 0) {
        requestGeolocation();
    } else {
        loadAllCities();
    }
};

function requestGeolocation() {
    if (!navigator.geolocation) {
        showCityInput();
        return;
    }

    navigator.geolocation.getCurrentPosition(
        pos => {
            const { latitude, longitude } = pos.coords;
            cities.unshift({
                name: "Текущее местоположение",
                lat: latitude,
                lon: longitude
            });
            saveAndLoad();
        },
        () => {
            showCityInput();
        }
    );
}

function showCityInput() {
    cityError.textContent = "Введите город вручную";
}

cityInput.addEventListener("input", () => {
    suggestionsEl.innerHTML = "";
    const value = cityInput.value.toLowerCase();
    if (!value) return;

    CITY_SUGGESTIONS.filter(c => c.toLowerCase().includes(value))
        .forEach(city => {
            const div = document.createElement("div");
            div.textContent = city;
            div.onclick = () => {
                cityInput.value = city;
                suggestionsEl.innerHTML = "";
            };
            suggestionsEl.appendChild(div);
        });
});

// --- ADD CITY ---
addCityBtn.onclick = async () => {
    cityError.textContent = "";
    const cityName = cityInput.value.trim();
    if (!CITY_SUGGESTIONS.includes(cityName)) {
        cityError.textContent = "Такого города нет в списке";
        return;
    }

    try {
        loading(true);
        const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${cityName}&count=1&language=ru`);
        const geoData = await geo.json();

        if (!geoData.results) throw new Error();

        cities.push({
            name: cityName,
            lat: geoData.results[0].latitude,
            lon: geoData.results[0].longitude
        });

        saveAndLoad();
        cityInput.value = "";
    } catch {
        showError("Ошибка получения координат города");
    } finally {
        loading(false);
    }
};

async function loadAllCities() {
    citiesContainer.innerHTML = "";
    for (const city of cities) {
        await loadWeather(city);
    }
}

async function loadWeather(city) {
    try {
        loading(true);
        const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
        );
        const data = await res.json();

        const card = document.createElement("div");
        card.className = "city-card";
        card.innerHTML = `
            <h3>${city.name}</h3>
            <div class="forecast">
                <div>Сегодня: ${data.daily.temperature_2m_max[0]}°C</div>
                <div>Завтра: ${data.daily.temperature_2m_max[1]}°C</div>
                <div>Послезавтра: ${data.daily.temperature_2m_max[2]}°C</div>
            </div>
        `;
        citiesContainer.appendChild(card);
    } catch {
        showError("Ошибка загрузки погоды");
    } finally {
        loading(false);
    }
}

refreshBtn.onclick = () => {
    loadAllCities();
};

function saveAndLoad() {
    localStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(cities));
    loadAllCities();
}

function loading(state) {
    loadingEl.classList.toggle("hidden", !state);
}

function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove("hidden");
    setTimeout(() => errorEl.classList.add("hidden"), 3000);
}
