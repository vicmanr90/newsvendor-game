// --- Referencias a los elementos del DOM ---
const subtitle = document.getElementById('subtitle');
const configSection = document.getElementById('config-section');
const distributionSelect = document.getElementById('distribution-select');
const paramsContainer = document.getElementById('params-container');
const submitContainer = document.getElementById('submit-container');
const submitBtn = document.getElementById('submit-btn');

const seedSection = document.getElementById('seed-section');
const seedSection2 = document.getElementById('seed-section2');
const resultsDisplay = document.getElementById('results-display');
const seedContainer = document.getElementById('seed-container');
const seedInput = document.getElementById('seed-input');
const setSeedBtn = document.getElementById('set-seed-btn');

const startGameContainer = document.getElementById('start-game-container');
const startGameBtn = document.getElementById('start-game-btn');

const gameSection = document.getElementById('game-section');
const weekCounterDisplay = document.getElementById('week-counter');
const orderInput = document.getElementById('order-input');
const submitOrderBtn = document.getElementById('submit-order-btn');
const weeklyResultsDisplay = document.getElementById('weekly-results-display');
const totalProfitDisplay = document.getElementById('total-profit-display');
const historyTableBody = document.getElementById('history-table-body');
const exportBtn = document.getElementById('export-btn');

// --- Almacenamiento de estado y Parámetros del juego ---
let finalConfig = {};
let prng;
let weekCounter = 1;
let totalProfit = 0;
const PRECIO_VENTA = 25;
const COSTO_COMPRA = 10;
const VALOR_SOBRANTE = 5;
const COSTO_VENTA_PERDIDA = PRECIO_VENTA - COSTO_COMPRA;

// --- Generador de Números Pseudo-Aleatorios (PRNG) con Semilla (LCG) ---
function createSeededRandom(seed) {
    let s = seed;
    return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
}

// --- Funciones de generación de demanda ---
function generateNormal(mean, stddev) {
    let u1, u2;
    do { u1 = prng(); } while (u1 === 0);
    u2 = prng();
    return (Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)) * stddev + mean;
}

function generateDemand() {
    const p = finalConfig.parameters;
    let demand;
    switch(finalConfig.distribution) {
        case 'uniform':
            demand = p.min + (p.max - p.min) * prng();
            break;
        case 'normal':
            demand = generateNormal(p.mean, p.stddev);
            break;
        case 'laplace':
            const u = prng(); // Generate uniform random number between 0 and 1
            // Inverse CDF for Laplace: μ - b * sign(u - 0.5) * ln(1 - 2|u - 0.5|)
            const term = u - 0.5;
            demand = p.mean - p.b * Math.sign(term) * Math.log(1 - 2 * Math.abs(term));
            break;
        case 'trunc-normal':
            let attempts = 0;
            do {
                demand = generateNormal(p.normal_mean, p.normal_stddev);
                attempts++;
            } while ((demand < p.normal_min || demand > p.normal_max) && attempts < 100);
            if (attempts >= 100) demand = (p.normal_min + p.normal_max) / 2; // Fallback
            break;
    }
    return Math.max(0, Math.round(demand)); // La demanda no puede ser negativa
}

// --- Funciones de formato y UI ---
const formatearMoneda = (valor) => valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

function updateResultsDisplay() {
    let resultsHTML = `<h4 class="font-bold text-md mb-2">Configuración de Demanda:</h4>`;
    const distText = distributionSelect.options[distributionSelect.selectedIndex].text;
    resultsHTML += `<p><strong>Distribución:</strong> ${distText}</p>`;
    // Mostrar parámetros específicos según la distribución
    if (finalConfig.distribution === 'uniform') {
        resultsHTML += `<p><strong>Min:</strong> ${finalConfig.parameters.min}, <strong>Max:</strong> ${finalConfig.parameters.max}</p>`;
    } else if (finalConfig.distribution === 'normal') {
        resultsHTML += `<p><strong>Media (μ):</strong> ${finalConfig.parameters.mean}, <strong>Desviación estándar (σ):</strong> ${finalConfig.parameters.stddev}</p>`;
    } else if (finalConfig.distribution === 'laplace') {
        resultsHTML += `<p><strong>Media (μ):</strong> ${finalConfig.parameters.mean}, <strong>Escala (b):</strong> ${finalConfig.parameters.b}</p>`;
    } else if (finalConfig.distribution === 'trunc-normal') {
        resultsHTML += `<p><strong>Media (μ):</strong> ${finalConfig.parameters.normal_mean}, <strong>Desviación Estándar (σ):</strong> ${finalConfig.parameters.normal_stddev}, <strong>Mín <i>(a)</i>:</strong> ${finalConfig.parameters.normal_min}, <strong>Máx <i>(b)</i>:</strong> ${finalConfig.parameters.normal_max}</p>`;
    }
    if (finalConfig.seed !== undefined) {
            resultsHTML += `<p><strong>Semilla:</strong> ${finalConfig.seed}</p>`;
    }
    resultsDisplay.innerHTML = resultsHTML;
}

