document.addEventListener('DOMContentLoaded', () => {
    // --- PARÁMETROS ECONÓMICOS ---
    const costoCompra = 1500;
    const precioVenta = 2500;
    const valorSobrante = 500;
    const costoVentaPerdida = 800;

    // --- ESTADO DEL JUEGO ---
    let semanaActual = 1;
    let gananciaAcumulada = 0;
    let juegoIniciado = false;
    let prng;
    let configSimulacion = {};

    // --- ELEMENTOS DEL DOM ---
    const semillaInput = document.getElementById('semilla');
    const tipoDistroSelect = document.getElementById('tipo-distribucion');
    const btnIniciarJuego = document.getElementById('btn-iniciar-juego');
    const panelConfiguracion = document.getElementById('panel-configuracion');
    const panelJuego = document.getElementById('panel-juego');
    const numeroSemanaEl = document.getElementById('numero-semana');
    const gananciaAcumuladaEl = document.getElementById('ganancia-acumulada');
    const pedidoUsuarioInput = document.getElementById('pedido-usuario');
    const btnPedir = document.getElementById('btn-pedir');
    const textoResultadosEl = document.getElementById('texto-resultados');
    const tablaHistorialBody = document.querySelector('#tabla-historial tbody');

    // --- LÓGICA DE CONFIGURACIÓN ---
    
    // Muestra dinámicamente los parámetros correctos al cambiar la selección
    tipoDistroSelect.addEventListener('change', () => {
        document.querySelectorAll('.params-container').forEach(el => el.classList.add('hidden'));
        const selected = tipoDistroSelect.value;
        document.getElementById(`params-${selected}`).classList.remove('hidden');
    });

    btnIniciarJuego.addEventListener('click', iniciarJuego);

    function iniciarJuego() {
        const semilla = parseInt(semillaInput.value);
        if (isNaN(semilla)) {
            alert("Por favor, ingresa una semilla numérica válida.");
            return;
        }
        
        prng = createPRNG(semilla);
        
        configSimulacion.distribucion = tipoDistroSelect.value;
        // Lee los parámetros de la distribución seleccionada
        switch (configSimulacion.distribucion) {
            case 'uniforme':
                configSimulacion.min = parseInt(document.getElementById('unif-min').value);
                configSimulacion.max = parseInt(document.getElementById('unif-max').value);
                break;
            case 'normal':
                configSimulacion.mu = parseFloat(document.getElementById('norm-mu').value);
                configSimulacion.sigma = parseFloat(document.getElementById('norm-sigma').value);
                break;
            case 'normal-truncada':
                configSimulacion.mu = parseFloat(document.getElementById('trunc-mu').value);
                configSimulacion.sigma = parseFloat(document.getElementById('trunc-sigma').value);
                configSimulacion.min = parseInt(document.getElementById('trunc-min').value);
                configSimulacion.max = parseInt(document.getElementById('trunc-max').value);
                break;
            case 'laplace': // Nuevo caso para Laplace
                configSimulacion.mu = parseFloat(document.getElementById('laplace-mu').value);
                configSimulacion.b = parseFloat(document.getElementById('laplace-b').value);
                break;
        }

        // Bloquea la configuración y activa el panel de juego
        panelConfiguracion.classList.add('disabled');
        document.querySelectorAll('#panel-configuracion input, #panel-configuracion select, #panel-configuracion button').forEach(el => el.disabled = true);
        
        panelJuego.classList.remove('disabled');
        pedidoUsuarioInput.disabled = false;
        btnPedir.disabled = false;
        
        juegoIniciado = true;
        textoResultadosEl.innerHTML = "<p>¡Juego iniciado! Ingresa tu primer pedido.</p>";
    }

    // --- LÓGICA PRINCIPAL DEL JUEGO ---
    btnPedir.addEventListener('click', jugarSemana);

    function jugarSemana() {
        if (!juegoIniciado) return;
        const pedidoUsuario = parseInt(pedidoUsuarioInput.value);

        if (isNaN(pedidoUsuario) || pedidoUsuario < 0) {
            alert("Por favor, ingresa un número válido para tu pedido.");
            return;
        }

        const demandaSemana = generarDemanda();
        const unidadesVendidas = Math.min(pedidoUsuario, demandaSemana);
        const unidadesSobrantes = Math.max(0, pedidoUsuario - demandaSemana);
        const demandaInsatisfecha = Math.max(0, demandaSemana - pedidoUsuario);

        const costoTotalCompra = pedidoUsuario * costoCompra;
        const ingresoPorVentas = unidadesVendidas * precioVenta;
        const ingresoPorSobrantes = unidadesSobrantes * valorSobrante;
        const costoTotalVentaPerdida = demandaInsatisfecha * costoVentaPerdida;

        const gananciaSemana = (ingresoPorVentas + ingresoPorSobrantes) - costoTotalCompra - costoTotalVentaPerdida;
        gananciaAcumulada += gananciaSemana;

        const registroSemana = {
            semana: semanaActual, pedido: pedidoUsuario, demanda: demandaSemana,
            ingresos: ingresoPorVentas + ingresoPorSobrantes, costoCompra: costoTotalCompra,
            costoVentaPerdida: costoTotalVentaPerdida, ganancia: gananciaSemana
        };

        actualizarResultados(registroSemana, unidadesVendidas, unidadesSobrantes, demandaInsatisfecha);
        actualizarHistorial(registroSemana);
        actualizarPanelPrincipal();

        semanaActual++;
        numeroSemanaEl.textContent = semanaActual;
        pedidoUsuarioInput.value = '';
    }
    
    // --- GENERACIÓN DE DEMANDA ---
    function generarDemanda() {
        let demanda;
        switch (configSimulacion.distribucion) {
            case 'uniforme':
                demanda = prng.random() * (configSimulacion.max - configSimulacion.min) + configSimulacion.min;
                break;
            case 'normal':
                demanda = generarNormal(configSimulacion.mu, configSimulacion.sigma);
                break;
            case 'normal-truncada':
                demanda = generarNormalTruncada(configSimulacion.mu, configSimulacion.sigma, configSimulacion.min, configSimulacion.max);
                break;
            case 'laplace': // Nuevo caso para Laplace
                demanda = generarLaplace(configSimulacion.mu, configSimulacion.b);
                break;
        }
        return Math.round(Math.max(0, demanda));
    }

    // --- FUNCIONES DE UTILIDAD Y FORMATO ---
    function formatearMoneda(valor) {
        return valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
    }

    function actualizarResultados(r, vendidas, sobrantes, insatisfecha) {
        textoResultadosEl.innerHTML = `
            <p>Demanda de la semana: <strong>${r.demanda}</strong> unidades.</p>
            <p>Unidades vendidas: <strong>${vendidas}</strong>.</p>
            <p>Unidades sobrantes: <strong>${sobrantes}</strong>.</p>
            <hr>
            <p>Ingreso por Ventas: <strong>${formatearMoneda(vendidas * precioVenta)}</strong></p>
            <p>Ingreso por Sobrantes: <strong>${formatearMoneda(sobrantes * valorSobrante)}</strong></p>
            <p style="color: red;">Costo de Compra: <strong>-${formatearMoneda(r.costoCompra)}</strong></p>
            <p style="color: red;">Costo por Ventas Perdidas: <strong>-${formatearMoneda(r.costoVentaPerdida)}</strong></p>
            <p><strong>Ganancia de la semana: ${formatearMoneda(r.ganancia)}</strong></p>
            ${insatisfecha > 0 ? `<p style="color: darkorange;">Dejaste de vender <strong>${insatisfecha}</strong> unidades por falta de stock.</p>` : ''}
        `;
    }

    function actualizarHistorial(r) {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${r.semana}</td> <td>${r.pedido}</td> <td>${r.demanda}</td>
            <td>${formatearMoneda(r.ingresos)}</td> <td>${formatearMoneda(r.costoCompra)}</td>
            <td style="color:red;">${formatearMoneda(r.costoVentaPerdida)}</td>
            <td>${formatearMoneda(r.ganancia)}</td>
        `;
        tablaHistorialBody.appendChild(fila);
    }

    function actualizarPanelPrincipal() {
        gananciaAcumuladaEl.textContent = formatearMoneda(gananciaAcumulada);
        gananciaAcumuladaEl.className = gananciaAcumulada >= 0 ? 'positivo' : 'negativo';
    }
    
    // --- GENERADOR DE NÚMEROS ALEATORIOS Y DISTRIBUCIONES ---

    function createPRNG(seed) {
        let currentSeed = seed % 2147483647;
        if (currentSeed <= 0) currentSeed += 2147483646;
        return {
            random: function() {
                currentSeed = currentSeed * 16807 % 2147483647;
                return (currentSeed - 1) / 2147483646;
            }
        };
    }

    let spareNormal = null;
    function generarNormal(mu, sigma) {
        let val, u, v, s;
        if (spareNormal !== null) {
            val = spareNormal;
            spareNormal = null;
        } else {
            do {
                u = prng.random() * 2 - 1;
                v = prng.random() * 2 - 1;
                s = u * u + v * v;
            } while (s >= 1 || s === 0);
            const mul = Math.sqrt(-2.0 * Math.log(s) / s);
            val = u * mul;
            spareNormal = v * mul;
        }
        return val * sigma + mu;
    }

    function generarNormalTruncada(mu, sigma, min, max) {
        let val;
        let attempts = 0;
        do {
            val = generarNormal(mu, sigma);
            attempts++;
            if (attempts > 100) {
                console.warn("Demasiados intentos en la normal truncada, retornando punto medio.");
                return (min + max) / 2;
            }
        } while (val < min || val > max);
        return val;
    }

    // Nueva función para generar variables aleatorias de Laplace(mu, b)
    function generarLaplace(mu, b) {
        // Usa el método de la transformada inversa
        const u = prng.random() - 0.5; // u está en [-0.5, 0.5)
        return mu - b * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
    }
});