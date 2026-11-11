import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL, BASE_URL } from "../utils/api";
import { toast } from "react-hot-toast";
import "../CSS/editarPerfil.css";
import ConfirmDialog from "./ConfirmDialog";
import SubidaArchivo from "./SubidaArchivo";
import UserProfileAvatar from "./UserProfileAvatar";
import {
  FaUser,
  FaBriefcase,
  FaGraduationCap,
  FaLink,
  FaFile,
  FaChevronDown,
  FaChevronUp,
  FaPlus,
  FaTrash,
  FaTags,
} from "react-icons/fa";
import {
  readSessionDraft,
  removeSessionDraft,
  writeSessionDraft,
} from "../utils/sessionDraftStorage";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { SiHyperskill } from "react-icons/si";

const PROFILE_DRAFT_PREFIX = "komuness:editar-perfil";

const getStoredUserId = () => {
  if (typeof window === "undefined") return "";

  try {
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) return storedUserId;

    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?._id || "";
  } catch {
    return "";
  }
};

const getProfileDraftStorageKey = (userId) =>
  `${PROFILE_DRAFT_PREFIX}:${userId || "anon"}`;

const mergePerfilDraft = (basePerfil, draft) => {
  if (!draft || !draft.perfil) return basePerfil;

  const draftPerfil = draft.perfil;

  return {
    ...basePerfil,
    ...draftPerfil,
    formacionAcademica: Array.isArray(draftPerfil.formacionAcademica)
      ? draftPerfil.formacionAcademica
      : basePerfil.formacionAcademica,
    experienciaLaboral: Array.isArray(draftPerfil.experienciaLaboral)
      ? draftPerfil.experienciaLaboral
      : basePerfil.experienciaLaboral,
    habilidades: Array.isArray(draftPerfil.habilidades)
      ? draftPerfil.habilidades
      : basePerfil.habilidades,
    proyectos: Array.isArray(draftPerfil.proyectos)
      ? draftPerfil.proyectos
      : basePerfil.proyectos,
    redesSociales: {
      ...basePerfil.redesSociales,
      ...(draftPerfil.redesSociales || {}),
    },
  };
};

/* ---------- Validaciones ---------- */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const URL_REGEX = /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i;
const TEL_REGEX = /^\+?[\d\s-]{8,15}$/;
const ANIO_ACTUAL = new Date().getFullYear();

const validarAnios = (item, prefix, errores) => {
  const inicio = Number(item.añoInicio);
  const fin = item.añoFin === "" || item.añoFin == null ? null : Number(item.añoFin);

  if (!inicio || inicio < 1950 || inicio > ANIO_ACTUAL) {
    errores[`${prefix}.añoInicio`] = `Ingresa un año entre 1950 y ${ANIO_ACTUAL}`;
  }
  if (fin !== null && (fin < inicio || fin > ANIO_ACTUAL + 10)) {
    errores[`${prefix}.añoFin`] = "El año fin no puede ser menor al de inicio";
  }
};

const validarPerfil = (p) => {
  const e = {};

  if (!p.nombre?.trim()) e.nombre = "El nombre es requerido";
  if (!p.apellidos?.trim()) e.apellidos = "Los apellidos son requeridos";
  if (p.correoSecundario && !EMAIL_REGEX.test(p.correoSecundario.trim()))
    e.correoSecundario = "Ingresa un correo válido";
  if (p.telefono && !TEL_REGEX.test(p.telefono.trim()))
    e.telefono = "Ingresa un teléfono válido (8 a 15 dígitos)";

  if (p.urlPortafolio && !URL_REGEX.test(p.urlPortafolio.trim()))
    e.urlPortafolio = "Ingresa una URL válida que empiece con https://";

  Object.entries(p.redesSociales || {}).forEach(([red, url]) => {
    if (url && !URL_REGEX.test(url.trim()))
      e[`redes.${red}`] = "Ingresa una URL válida que empiece con https://";
  });

  p.formacionAcademica.forEach((f, i) => {
    if (!f.institucion?.trim()) e[`formacion.${i}.institucion`] = "Requerida";
    if (!f.titulo?.trim()) e[`formacion.${i}.titulo`] = "Requerido";
    validarAnios(f, `formacion.${i}`, e);
  });

  p.experienciaLaboral.forEach((x, i) => {
    if (!x.empresa?.trim()) e[`experiencia.${i}.empresa`] = "Requerida";
    if (!x.cargo?.trim()) e[`experiencia.${i}.cargo`] = "Requerido";
    validarAnios(x, `experiencia.${i}`, e);
  });

  p.proyectos.forEach((pr, i) => {
    if (!pr.nombre?.trim()) e[`proyecto.${i}.nombre`] = "Requerido";
    if (pr.url && !URL_REGEX.test(pr.url.trim()))
      e[`proyecto.${i}.url`] = "Ingresa una URL válida que empiece con https://";
  });

  return e;
};

