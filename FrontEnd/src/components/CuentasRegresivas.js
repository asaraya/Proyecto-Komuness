import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  calcularRestante,
  formatearFechaCR,
  formatearFechaCortaCR,
  textoAccesible,
  textoCorto,
  msHastaProximoMinuto,
} from "../utils/cuentaRegresiva";
import "../CSS/cuentasRegresivas.css";

// UI65: banda "Próximamente" de la página principal. El más próximo va
// destacado y los siguientes (hasta 3) en una lista discreta.

const MAX_LISTA = 3;

/** Hora actual, actualizada al cambiar cada minuto y al volver a la pestaña. */
function useAhoraPorMinuto() {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    let intervalo;
    const actualizar = () => setAhora(Date.now());
    const espera = setTimeout(() => {
      actualizar();
      intervalo = setInterval(actualizar, 60 * 1000);
    }, msHastaProximoMinuto());
    const alVolver = () => {
      if (document.visibilityState === "visible") actualizar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearTimeout(espera);
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, []);

  return ahora;
}

function TituloEnlazado({ cuenta, className }) {
  if (cuenta.publicacion?._id) {
    return (
      <Link to={`/eventos/${cuenta.publicacion._id}`} className={className}>
        {cuenta.titulo}
      </Link>
    );
  }
  if (cuenta.enlace) {
    return (
      <a href={cuenta.enlace} target="_blank" rel="noreferrer" className={className}>
        {cuenta.titulo}
      </a>
    );
  }
  return <span className={className}>{cuenta.titulo}</span>;
}

const pad = (n) => String(n).padStart(2, "0");

export function CuentasRegresivas({ cuentas }) {
  const ahora = useAhoraPorMinuto();

  const visibles = (Array.isArray(cuentas) ? cuentas : [])
    .map((c) => ({ ...c, restante: calcularRestante(c.fechaObjetivo, ahora) }))
    .filter((c) => !c.restante.terminado);

  if (visibles.length === 0) return null;

  const [destacada, ...resto] = visibles;
  const lista = resto.slice(0, MAX_LISTA);
  const r = destacada.restante;

  return (
    <section className="cr-banda" aria-labelledby="cr-etiqueta">
      <div className="cr-inner">
        <p className="cr-etiqueta" id="cr-etiqueta">
          Próximamente
        </p>

        <article className="cr-destacado">
          <div className="cr-destacado-info">
            <h2 className="cr-destacado-titulo">
              <TituloEnlazado cuenta={destacada} className="cr-titulo-link" />
            </h2>
            <p className="cr-destacado-fecha">{formatearFechaCR(destacada.fechaObjetivo)}</p>
          </div>

          {r.esHoy ? (
            <p className="cr-hoy">¡Hoy es el día!</p>
          ) : (
            <>
              <div className="cr-contador" aria-hidden="true">
                <div className="cr-unidad">
                  <span className="cr-numero">{r.dias}</span>
                  <span className="cr-rotulo">{r.dias === 1 ? "día" : "días"}</span>
                </div>
                <div className="cr-unidad">
                  <span className="cr-numero">{pad(r.horas)}</span>
                  <span className="cr-rotulo">{r.horas === 1 ? "hora" : "horas"}</span>
                </div>
                <div className="cr-unidad">
                  <span className="cr-numero">{pad(r.minutos)}</span>
                  <span className="cr-rotulo">min</span>
                </div>
              </div>
              <p className="cr-sr-only">{textoAccesible(r)}</p>
            </>
          )}
        </article>

        {lista.length > 0 && (
          <ul className="cr-lista">
            {lista.map((c) => (
              <li key={c._id} className="cr-fila">
                <TituloEnlazado cuenta={c} className="cr-fila-titulo" />
                <span className="cr-fila-fecha">{formatearFechaCortaCR(c.fechaObjetivo)}</span>
                <span className="cr-fila-falta">{textoCorto(c.restante)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default CuentasRegresivas;
