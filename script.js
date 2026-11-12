const contenedor = document.getElementById("ruleta");
const imagen = document.getElementById("imagen-ruleta");

let rotacion = 0;
let velocidad = 0;
let punteroActivo = null;
let anguloAnterior = null;
let tiempoAnterior = 0;
let ultimoMovimiento = 0;
let animacion = null;
let centroX = 0;
let centroY = 0;

function dibujar() {
    imagen.style.transform = `rotate(${rotacion}deg)`;
}

function detenerInercia() {
    cancelAnimationFrame(animacion);
    animacion = null;
    velocidad = 0;
}

function obtenerAngulo(evento) {
    const x = evento.clientX - centroX;
    const y = evento.clientY - centroY;

    // Cerca del centro el ángulo es inestable.
    if (Math.hypot(x, y) < 20) {
        return null;
    }

    return Math.atan2(y, x) * 180 / Math.PI;
}

contenedor.addEventListener("pointerdown", (evento) => {
    if (punteroActivo !== null) return;

    if (evento.pointerType === "mouse" && evento.button !== 0) {
        return;
    }

    // Evita acciones del navegador al tocar la ruleta.
    evento.preventDefault();

    detenerInercia();

    const limites = contenedor.getBoundingClientRect();

    centroX = limites.left + limites.width / 2;
    centroY = limites.top + limites.height / 2;

    punteroActivo = evento.pointerId;
    anguloAnterior = obtenerAngulo(evento);
    tiempoAnterior = performance.now();
    ultimoMovimiento = tiempoAnterior;

    contenedor.classList.add("arrastrando");
    contenedor.setPointerCapture(evento.pointerId);
});

contenedor.addEventListener("pointermove", (evento) => {
    if (evento.pointerId !== punteroActivo) return;

    evento.preventDefault();

    const ahora = performance.now();
    const anguloActual = obtenerAngulo(evento);

    if (anguloActual === null || anguloAnterior === null) {
        anguloAnterior = anguloActual;
        tiempoAnterior = ahora;
        velocidad = 0;
        return;
    }

    let diferencia = anguloActual - anguloAnterior;

    // Evita saltos al cruzar de 180° a -180°.
    diferencia = ((diferencia + 540) % 360) - 180;

    const tiempo = Math.max(ahora - tiempoAnterior, 1);

    rotacion += diferencia;
    velocidad = Math.max(-2, Math.min(2, diferencia / tiempo));

    anguloAnterior = anguloActual;
    tiempoAnterior = ahora;
    ultimoMovimiento = ahora;

    dibujar();
});

function iniciarInercia() {
    let ultimoFrame = performance.now();

    function continuarGiro(ahora) {
        const tiempo = Math.min(ahora - ultimoFrame, 32);
        ultimoFrame = ahora;

        rotacion += velocidad * tiempo;

        // Reduce la velocidad progresivamente.
        velocidad *= Math.pow(0.95, tiempo / 16.67);

        dibujar();

        if (Math.abs(velocidad) > 0.005) {
            animacion = requestAnimationFrame(continuarGiro);
        } else {
            velocidad = 0;
            animacion = null;
        }
    }

    animacion = requestAnimationFrame(continuarGiro);
}

function terminarArrastre(evento, usarInercia) {
    if (evento.pointerId !== punteroActivo) return;

    // Se limpia antes de liberar la captura para evitar duplicados.
    punteroActivo = null;
    contenedor.classList.remove("arrastrando");

    if (contenedor.hasPointerCapture(evento.pointerId)) {
        contenedor.releasePointerCapture(evento.pointerId);
    }

    const reducirMovimiento = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    if (
        !usarInercia ||
        reducirMovimiento ||
        performance.now() - ultimoMovimiento > 100
    ) {
        velocidad = 0;
    }

    if (Math.abs(velocidad) > 0.005) {
        iniciarInercia();
    }
}

contenedor.addEventListener("pointerup", (evento) => {
    terminarArrastre(evento, true);
});

contenedor.addEventListener("pointercancel", (evento) => {
    terminarArrastre(evento, false);
});

contenedor.addEventListener("lostpointercapture", (evento) => {
    terminarArrastre(evento, false);
});

// Impide arrastrar el archivo de imagen con el mouse.
imagen.addEventListener("dragstart", (evento) => {
    evento.preventDefault();
});

// Permite girar la ruleta con las flechas del teclado.
imagen.addEventListener("keydown", (evento) => {
    if (evento.key !== "ArrowLeft" && evento.key !== "ArrowRight") {
        return;
    }

    if (punteroActivo !== null) return;

    evento.preventDefault();
    detenerInercia();

    rotacion += evento.key === "ArrowRight" ? 15 : -15;

    dibujar();
});