const seccionDeError = (key) => {
  if (["nombre", "apellidos", "correoSecundario", "telefono"].includes(key))
    return "personal";
  if (key.startsWith("formacion")) return "formacion";
  if (key.startsWith("experiencia")) return "experiencia";
  return "enlaces"; // urlPortafolio, redes.*, proyecto.*
};

const EditarPerfil = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [openPopupOrganizacion, setOpenPopupOrganizacion] = useState(false);
  const [draftCargado, setDraftCargado] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { dialog, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const [draftStorageKey] = useState(() =>
    getProfileDraftStorageKey(getStoredUserId()),
  );
  const [etiquetas, setEtiquetas] = useState([]);
  const [errores, setErrores] = useState({});

  const claseGrupo = (key, extra = "") =>
    `form-group${extra ? ` ${extra}` : ""}${errores[key] ? " has-error" : ""}`;

  const msgError = (key) =>
    errores[key] ? <p className="field-error">{errores[key]}</p> : null;

  // Secciones expandibles
  const [seccionesAbiertas, setSeccionesAbiertas] = useState({
    personal: true,
    profesional: true,
    formacion: false,
    experiencia: false,
    habilidades: false,
    etiquetas: false,
    enlaces: false,
    archivos: false,
  });

  // Estado del formulario
  const [perfil, setPerfil] = useState({
    nombre: "",
    apellidos: "",
    correoSecundario: "",
    telefono: "",
    canton: "",
    provincia: "",
    ocupacionPrincipal: "",
    titulo: "",
    especialidad: "",
    formacionAcademica: [],
    experienciaLaboral: [],
    habilidades: [],
    etiquetas: [],
    proyectos: [],
    urlPortafolio: "",
    redesSociales: {
      facebook: "",
      instagram: "",
      linkedin: "",
      twitter: "",
    },
    fotoPerfil: "",
    cvUrl: "",
    perfilPublico: true,
    enBancoProfesionales: false,
  });

  useEffect(() => {
    cargarPerfil();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loading || !draftCargado || !hasChanges) return;

    writeSessionDraft(draftStorageKey, { perfil });
  }, [loading, draftCargado, draftStorageKey, perfil, hasChanges]);

  const cargarPerfil = async () => {
    const savedDraft = readSessionDraft(draftStorageKey);
    const shouldLoadDraft = savedDraft?.perfil
      ? await confirm({
          title: "Borrador encontrado",
          message: "Hay un borrador guardado del perfil.",
          hint: "Puedes cargarlo para continuar o descartarlo.",
          confirmText: "Cargar borrador",
          cancelText: "Descartar",
        })
      : false;

    if (savedDraft?.perfil && !shouldLoadDraft) {
      removeSessionDraft(draftStorageKey);
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/perfil/usuario/me`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Error al cargar el perfil");
      }

      const data = await response.json();
      const { usuarioId, ...perfilData } = data.data;

      setPerfil((prev) =>
        mergePerfilDraft(
          {
            ...prev,
            ...perfilData,
            formacionAcademica: perfilData.formacionAcademica || [],
            experienciaLaboral: perfilData.experienciaLaboral || [],
            habilidades: perfilData.habilidades || [],
            proyectos: perfilData.proyectos || [],
            redesSociales: {
              ...prev.redesSociales,
              ...(perfilData.redesSociales || {}),
            },
            etiquetas: usuarioId?.encuestaInicio?.etiquetas || [],
          },
          shouldLoadDraft ? savedDraft : null,
        ),
      );
      setHasChanges(!!shouldLoadDraft);

      fetchEtiquetas();
    } catch (error) {
      if (shouldLoadDraft && savedDraft?.perfil) {
        setPerfil((prev) => mergePerfilDraft(prev, savedDraft));
        setHasChanges(true);
      }
      toast.error("Error al cargar el perfil");
      console.error(error);
    } finally {
      setLoading(false);
      setDraftCargado(true);
    }
  };

  const markHasChanges = () => setHasChanges(true);

  const fetchEtiquetas = async () => {
    try {
      const response = await fetch(`${API_URL}/elements/etiqueta?limit=100`);
      const data = await response.json();
      setEtiquetas(data.data || []);
    } catch (error) {
      console.error("Error al cargar etiquetas:", error);
    }
  };

  const toggleSeccion = (seccion) => {
    setSeccionesAbiertas((prev) => ({
      ...prev,
      [seccion]: !prev[seccion],
    }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    markHasChanges();
    setErrores((prev) => ({ ...prev, [name]: undefined }));
    setPerfil((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleRedesSocialesChange = (e) => {
    const { name, value } = e.target;
    markHasChanges();
    setErrores((prev) => ({ ...prev, [`redes.${name}`]: undefined }));
    setPerfil((prev) => ({
      ...prev,
      redesSociales: {
        ...prev.redesSociales,
        [name]: value,
      },
    }));
  };

  // Formación académica
  const agregarFormacion = () => {
    markHasChanges();
    setPerfil((prev) => ({
      ...prev,
      formacionAcademica: [
        ...prev.formacionAcademica,
        {
          institucion: "",
          titulo: "",
          añoInicio: new Date().getFullYear(),
          añoFin: "",
        },
      ],
    }));
  };

  const eliminarFormacion = (index) => {
    markHasChanges();
    setErrores({});
    setPerfil((prev) => ({
      ...prev,
      formacionAcademica: prev.formacionAcademica.filter((_, i) => i !== index),
    }));
  };

  const handleFormacionChange = (index, field, value) => {
    markHasChanges();
    setErrores((prev) => ({ ...prev, [`formacion.${index}.${field}`]: undefined }));
    setPerfil((prev) => ({
      ...prev,
      formacionAcademica: prev.formacionAcademica.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  // Experiencia laboral
  const agregarExperiencia = () => {
    markHasChanges();
    setPerfil((prev) => ({
      ...prev,
      experienciaLaboral: [
        ...prev.experienciaLaboral,
        {
          empresa: "",
          cargo: "",
          descripcion: "",
          añoInicio: new Date().getFullYear(),
          añoFin: "",
        },
      ],
    }));
  };

  const eliminarExperiencia = (index) => {
    markHasChanges();
    setErrores({});
    setPerfil((prev) => ({
      ...prev,
      experienciaLaboral: prev.experienciaLaboral.filter((_, i) => i !== index),
    }));
  };

  const handleExperienciaChange = (index, field, value) => {
    markHasChanges();
    setErrores((prev) => ({ ...prev, [`experiencia.${index}.${field}`]: undefined }));
    setPerfil((prev) => ({
      ...prev,
      experienciaLaboral: prev.experienciaLaboral.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  // Habilidades
  const [nuevaHabilidad, setNuevaHabilidad] = useState("");

  const agregarHabilidad = () => {
    if (nuevaHabilidad.trim()) {
      markHasChanges();
      setPerfil((prev) => ({
        ...prev,
        habilidades: [...prev.habilidades, nuevaHabilidad.trim()],
      }));
      setNuevaHabilidad("");
    }
  };

  const eliminarHabilidad = (index) => {
    markHasChanges();
    setPerfil((prev) => ({
      ...prev,
      habilidades: prev.habilidades.filter((_, i) => i !== index),
    }));
  };

  // Proyectos
  const agregarProyecto = () => {
    markHasChanges();
    setPerfil((prev) => ({
      ...prev,
      proyectos: [...prev.proyectos, { nombre: "", url: "", descripcion: "" }],
    }));
  };

  const eliminarProyecto = (index) => {
    markHasChanges();
    setErrores({});
    setPerfil((prev) => ({
      ...prev,
      proyectos: prev.proyectos.filter((_, i) => i !== index),
    }));
  };

  const handleProyectoChange = (index, field, value) => {
    markHasChanges();
    setErrores((prev) => ({ ...prev, [`proyecto.${index}.${field}`]: undefined }));
    setPerfil((prev) => ({
      ...prev,
      proyectos: prev.proyectos.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const toggleEtiqueta = (id) => {
    markHasChanges();
    const selected = perfil.etiquetas || [];
    const nextEtiquetas = selected.includes(id)
      ? selected.filter((etiquetaId) => etiquetaId !== id)
      : [...selected, id];

    setPerfil((prev) => ({
      ...prev,
      etiquetas: nextEtiquetas,
    }));
  };

  const parseAnio = (value) => (value ? parseInt(value) : "");

  const handleGuardarCambios = async () => {
    const nuevosErrores = validarPerfil(perfil);
    setErrores(nuevosErrores);

    const claves = Object.keys(nuevosErrores);
    if (claves.length > 0) {
      // Abrir las secciones con errores y llevar al primer campo
      setSeccionesAbiertas((prev) => {
        const next = { ...prev };
        claves.forEach((k) => {
          next[seccionDeError(k)] = true;
        });
        return next;
      });
      toast.error("Revisa los campos marcados antes de guardar");
      setTimeout(() => {
        document
          .querySelector(".has-error")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return;
    }

    const confirmado = await confirm({
      title: "Guardar cambios",
      message: "¿Deseas guardar los cambios en tu perfil?",
      hint: "Tu información pública se actualizará de inmediato.",
      confirmText: "Guardar",
      cancelText: "Revisar",
    });
    if (!confirmado) return;

    try {
      setGuardando(true);

      const response = await fetch(`${API_URL}/perfil`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(perfil),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        // El servidor devuelve los campos faltantes para unirse al banco
        if (Array.isArray(data?.data)) {
          toast.error(
            `Completa tu perfil para aparecer en el banco. Falta: ${data.data.join(", ")}`,
            { duration: 6000 }
          );
          return;
        }
        throw new Error(data?.message || "Error al guardar el perfil");
      }

      toast.success("Perfil actualizado exitosamente");
      removeSessionDraft(draftStorageKey);
      setHasChanges(false);
      setErrores({});
    } catch (error) {
      toast.error("Error al guardar los cambios");
      console.error(error);
    } finally {
      setGuardando(false);
    }
  };

  const handleFotoSubida = async (file) => {
    try {
      const formData = new FormData();
      formData.append("foto", file);

      const response = await fetch(`${API_URL}/perfil/foto`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error del servidor:", errorData);
        throw new Error(errorData.message || "Error al subir la foto");
      }

      const data = await response.json();

      setPerfil((prev) => ({ ...prev, fotoPerfil: data.fotoPerfil }));
      markHasChanges();

      toast.success("Foto de perfil actualizada");
    } catch (error) {
      console.error("Error en subida de foto:", error);
      toast.error(error.message || "Error al subir la foto");
      throw error;
    }
  };

  const handleFotoEliminada = async () => {
    try {
      setPerfil((prev) => ({ ...prev, fotoPerfil: "" }));
      markHasChanges();

      toast.success("Foto de perfil eliminada");
    } catch (error) {
      console.error("Error al eliminar la foto:", error);
      toast.error("Error al eliminar la foto");
      throw error;
    }
  };

  const handleCVSubido = (url) => {
    markHasChanges();
    setPerfil((prev) => ({ ...prev, cvUrl: url }));
  };

  const handleCancelar = () => {
    const resolveCancel = async () => {
      if (hasChanges) {
        const shouldSave = await confirm({
          title: "Guardar borrador",
          message: "Deseas guardar lo escrito para continuar después?",
          hint: "Si descartas, se eliminará el borrador guardado.",
          confirmText: "Guardar",
          cancelText: "Descartar",
        });

        if (shouldSave) {
          writeSessionDraft(draftStorageKey, { perfil });
        } else {
          removeSessionDraft(draftStorageKey);
        }
      } else {
        removeSessionDraft(draftStorageKey);
      }

      navigate("/perfilUsuario");
    };

    resolveCancel();
  };

  if (loading) {
    return (
      <>
        <div className="editar-perfil-loading">
          <div className="spinner"></div>
          <p>Cargando perfil...</p>
        </div>
        <ConfirmDialog
          dialog={dialog}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      </>
    );
  }

  return (
    <div className="editar-perfil-container">
      <div className="editar-perfil-wrapper">
        <div className="editar-perfil-header">
          <h1>Editar Perfil Público</h1>
          <p>Completa tu información para crear un perfil profesional</p>
        </div>

        <div className="editar-perfil-grid">
          {/* Sidebar - Vista previa del perfil */}
          <div className="perfil-sidebar">
            <div className="profile-info-card">
              <h2>Información Personal</h2>
              <div className="profile-photo-section">
                <div
                  className="profile-photo-wrapper"
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: "1rem",
                  }}
                >
                  <UserProfileAvatar
                    currentImage={
                      perfil.fotoPerfil
                        ? `${BASE_URL}${perfil.fotoPerfil}`
                        : null
                    }
                    onImageChange={handleFotoSubida}
                    onImageDelete={handleFotoEliminada}
                    size="xlarge"
                  />
                </div>
                <h3 className="profile-name">
                  {perfil.nombre} {perfil.apellidos}
                </h3>
                <p className="profile-role">
                  {perfil.ocupacionPrincipal || "Sin ocupación"}
                </p>
                <p className="text-sm text-gray-300 mt-2 text-center">
                  Haz hover sobre la foto para cambiarla
                </p>
              </div>

              <div className="profile-info-details">
                <div className="profile-info-item">
                  <label>Email</label>
                  <p>{perfil.correoSecundario || "No especificado"}</p>
                </div>
                <div className="profile-info-item">
                  <label>Teléfono</label>
                  <p>{perfil.telefono || "No especificado"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Formulario principal */}
          <div className="editar-perfil-form">
            {/* Datos Personales */}
            <div className="form-section">
              <div
                className="form-section-header"
                onClick={() => toggleSeccion("personal")}
              >
                <h2>
                  <FaUser /> Datos Personales
                </h2>
                {seccionesAbiertas.personal ? (
                  <FaChevronUp />
                ) : (
                  <FaChevronDown />
                )}
              </div>

              {seccionesAbiertas.personal && (
                <div className="form-section-content">
                  <div className="form-grid">
                    <div className={claseGrupo("nombre")}>
                      <label>Nombre *</label>
                      <input
                        type="text"
                        name="nombre"
                        value={perfil.nombre}
                        onChange={handleInputChange}
                      />
                      {msgError("nombre")}
                    </div>

                    <div className={claseGrupo("apellidos")}>
                      <label>Apellidos *</label>
                      <input
                        type="text"
                        name="apellidos"
                        value={perfil.apellidos}
                        onChange={handleInputChange}
                      />
                      {msgError("apellidos")}
                    </div>

                    <div className={claseGrupo("correoSecundario")}>
                      <label>Correo Secundario</label>
                      <input
                        type="email"
                        name="correoSecundario"
                        value={perfil.correoSecundario}
                        onChange={handleInputChange}
                      />
                      {msgError("correoSecundario")}
                    </div>

                    <div className={claseGrupo("telefono")}>
                      <label>Teléfono</label>
                      <input
                        type="tel"
                        name="telefono"
                        value={perfil.telefono}
                        onChange={handleInputChange}
                      />
                      {msgError("telefono")}
                    </div>

                    <div className="form-group">
                      <label>Cantón</label>
                      <input
                        type="text"
                        name="canton"
                        value={perfil.canton}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Provincia</label>
                      <input
                        type="text"
                        name="provincia"
                        value={perfil.provincia}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Información Profesional */}
            <div className="form-section">
              <div
                className="form-section-header"
                onClick={() => toggleSeccion("profesional")}
              >
                <h2>
                  <FaBriefcase /> Información Profesional
                </h2>
                {seccionesAbiertas.profesional ? (
                  <FaChevronUp />
                ) : (
                  <FaChevronDown />
                )}
              </div>

              {seccionesAbiertas.profesional && (
                <div className="form-section-content">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Ocupación Principal</label>
                      <input
                        type="text"
                        name="ocupacionPrincipal"
                        value={perfil.ocupacionPrincipal}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Título</label>
                      <input
                        type="text"
                        name="titulo"
                        value={perfil.titulo}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group form-group-full">
                      <label>Especialidad</label>
                      <input
                        type="text"
                        name="especialidad"
                        value={perfil.especialidad}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Formación Académica */}
            <div className="form-section">
              <div
                className="form-section-header"
                onClick={() => toggleSeccion("formacion")}
              >
                <h2>
                  <FaGraduationCap /> Formación Académica
                </h2>
                {seccionesAbiertas.formacion ? (
                  <FaChevronUp />
                ) : (
                  <FaChevronDown />
                )}
              </div>

              {seccionesAbiertas.formacion && (
                <div className="form-section-content">
                  {perfil.formacionAcademica.map((formacion, index) => (
                    <div key={index} className="array-item">
                      <div className="form-grid">
                        <div className={claseGrupo(`formacion.${index}.institucion`)}>
                          <label>Institución</label>
                          <input
                            type="text"
                            value={formacion.institucion}
                            onChange={(e) =>
                              handleFormacionChange(
                                index,
                                "institucion",
                                e.target.value,
                              )
                            }
                          />
                          {msgError(`formacion.${index}.institucion`)}
                        </div>

                        <div className={claseGrupo(`formacion.${index}.titulo`)}>
                          <label>Título</label>
                          <input
                            type="text"
                            value={formacion.titulo}
                            onChange={(e) =>
                              handleFormacionChange(
                                index,
                                "titulo",
                                e.target.value,
                              )
                            }
                          />
                          {msgError(`formacion.${index}.titulo`)}
                        </div>

                        <div className={claseGrupo(`formacion.${index}.añoInicio`)}>
                          <label>Año Inicio</label>
                          <input
                            type="number"
                            value={formacion.añoInicio}
                            onChange={(e) =>
                              handleFormacionChange(
                                index,
                                "añoInicio",
                                parseAnio(e.target.value),
                              )
                            }
                          />
                          {msgError(`formacion.${index}.añoInicio`)}
                        </div>

                        <div className={claseGrupo(`formacion.${index}.añoFin`)}>
                          <label>Año Fin</label>
                          <input
                            type="number"
                            value={formacion.añoFin}
                            onChange={(e) =>
                              handleFormacionChange(
                                index,
                                "añoFin",
                                parseAnio(e.target.value),
                              )
                            }
                            placeholder="Dejar vacío si continúa"
                          />
                          {msgError(`formacion.${index}.añoFin`)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => eliminarFormacion(index)}
                        className="btn-eliminar-item"
                      >
                        <FaTrash /> Eliminar
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={agregarFormacion}
                    className="btn-agregar"
                  >
                    <FaPlus /> Agregar Formación
                  </button>
                </div>
              )}
            </div>

            {/* Experiencia Laboral */}
            <div className="form-section">
              <div
                className="form-section-header"
                onClick={() => toggleSeccion("experiencia")}
              >
                <h2>
                  <FaBriefcase /> Experiencia Laboral
                </h2>
                {seccionesAbiertas.experiencia ? (
                  <FaChevronUp />
                ) : (
                  <FaChevronDown />
                )}
              </div>

              {seccionesAbiertas.experiencia && (
                <div className="form-section-content">
                  {perfil.experienciaLaboral.map((experiencia, index) => (
                    <div key={index} className="array-item">
                      <div className="form-grid">
                        <div className={claseGrupo(`experiencia.${index}.empresa`)}>
                          <label className="relative inline-flex items-center gap-2">
                            <span>Organización</span>
                            <button
                              type="button"
                              onClick={() =>
                                setOpenPopupOrganizacion(!openPopupOrganizacion)
                              }
                              className="text-blue-500 underline"
                            >
                              ⓘ
                            </button>
                            {openPopupOrganizacion && (
                              <div className="absolute left-0 top-full z-10 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded border bg-white p-2 text-sm text-gray-800 shadow">
                                Incluye empresas, instituciones o proyectos
                                relacionados, aunque no haya existido
                                contratación directa en la organización.
                              </div>
                            )}
                          </label>
                          <input
                            type="text"
                            value={experiencia.empresa}
                            onChange={(e) =>
                              handleExperienciaChange(
                                index,
                                "empresa",
                                e.target.value,
                              )
                            }
                          />
                          {msgError(`experiencia.${index}.empresa`)}
                        </div>

                        <div className={claseGrupo(`experiencia.${index}.cargo`)}>
                          <label>Rol Desempeñado</label>
                          <input
                            type="text"
                            value={experiencia.cargo}
                            onChange={(e) =>
                              handleExperienciaChange(
                                index,
                                "cargo",
                                e.target.value,
                              )
                            }
                          />
                          {msgError(`experiencia.${index}.cargo`)}
                        </div>

                        <div className={claseGrupo(`experiencia.${index}.añoInicio`)}>
                          <label>Año Inicio</label>
                          <input
                            type="number"
                            value={experiencia.añoInicio}
                            onChange={(e) =>
                              handleExperienciaChange(
                                index,
                                "añoInicio",
                                parseAnio(e.target.value),
                              )
                            }
                          />
                          {msgError(`experiencia.${index}.añoInicio`)}
                        </div>

                        <div className={claseGrupo(`experiencia.${index}.añoFin`)}>
                          <label>Año Fin</label>
                          <input
                            type="number"
                            value={experiencia.añoFin}
                            onChange={(e) =>
                              handleExperienciaChange(
                                index,
                                "añoFin",
                                parseAnio(e.target.value),
                              )
                            }
                            placeholder="Dejar vacío si continúa"
                          />
                          {msgError(`experiencia.${index}.añoFin`)}
                        </div>

                        <div className="form-group form-group-full">
                          <label>Descripción</label>
                          <textarea
                            value={experiencia.descripcion}
                            onChange={(e) =>
                              handleExperienciaChange(
                                index,
                                "descripcion",
                                e.target.value,
                              )
                            }
                            rows="3"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => eliminarExperiencia(index)}
                        className="btn-eliminar-item"
                      >
                        <FaTrash /> Eliminar
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={agregarExperiencia}
                    className="btn-agregar"
                  >
                    <FaPlus /> Agregar Experiencia
                  </button>
                </div>
              )}
            </div>

            {/* Habilidades */}
            <div className="form-section">
              <div
                className="form-section-header"
                onClick={() => toggleSeccion("habilidades")}
              >
                <h2>
                  <SiHyperskill /> Habilidades
                </h2>
                {seccionesAbiertas.habilidades ? (
                  <FaChevronUp />
                ) : (
                  <FaChevronDown />
                )}
              </div>

              {seccionesAbiertas.habilidades && (
                <div className="form-section-content">
                  <div className="habilidades-input-group">
                    <input
                      type="text"
                      value={nuevaHabilidad}
                      onChange={(e) => setNuevaHabilidad(e.target.value)}
                      placeholder="Escribe una habilidad"
                      onKeyPress={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), agregarHabilidad())
                      }
                    />
                    <button
                      type="button"
                      onClick={agregarHabilidad}
                      className="btn-agregar-habilidad"
                    >
                      <FaPlus /> Agregar
                    </button>
                  </div>

                  <div className="habilidades-lista">
                    {perfil.habilidades.map((habilidad, index) => (
                      <div key={index} className="habilidad-tag">
                        {habilidad}
                        <button
                          type="button"
                          onClick={() => eliminarHabilidad(index)}
                          className="btn-eliminar-habilidad"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Etiquetas */}
            <div className="form-section">
              <div
                className="form-section-header"
                onClick={() => toggleSeccion("etiquetas")}
              >
                <h2>
                  <FaTags /> Etiquetas
                </h2>
                {seccionesAbiertas.etiquetas ? (
                  <FaChevronUp />
                ) : (
                  <FaChevronDown />
                )}
              </div>

              {seccionesAbiertas.etiquetas && (
                <div className="form-section-content">
                  <div className="flex flex-wrap gap-2">
                    {etiquetas.map((etiqueta) => {
                      const active = perfil.etiquetas?.includes(etiqueta._id);
                      return (
                        <button
                          key={etiqueta._id}
                          type="button"
                          onClick={() => toggleEtiqueta(etiqueta._id)}
                          className={`rounded-full px-3 py-3 text-xs sm:text-sm font-semibold transition focus:outline-none ${
                            active
                              ? "bg-[#ffbf30] text-[#12141a]"
                              : "bg-[#3492eb] text-[#f0f0f0] hover:bg-[#3492eb]"
                          }`}
                        >
                          {etiqueta.nombre}
                        </button>
                      );
                    })}
                    {etiquetas.length === 0 && (
                      <span className="text-xs text-gray-300">
                        No hay etiquetas configuradas todavía.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Enlaces */}
            <div className="form-section">
              <div
                className="form-section-header"
                onClick={() => toggleSeccion("enlaces")}
              >
                <h2>
                  <FaLink /> Enlaces y Redes Sociales
                </h2>
                {seccionesAbiertas.enlaces ? (
                  <FaChevronUp />
                ) : (
                  <FaChevronDown />
                )}
              </div>

              {seccionesAbiertas.enlaces && (
                <div className="form-section-content">
                  <div className={claseGrupo("urlPortafolio", "form-group-full")}>
                    <label>URL del Portafolio</label>
                    <input
                      type="url"
                      name="urlPortafolio"
                      value={perfil.urlPortafolio}
                      onChange={handleInputChange}
                      placeholder="https://..."
                    />
                    {msgError("urlPortafolio")}
                  </div>

                  <h3 className="subsection-title">Redes Sociales</h3>
                  <div className="form-grid">
                    <div className={claseGrupo("redes.linkedin")}>
                      <label>LinkedIn</label>
                      <input
                        type="url"
                        name="linkedin"
                        value={perfil.redesSociales.linkedin}
                        onChange={handleRedesSocialesChange}
                        placeholder="https://linkedin.com/in/..."
                      />
                      {msgError("redes.linkedin")}
                    </div>

                    <div className={claseGrupo("redes.facebook")}>
                      <label>Facebook</label>
                      <input
                        type="url"
                        name="facebook"
                        value={perfil.redesSociales.facebook}
                        onChange={handleRedesSocialesChange}
                        placeholder="https://facebook.com/..."
                      />
                      {msgError("redes.facebook")}
                    </div>

                    <div className={claseGrupo("redes.instagram")}>
                      <label>Instagram</label>
                      <input
                        type="url"
                        name="instagram"
                        value={perfil.redesSociales.instagram}
                        onChange={handleRedesSocialesChange}
                        placeholder="https://instagram.com/..."
                      />
                      {msgError("redes.instagram")}
                    </div>

                    <div className={claseGrupo("redes.twitter")}>
                      <label>Twitter</label>
                      <input
                        type="url"
                        name="twitter"
                        value={perfil.redesSociales.twitter}
                        onChange={handleRedesSocialesChange}
                        placeholder="https://twitter.com/..."
                      />
                      {msgError("redes.twitter")}
                    </div>
                  </div>

                  <h3 className="subsection-title">Proyectos</h3>
                  {perfil.proyectos.map((proyecto, index) => (
                    <div key={index} className="array-item">
                      <div className="form-grid">
                        <div className={claseGrupo(`proyecto.${index}.nombre`)}>
                          <label>Nombre del Proyecto</label>
                          <input
                            type="text"
                            value={proyecto.nombre}
                            onChange={(e) =>
                              handleProyectoChange(
                                index,
                                "nombre",
                                e.target.value,
                              )
                            }
                          />
                          {msgError(`proyecto.${index}.nombre`)}
                        </div>

                        <div className={claseGrupo(`proyecto.${index}.url`)}>
                          <label>URL</label>
                          <input
                            type="url"
                            value={proyecto.url}
                            onChange={(e) =>
                              handleProyectoChange(index, "url", e.target.value)
                            }
                            placeholder="https://..."
                          />
                          {msgError(`proyecto.${index}.url`)}
                        </div>

                        <div className="form-group form-group-full">
                          <label>Descripción</label>
                          <textarea
                            value={proyecto.descripcion}
                            onChange={(e) =>
                              handleProyectoChange(
                                index,
                                "descripcion",
                                e.target.value,
                              )
                            }
                            rows="2"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => eliminarProyecto(index)}
                        className="btn-eliminar-item"
                      >
                        <FaTrash /> Eliminar
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={agregarProyecto}
                    className="btn-agregar"
                  >
                    <FaPlus /> Agregar Proyecto
                  </button>
                </div>
              )}
            </div>

            {/* Archivos */}
            <div className="form-section">
              <div
                className="form-section-header"
                onClick={() => toggleSeccion("archivos")}
              >
                <h2>
                  <FaFile /> Currículum Vitae
                </h2>
                {seccionesAbiertas.archivos ? (
                  <FaChevronUp />
                ) : (
                  <FaChevronDown />
                )}
              </div>

              {seccionesAbiertas.archivos && (
                <div className="form-section-content">
                  <div>
                    <h3 className="subsection-title">Currículum Vitae (PDF)</h3>
                    <SubidaArchivo
                      tipo="cv"
                      archivoActual={perfil.cvUrl}
                      onSubida={handleCVSubido}
                    />
                    <p className="text-sm text-gray-300 mt-2">
                      La foto de perfil se gestiona en el panel lateral
                      izquierdo
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Configuración de Visibilidad */}
            <div className="form-section">
              <div className="form-section-content">
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="perfilPublico"
                      checked={perfil.perfilPublico}
                      onChange={handleInputChange}
                    />
                    <span>Hacer mi perfil público (visible para todos)</span>
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="enBancoProfesionales"
                      checked={perfil.enBancoProfesionales}
                      onChange={handleInputChange}
                    />
                    <span>Aparecer en el banco de profesionales</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="form-actions">
              <button
                type="button"
                onClick={handleCancelar}
                className="btn-cancelar"
              >
                Regresar
              </button>

              <button
                type="button"
                onClick={handleGuardarCambios}
                className="btn-guardar"
                disabled={guardando}
              >
                {guardando ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog
        dialog={dialog}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default EditarPerfil;