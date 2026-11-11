import { useCallback, useEffect, useRef, useState } from "react";
import { FaPen } from "react-icons/fa";
import { InicioPrincipal } from "./InicioPrincipal";
import { QuienesSomosSection } from "./QuienesSomosSection";
import AcercaDeEdit from "./AcercaDeEdit";
import { useAuth } from "./context/AuthContext";
import { API_URL } from "../utils/api";

export const PantallaInicio = () => {
  const [inicioData, setInicioData] = useState(null);
  const [acercaData, setAcercaData] = useState(null);
  const [cuentasRegresivas, setCuentasRegresivas] = useState([]);
  const [cargando, setCargando] = useState(true);
  // Administración edita aquí mismo el contenido de la portada y de
  // "Quiénes somos" (galería, misión, equipo, donaciones, contactos).
  const [editando, setEditando] = useState(false);
  const activoRef = useRef(true);
  const { user } = useAuth();
  const esAdmin = user && (user.tipoUsuario === 0 || user.tipoUsuario === 1);

  const cargarTodo = useCallback(async () => {
    try {
      setCargando(true);
      // Las cuentas regresivas son opcionales: si fallan, la página sigue.
      const cuentasPromesa = fetch(`${API_URL}/cuentas-regresivas/activas`)
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .catch(() => ({ data: [] }));

      const [contenidoRes, acercaRes, cuentasData] = await Promise.all([
        fetch(`${API_URL}/configuracion/inicio-contenido`),
        fetch(`${API_URL}/acerca-de`),
        cuentasPromesa,
      ]);

      const contenidoData = await contenidoRes.json().catch(() => ({}));
      const acercaData = await acercaRes.json().catch(() => ({}));

      if (!activoRef.current) return;

      setInicioData(contenidoData?.data || {});
      setAcercaData(acercaData || null);
      setCuentasRegresivas(Array.isArray(cuentasData?.data) ? cuentasData.data : []);
    } catch (error) {
      console.error("Error al cargar la pantalla de inicio:", error);
    } finally {
      if (activoRef.current) setCargando(false);
    }
  }, []);

  useEffect(() => {
    activoRef.current = true;
    cargarTodo();
    return () => {
      activoRef.current = false;
    };
  }, [cargarTodo]);

  // Si la sesión deja de ser de administración, salir del editor.
  useEffect(() => {
    if (!esAdmin) setEditando(false);
  }, [esAdmin]);

  const abrirEditor = () => {
    setEditando(true);
    window.scrollTo({ top: 0 });
  };

  const cerrarEditor = () => {
    setEditando(false);
    window.scrollTo({ top: 0 });
  };

  if (editando && esAdmin) {
    // Al guardar, el editor llama onUpdate (recargar) y luego onCancel (cerrar).
    return (
      <AcercaDeEdit data={acercaData} onUpdate={cargarTodo} onCancel={cerrarEditor} />
    );
  }

  return (
    <>
      <InicioPrincipal
        inicioData={inicioData}
        acercaData={acercaData}
        cargando={cargando}
        cuentasRegresivas={cuentasRegresivas}
      />
      <QuienesSomosSection data={acercaData} />

      {esAdmin && !cargando && (
        <button type="button" className="inicio-editar" onClick={abrirEditor}>
          <FaPen aria-hidden="true" />
          Editar página de inicio
        </button>
      )}
    </>
  );
};

export default PantallaInicio;