// --- Lógica del Flujo de la Aplicación ---
// PASO 1: Configurar distribución
distributionSelect.addEventListener('change', (e) => {
    const selectedValue = e.target.value;
    paramsContainer.querySelectorAll('[id$="-params"]').forEach(p => p.classList.add('hidden'));
    if (selectedValue) {
        document.getElementById(`${selectedValue}-params`).classList.remove('hidden');
        submitContainer.classList.remove('hidden');
    } else {
        submitContainer.classList.add('hidden');
    }
});

submitBtn.addEventListener('click', () => {
    const selectedDistribution = distributionSelect.value;
    if (!selectedDistribution) return;

    const parameters = {};
    const visiblePanel = document.getElementById(`${selectedDistribution}-params`);
    const inputs = visiblePanel.querySelectorAll('.param-input');
    const defaultValues = {'uniform-min':'10','uniform-max':'50','normal-mean':'30','normal-stddev':'5','trunc-normal-mean':'30','trunc-normal-stddev':'10','trunc-normal-min':'0','trunc-normal-max':'1000','laplace-mean':'30', 'laplace-b':'10'};
    inputs.forEach(input => {
        if (!input.value.trim()) input.value = defaultValues[input.id] || '0';
        const key = input.id.substring(input.id.indexOf('-') + 1).replace('-', '_');
        parameters[key] = parseFloat(input.value);
    });
    // Imprimir los parámetros para depuración
    console.log('Parámetros seleccionados:', parameters);
    
    finalConfig = { distribution: selectedDistribution, parameters };
    configSection.classList.add('hidden');
    seedSection2.classList.remove('hidden');
    seedSection.classList.remove('hidden');
    updateResultsDisplay();
});

// PASO 2: Fijar la semilla
function handleSeedSubmit() {
    let seedValue = parseInt(seedInput.value, 10);
    if (isNaN(seedValue)) seedValue = new Date().getTime();
    finalConfig.seed = seedValue;
    seedInput.value = seedValue;
    
    prng = createSeededRandom(finalConfig.seed);

    seedInput.disabled = true;
    setSeedBtn.disabled = true;
    updateResultsDisplay();
    startGameContainer.classList.remove('hidden');
}
setSeedBtn.addEventListener('click', handleSeedSubmit);
seedInput.addEventListener('keydown', (e) => e.key === 'Enter' && handleSeedSubmit());

// PASO 3: Iniciar el juego
startGameBtn.addEventListener('click', () => {
    subtitle.textContent = "Paso 3: Gestiona tu inventario semana a semana.";
    seedSection.classList.add('hidden');
    startGameContainer.classList.add('hidden');
    gameSection.classList.remove('hidden');

    // Mostrar parámetros del negocio
    document.getElementById('precio-venta-display').textContent = formatearMoneda(PRECIO_VENTA);
    document.getElementById('costo-compra-display').textContent = formatearMoneda(COSTO_COMPRA);
    document.getElementById('valor-sobrante-display').textContent = formatearMoneda(VALOR_SOBRANTE);
});

// PASO 4: Loop del juego (generar pedido)
function handleOrderSubmit() {
    const pedido = parseInt(orderInput.value, 10);
    if (isNaN(pedido) || pedido < 0) {
        alert("Por favor, ingresa un número de pedido válido.");
        return;
    }

    const demanda = generateDemand();
    const vendidas = Math.min(pedido, demanda);
    const sobrantes = pedido - vendidas;
    const insatisfecha = demanda - vendidas;
    
    const costoCompra = pedido * COSTO_COMPRA;
    const ingresoVentas = vendidas * PRECIO_VENTA;
    const ingresoSobrantes = sobrantes * VALOR_SOBRANTE;
    const costoVentaPerdida = insatisfecha * COSTO_VENTA_PERDIDA;
    const gananciaSemana = ingresoVentas + ingresoSobrantes - costoCompra-costoVentaPerdida;
    
    totalProfit += gananciaSemana;

    // Actualizar UI
    weeklyResultsDisplay.innerHTML = `
        <div style="text-align: center;"><strong>Desempeño de la semana ${weekCounter}</strong></div>
        <div style="text-align: center;"><strong>Demanda: ${demanda}</strong> unidades.<br>Vendidas: <strong>${vendidas}</strong> und. | Sobrantes: <strong>${sobrantes}</strong> und.</div>
        <hr class="my-1">
        <p>Ingreso por Ventas: <strong>${formatearMoneda(ingresoVentas)}</strong></p>
        <p>Ingreso por Sobrantes: <strong>${formatearMoneda(ingresoSobrantes)}</strong></p>
        <p class="text-red-600">Costo de Compra: <strong>-${formatearMoneda(costoCompra)}</strong></p>
        <p class="text-red-600">Costo por Ventas Perdidas: <strong>-${formatearMoneda(costoVentaPerdida)}</strong></p>
        <p class="text-red-600">Costo de los sobrantes: <strong>-${formatearMoneda(sobrantes*(PRECIO_VENTA-COSTO_COMPRA-VALOR_SOBRANTE))}</strong></p>
        <hr class="my-1">
        <div style="text-align: center; font-weight: bold;"> Ganancia de la semana:<br> <span class="${gananciaSemana >= 0 ? 'text-green-600' : 'text-red-600'}">${formatearMoneda(gananciaSemana)}</span></div>
        <hr class="my-1">
        ${insatisfecha > 0 ? `<p class="text-orange-500 font-semibold">Dejaste de vender <strong>${insatisfecha}</strong> unidades por falta de stock.</p>` : `<p class="text-green-600 font-semibold">Sobraron <strong>${sobrantes}</strong> unidades por exceso de <i>stock</i>.</p>`}
    `;
    weeklyResultsDisplay.classList.remove('hidden');

    totalProfitDisplay.textContent = formatearMoneda(totalProfit);
    totalProfitDisplay.className = `text-4xl font-bold ${totalProfit >= 0 ? 'profit' : 'loss'}`;

    const newRow = historyTableBody.insertRow(0); // Insertar al principio
    newRow.innerHTML = `
        <td class="px-2 py-1 whitespace-nowrap">${weekCounter}</td>
        <td class="px-2 py-1 whitespace-nowrap">${pedido}</td>
        <td class="px-2 py-1 whitespace-nowrap">${demanda}</td>
        <td class="px-2 py-1 whitespace-nowrap font-semibold ${gananciaSemana >= 0 ? 'text-green-600' : 'text-red-600'}">${formatearMoneda(gananciaSemana)}</td>
    `;

    
    // Hacer visible el botón de exportar después de la semana 100
    if (weekCounter === 100) {
        exportBtn.classList.remove('hidden');
    }

    weekCounter++;
    weekCounterDisplay.textContent = weekCounter;
    orderInput.value = '';
    orderInput.focus();
}

submitOrderBtn.addEventListener('click', handleOrderSubmit);
orderInput.addEventListener('keydown', (e) => e.key === 'Enter' && handleOrderSubmit());

// --- Lógica de Exportación ---
function downloadCSV(csv, filename) {
    const csvFile = new Blob([csv], { type: "text/csv" });
    const downloadLink = document.createElement("a");
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

function exportTableToCSV(filename) {
    const csv = [];
    const rows = document.querySelectorAll("#history-table-body tr");
    
    // Agregar encabezados
    const headers = ["Semana", "Pedido", "Demanda", "Ganancia"];
    csv.push(headers.join(","));

    // Invertir el orden de las filas para exportar en orden cronológico
    const reversedRows = Array.from(rows).reverse();

    for (const row of reversedRows) {
        const rowData = [];
        const cols = row.querySelectorAll("td");
        cols.forEach((col, index) => {
            // Limpiar el formato de moneda para la columna de ganancia
            if (index === 3) {
                    rowData.push(col.textContent.replace(/[$\s.]/g, '').replace(',', '.'));
            } else {
                    rowData.push(col.textContent.trim());
            }
        });
        csv.push(rowData.join(","));
    }

    downloadCSV(csv.join("\n"), filename);
}

let yourDate = new Date()
// const offset = yourDate.getTimezoneOffset()
// yourDate = new Date(yourDate.getTime() - (offset*60*1000))
// Colocar la fecha en el formato YYYYMMDD-HHMMSS
const currentTime = yourDate.toISOString().split('T')[0].replace(/-/g, '') + '-' + yourDate.toTimeString().split(' ')[0].replace(/:/g, '.');
// const currentDate = yourDate.toISOString().split('T')[0]

exportBtn.addEventListener('click', () => {
    exportTableToCSV(currentTime+' historial_vendedor.csv');
});