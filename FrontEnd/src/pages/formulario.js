import { filterValidFiles, acceptAttr } from '../utils/fileValidation';
import { useState, useEffect } from "react";
import { IoMdClose, IoMdRemove, IoMdAdd } from "react-icons/io";
import { API_URL } from "../utils/api";
import { useAuth } from "../components/context/AuthContext";
import { puedeGestionarCuentasRegresivas } from "../utils/permisos";
import { fechaHoraCRaISO } from "../utils/cuentaRegresiva";
import { toast } from "react-hot-toast";
import CategoriaSelector from '../components/generic/categoriaSelector';
import AlertaLimitePublicaciones from '../components/AlertaLimitePublicaciones';
import '../CSS/formularioPublicacion.css';
import MapaUbicacion from '../components/MapaUbicacion';
import TextAreaComponent from '../components/TextAreaComponent';
import ConfirmDialog from "../components/ConfirmDialog";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import {
  readSessionDraft,
  removeSessionDraft,
  writeSessionDraft,
} from "../utils/sessionDraftStorage";

const CREATE_DRAFT_PREFIX = "komuness:crear-publicacion";

// Las publicaciones se generan automáticamente a partir de estos dos tipos
const TAGS_PERMITIDOS = ["evento", "emprendimiento"];
const CAMPOS_MONTO = ["precio", "precioEstudiante", "precioCiudadanoOro", "descuento"];

// Evita escribir signo negativo o notación científica en inputs numéricos
const bloquearSignoNegativo = (e) => {
  if (["-", "e", "E"].includes(e.key)) e.preventDefault();
};

const DEFAULT_UBICACION = {
  latitude: 9.7489,
  longitude: -83.7534,
  direccion: "San José, Costa Rica",
  mapLink:
    "https://www.openstreetmap.org/?mlat=9.7489&mlon=-83.7534#map=16/9.7489/-83.7534",
};

const createDefaultUbicacion = () => ({ ...DEFAULT_UBICACION });

const createDefaultEnlaces = () => [{ nombre: "", url: "" }];

const getCreateDraftStorageKey = (tag) =>
  `${CREATE_DRAFT_PREFIX}:${tag || "general"}`;

const normalizeTag = (tag) => (TAGS_PERMITIDOS.includes(tag) ? tag : "");

// Texto del encabezado según el tipo elegido (el color lo define el CSS por clase)
const TIPO_INFO = {
  evento: {
    badge: "Evento",
    titulo: "Crear evento",
    detalle: "Indica fecha, hora y ubicación para que la gente pueda asistir.",
  },
  emprendimiento: {
    badge: "Emprendimiento",
    titulo: "Crear emprendimiento",
    detalle: "Cuéntanos sobre tu negocio: qué ofreces, precios y cómo contactarte.",
  },
};

const TIPO_SIN_SELECCION = {
  badge: null,
  titulo: "Crear evento o emprendimiento",
  detalle: "Selecciona el tipo para ver los campos que necesitas.",
};

const getInitialFormValues = (tag) => ({
  titulo: "",
  contenido: "",
  contenidoBreve: "",
  autor: "",
  fecha: new Date().toLocaleDateString(),
  archivos: [],
  comentarios: [],
  tag: normalizeTag(tag),
  publicado: false,
  fechaEvento: "",
  horaEvento: "",
  mostrarCuentaRegresiva: false,
  precio: "",
  moneda: "CRC",
  precioNegociable: false,
  precioEstudiante: "",
  precioCiudadanoOro: "",
  descuento: "",
  telefono: "",
  categoria: "",
  comunidad: "",
});

const getPersistedFormData = (formData) => {
  const { archivos, ...resto } = formData;
  return resto;
};

export const FormularioPublicacion = ({ isOpen, onClose, openTag }) => {
  const { user } = useAuth();
  const puedeCuentaRegresiva = puedeGestionarCuentasRegresivas(user);
  const [mostrarAlerta, setMostrarAlerta] = useState(false);
  const [enlacesExternos, setEnlacesExternos] = useState(createDefaultEnlaces);
  const [ubicacion, setUbicacion] = useState(createDefaultUbicacion);
  const { dialog, confirm, handleConfirm, handleCancel } = useConfirmDialog();

  const [formData, setFormData] = useState(() => getInitialFormValues(openTag));
  const [draftCargado, setDraftCargado] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const draftStorageKey = getCreateDraftStorageKey(openTag);

  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (!isOpen) {
      setDraftCargado(false);
      setHasChanges(false);
      return;
    }

    let isActive = true;

    const loadDraft = async () => {
      setDraftCargado(false);
      const initialFormValues = getInitialFormValues(openTag);
      const savedDraft = readSessionDraft(draftStorageKey);

      if (savedDraft) {
        const shouldLoadDraft = await confirm({
          title: "Borrador encontrado",
          message: "Hay un borrador guardado de esta publicación.",
          hint: "Puedes cargarlo para continuar o descartarlo.",
          confirmText: "Cargar borrador",
          cancelText: "Descartar",
        });

        if (!isActive) return;

        if (shouldLoadDraft) {
          const draftData = savedDraft.formData || {};
          setFormData({
            ...initialFormValues,
            ...draftData,
            // Un borrador antiguo podría traer tag "publicacion": ya no es válido
            tag: normalizeTag(draftData.tag),
            archivos: [],
          });
          setEnlacesExternos(
            Array.isArray(savedDraft.enlacesExternos) &&
              savedDraft.enlacesExternos.length > 0
              ? savedDraft.enlacesExternos
              : createDefaultEnlaces(),
          );
          setUbicacion({
            ...createDefaultUbicacion(),
            ...(savedDraft.ubicacion || {}),
          });
          setHasChanges(true);
        } else {
          removeSessionDraft(draftStorageKey);
          setFormData(initialFormValues);
          setEnlacesExternos(createDefaultEnlaces());
          setUbicacion(createDefaultUbicacion());
          setHasChanges(false);
        }
      } else {
        setFormData(initialFormValues);
        setEnlacesExternos(createDefaultEnlaces());
        setUbicacion(createDefaultUbicacion());
        setHasChanges(false);
      }

      if (!isActive) return;
      setDraftCargado(true);
    };

    loadDraft();

    return () => {
      isActive = false;
    };
  }, [isOpen, openTag, draftStorageKey, confirm]);

  useEffect(() => {
    if (!isOpen || !draftCargado || !hasChanges) return;

    writeSessionDraft(draftStorageKey, {
      formData: getPersistedFormData(formData),
      enlacesExternos,
      ubicacion,
    });
  }, [isOpen, draftCargado, draftStorageKey, formData, enlacesExternos, ubicacion, hasChanges]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Rechaza montos negativos (incluso si los pegan)
    if (CAMPOS_MONTO.includes(name) && value !== "" && Number(value) < 0) return;

    const normalizedValue = type === "checkbox" ? checked : value;
    setHasChanges(true);
    setFormData((prev) => ({ ...prev, [name]: normalizedValue }));
  };

  const handlePrecioNegociableChange = (e) => {
    const checked = e.target.checked;
    setHasChanges(true);
    setFormData((prev) => ({
      ...prev,
      precioNegociable: checked,
      ...(checked
        ? {
            precio: "",
            precioEstudiante: "",
            precioCiudadanoOro: "",
          }
        : {}),
    }));
  };

  const handleImageChange = async (e) => {
    const selected = Array.from(e.target.files || []);
    // Permite volver a elegir el mismo archivo después de quitarlo de la vista previa
    e.target.value = "";
    const { valid: files } = await filterValidFiles(selected, "images");
    if (files.length > 0) {
      setHasChanges(true);
    }
    setFormData((prev) => ({ ...prev, archivos: [...prev.archivos, ...files] }));
  };

  const handleRemoveImage = (index) => {
    setHasChanges(true);
    setFormData((prev) => ({
      ...prev,
      archivos: prev.archivos.filter((_, i) => i !== index),
    }));
  };

  // Manejo de enlaces externos
  const handleEnlaceChange = (index, field, value) => {
    const updatedEnlaces = [...enlacesExternos];
    updatedEnlaces[index][field] = value;
    setHasChanges(true);
    setEnlacesExternos(updatedEnlaces);
  };

  const addEnlace = () => {
    setHasChanges(true);
    setEnlacesExternos([...enlacesExternos, { nombre: '', url: '' }]);
  };

  const removeEnlace = (index) => {
    if (enlacesExternos.length > 1) {
      setHasChanges(true);
      setEnlacesExternos(enlacesExternos.filter((_, i) => i !== index));
    }
  };

  const handleUbicacionChange = (nuevaUbicacion) => {
    setHasChanges(true);
    setUbicacion(nuevaUbicacion);
  };

  const handleClose = async () => {
    if (hasChanges) {
      const shouldSave = await confirm({
        title: "Guardar borrador",
        message: "Deseas guardar lo escrito para continuar después?",
        hint: "Si descartas, se eliminará el borrador guardado.",
        confirmText: "Guardar",
        cancelText: "Descartar",
      });

      if (shouldSave) {
        writeSessionDraft(draftStorageKey, {
          formData: getPersistedFormData(formData),
          enlacesExternos,
          ubicacion,
        });
      } else {
        removeSessionDraft(draftStorageKey);
      }
    } else {
      removeSessionDraft(draftStorageKey);
    }

    onClose?.();
  };

    // Filtrar enlaces válidos (con nombre y URL)
  const enlacesValidos = enlacesExternos.filter(
    (enlace) => enlace.nombre.trim() !== "" && enlace.url.trim() !== "",
  );

  // Validaciones previas al envío. Devuelve el mensaje de error o null.
  const validarFormulario = () => {
    if (!TAGS_PERMITIDOS.includes(formData.tag)) {
      return "Selecciona si es un evento o un emprendimiento";
    }
    if (!formData.comunidad.trim()) {
      return "La comunidad es obligatoria";
    }
    if (formData.archivos.length === 0) {
      return "Debes agregar al menos una imagen";
    }
    if (CAMPOS_MONTO.some((campo) => Number(formData[campo]) < 0)) {
      return "Los montos no pueden ser negativos";
    }
    if (Number(formData.descuento) > 100) {
      return "El descuento no puede ser mayor a 100%";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errorValidacion = validarFormulario();
    if (errorValidacion) {
      toast.error(errorValidacion);
      return;
    }

    const data = new FormData();
    data.append("titulo", formData.titulo);
    data.append("contenido", formData.contenido);
    data.append("contenidoBreve", formData.contenidoBreve);
    data.append("fecha", formData.fecha);
    data.append("tag", formData.tag);
    data.append("publicado", String(formData.publicado));
    data.append("fechaEvento", formData.fechaEvento || "");
    data.append("horaEvento", formData.horaEvento || "");
    const conCuentaRegresiva =
      formData.tag === "evento" && puedeCuentaRegresiva && formData.mostrarCuentaRegresiva === true;
    data.append("mostrarCuentaRegresiva", String(conCuentaRegresiva));
    data.append("precio", formData.precio || "");
    data.append("moneda", formData.moneda || "CRC");
    data.append("precioNegociable", String(formData.precioNegociable));
    data.append("precioEstudiante", formData.precioEstudiante || "");
    data.append("precioCiudadanoOro", formData.precioCiudadanoOro || "");
    data.append("descuento", formData.descuento || "0");
    data.append("telefono", formData.telefono || "");
    data.append("categoria", formData.categoria || "");
    data.append("comunidad", formData.comunidad || "");

    // Agregar ubicación como JSON si es un evento o un emprendimiento
    if (
      (formData.tag === "evento" || formData.tag === "emprendimiento") &&
      ubicacion
    ) {
      data.append("ubicacion", JSON.stringify(ubicacion));
    }

    // Agregar enlaces externos como JSON
    if (enlacesValidos.length > 0) {
      data.append("enlacesExternos", JSON.stringify(enlacesValidos));
    }

    formData.archivos.forEach((archivo) => {
      data.append("archivos", archivo);
    });

    try {
      await enviarPublicacion(data);
      if (conCuentaRegresiva) {
        const objetivo = fechaHoraCRaISO(formData.fechaEvento, formData.horaEvento);
        if (!objetivo || Date.parse(objetivo) <= Date.now()) {
          toast("El evento se creó, pero no tiene una fecha futura para la cuenta regresiva");
        }
      }
      removeSessionDraft(draftStorageKey);
      onClose?.();
    } catch (error) {
      // Si el error es por límite de publicaciones (403), solo mostrar modal premium
      // No mostrar ninguna otra alerta
      if (error.status === 403) {
        setMostrarAlerta(true);
        // No re-lanzar el error para evitar mensajes adicionales
        return;
      }
      // Para otros errores, el toast.promise ya los manejó
    }
  };

  const enviarPublicacion = async (data) => {
    // Primero hacemos la petición sin toast para poder manejar el 403 de manera especial
    const response = await fetch(`${API_URL}/publicaciones/v2/`, {
      method: "POST",
      body: data,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
    });

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error("Respuesta inesperada del servidor.");
    }

    if (!response.ok || result?.success === false) {
      const error = new Error(
        result?.message || result?.mensaje || "Error al enviar publicación.",
      );
      error.status = response.status;

      // Si es error 403, lanzarlo sin mostrar toast
      if (response.status === 403) {
        throw error;
      }

      // Para otros errores, mostrar toast
      toast.error(error.message);
      throw error;
    }

    // Si fue exitoso, mostrar toast de éxito
    const nombreTipo = data.get("tag") === "evento" ? "Evento" : "Emprendimiento";
    toast.success(
      `${nombreTipo} enviado con éxito, solicita a un administrador que lo publique 🎉`,
      {
        duration: 8000,
      },
    );

    return result;
  };

  if (!isOpen) return null;

  const tipoInfo = TIPO_INFO[formData.tag] || TIPO_SIN_SELECCION;

  return (
    <>
      <div className="formulario-publicacion-container">
        <div
          className={`formulario-publicacion formulario-publicacion--${
            formData.tag || "sin-tipo"
          }`}
        >
          <form onSubmit={handleSubmit} className="formulario-grid">
            {/* Header móvil */}
            <div className="formulario-mobile-header">
              <button type="button" onClick={handleClose} className="text-gray-600 text-2xl font-bold">
                <IoMdClose size={35} />
              </button>
              <button type="submit" className="boton-mobile">
                Publicar
              </button>
            </div>

            {/* Encabezado que cambia según el tipo */}
            <div className="formulario-tipo-banner">
              {tipoInfo.badge && (
                <span className="tipo-badge">{tipoInfo.badge}</span>
              )}
              <h2 className="formulario-tipo-titulo">{tipoInfo.titulo}</h2>
              <p className="formulario-tipo-detalle">{tipoInfo.detalle}</p>
            </div>

            {/* Tipo: se elige primero porque define el resto del formulario */}
            <div className="campo-grupo">
              <label className="campo-label">Tipo:</label>
              <select
                name="tag"
                value={formData.tag}
                onChange={handleChange}
                className="campo-select"
                required
              >
                <option value="">Selecciona el tipo</option>
                <option value="evento">Evento</option>
                <option value="emprendimiento">Emprendimiento</option>
              </select>
            </div>

            {/* Título */}
            <div className="campo-grupo">
              <label className="campo-label">Título:</label>
              <input
                type="text"
                name="titulo"
                value={formData.titulo}
                onChange={handleChange}
                maxLength={100}
                className="campo-input"
                required
              />
              <p className="texto-contador">
                {formData.titulo.length}/100 caracteres
              </p>
            </div>

            {/* Clasificación */}
            <div className="campo-grupo">
              <label className="campo-label">Clasificación:</label>
              <CategoriaSelector
                selectedCategoria={formData.categoria}
                onCategoriaChange={handleChange}
                required={true}
              />
            </div>

            {/* Comunidad */}
            <div className="campo-grupo">
              <label className="campo-label">Comunidad *:</label>
              <input
                type="text"
                name="comunidad"
                value={formData.comunidad}
                onChange={handleChange}
                maxLength={100}
                required
                className="campo-input"
                placeholder="Ej: San José Centro, Heredia, Barrio Escalante"
              />
            </div>

            {/* Descripción */}
            <div className="campo-grupo">
              <label className="campo-label">Descripción:</label>
              <textarea
                name="contenido"
                value={formData.contenido}
                onChange={handleChange}
                className="campo-textarea"
                placeholder={
                  formData.tag === "emprendimiento"
                    ? "Descripción del emprendimiento"
                    : "Descripción del evento"
                }
                rows="4"
                required
              />
            </div>
            {/* Descripción corta*/}
            <div className="campo-grupo">
              <label className="campo-label">Descripción breve:</label>
              <TextAreaComponent
                name="contenidoBreve"
                value={formData.contenidoBreve}
                onChange={handleChange}
                className="campo-textarea small"
                placeholder={`Descripción breve`}
                limit={100}
                rows={2}
                required
              />
            </div>

            {/* Precios para eventos y emprendimientos */}
            {(formData.tag === "evento" ||
              formData.tag === "emprendimiento") && (
              <div className="precios-seccion">
                <h3 className="precios-titulo">Precios</h3>

                {formData.tag === "emprendimiento" && (
                  <div className="precio-negociable-box">
                    <div className="precio-negociable-header">
                      <input
                        id="precioNegociableCrear"
                        type="checkbox"
                        name="precioNegociable"
                        checked={formData.precioNegociable === true}
                        onChange={handlePrecioNegociableChange}
                        className="precio-negociable-checkbox"
                      />
                      <label
                        htmlFor="precioNegociableCrear"
                        className="precio-negociable-label"
                      >
                        Precio negociable
                      </label>
                    </div>
                    <p className="precio-negociable-help">
                      Si activas esta opción, no se mostrará un precio fijo en
                      el emprendimiento.
                    </p>
                  </div>
                )}

                {(formData.tag === "evento" || !formData.precioNegociable) && (
                  <>
                    <div className="campo-grupo">
                      <label className="campo-label">Moneda *:</label>
                      <select
                        name="moneda"
                        value={formData.moneda}
                        onChange={handleChange}
                        className="campo-select"
                        required
                      >
                        <option value="CRC">Colones (₡)</option>
                        <option value="USD">Dólares ($)</option>
                      </select>
                    </div>

                    {/* Precio Regular */}
                    <div className="campo-grupo">
                      <label className="campo-label">Precio regular *:</label>
                      <input
                        type="number"
                        name="precio"
                        value={formData.precio}
                        onChange={handleChange}
                        onKeyDown={bloquearSignoNegativo}
                        className="campo-input"
                        required
                        min="0"
                        placeholder="Ej: 10000"
                      />
                    </div>

                    {/* Precio Estudiante */}
                    <div className="campo-grupo">
                      <label className="campo-label">
                        Precio estudiante (opcional):
                      </label>
                      <input
                        type="number"
                        name="precioEstudiante"
                        value={formData.precioEstudiante}
                        onChange={handleChange}
                        onKeyDown={bloquearSignoNegativo}
                        className="campo-input"
                        min="0"
                        placeholder="Ej: 5000"
                      />
                    </div>

                    {/* Precio Ciudadano de Oro */}
                    <div className="campo-grupo">
                      <label className="campo-label">
                        Precio ciudadano de oro (opcional):
                      </label>
                      <input
                        type="number"
                        name="precioCiudadanoOro"
                        value={formData.precioCiudadanoOro}
                        onChange={handleChange}
                        onKeyDown={bloquearSignoNegativo}
                        className="campo-input"
                        min="0"
                        placeholder="Ej: 7000"
                      />
                    </div>

                    {/* Descuento */}
                    <div className="campo-grupo">
                      <label className="campo-label">
                        Descuento (% - opcional):
                      </label>
                      <input
                        type="number"
                        name="descuento"
                        value={formData.descuento}
                        onChange={handleChange}
                        onKeyDown={bloquearSignoNegativo}
                        className="campo-input"
                        placeholder="Ej: 15 (para 15%)"
                        min="0"
                        max="100"
                      />
                      {formData.descuento && (
                        <p className="texto-ayuda">
                          Descuento: {formData.descuento}%
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Teléfono */}

            <div className="campo-grupo">
              <label className="campo-label">
                Teléfono de contacto (opcional):
              </label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className="campo-input"
                placeholder="Ej: 88888888"
                pattern="[0-9]*"
                inputMode="numeric"
                onKeyPress={(e) => {
                  // Solo permite números
                  if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
              />
              {formData.telefono && !/^\d+$/.test(formData.telefono) && (
                <p className="texto-error">
                  El teléfono debe contener solo números
                </p>
              )}
            </div>

            {/* Enlaces externos */}
            <div className="enlaces-seccion">
              <label className="campo-label">
                Enlaces externos (opcional):
              </label>
              <p className="texto-ayuda">
                Puedes agregar: URLs, correos, enlaces de WhatsApp, etc.
              </p>
              {enlacesExternos.map((enlace, index) => (
                <div key={index} className="enlace-fila">
                  <input
                    type="text"
                    placeholder="Ej: Facebook, Correo, WhatsApp"
                    value={enlace.nombre}
                    onChange={(e) =>
                      handleEnlaceChange(index, "nombre", e.target.value)
                    }
                    className="campo-input enlace-input"
                  />
                  <input
                    type="text"
                    placeholder="https://..., correo@gmail.com,"
                    value={enlace.url}
                    onChange={(e) =>
                      handleEnlaceChange(index, "url", e.target.value)
                    }
                    className="campo-input enlace-input"
                  />
                  <button
                    type="button"
                    onClick={() => removeEnlace(index)}
                    className="boton-eliminar-enlace"
                    disabled={enlacesExternos.length === 1}
                  >
                    <IoMdRemove size={20} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addEnlace}
                className="boton-agregar-enlace"
              >
                <IoMdAdd size={16} />
                Agregar otro enlace
              </button>
            </div>

            {/* Imágenes (al menos una es obligatoria; se valida en handleSubmit) */}
            <div className="campo-grupo">
              <label className="campo-label">Imágenes *:</label>
              <input
                type="file"
                accept={acceptAttr('images')}
                multiple
                onChange={handleImageChange}
                className="campo-input"
              />
              <p className="texto-ayuda">Agrega al menos una imagen.</p>
            </div>

            {/* Previsualización */}
            {formData.archivos.length > 0 && (
              <div className="campo-grupo">
                <h3 className="campo-label">Vista previa:</h3>
                <div className="previsualizacion-grid">
                  {formData.archivos.map((img, index) => (
                    <div key={index} className="previsualizacion-item">
                      <img
                        src={URL.createObjectURL(img)}
                        alt={`Imagen ${index + 1}`}
                        className="previsualizacion-imagen"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="boton-eliminar-imagen"
                      >
                        <IoMdClose />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fecha + Hora del evento */}
            {formData.tag === "evento" && (
              <>
                <div className="campo-grupo">
                  <label className="campo-label">Fecha del evento:</label>
                  <input
                    type="date"
                    name="fechaEvento"
                    value={formData.fechaEvento}
                    onChange={handleChange}
                    className="campo-input"
                    required
                  />
                </div>

                <div className="campo-grupo">
                  <label className="campo-label">Hora del evento:</label>
                  <input
                    type="time"
                    name="horaEvento"
                    value={formData.horaEvento}
                    onChange={handleChange}
                    className="campo-input"
                    required
                  />
                </div>

                {puedeCuentaRegresiva && (
                  <div className="precio-negociable-box" style={{ gridColumn: "1 / -1" }}>
                    <div className="precio-negociable-header">
                      <input
                        id="mostrarCuentaRegresivaCrear"
                        type="checkbox"
                        name="mostrarCuentaRegresiva"
                        checked={formData.mostrarCuentaRegresiva === true}
                        onChange={handleChange}
                        className="precio-negociable-checkbox"
                      />
                      <label
                        htmlFor="mostrarCuentaRegresivaCrear"
                        className="precio-negociable-label"
                      >
                        Mostrar cuenta regresiva en la principal
                      </label>
                    </div>
                    <p className="precio-negociable-help">
                      Aparece en la página de inicio cuando el evento esté
                      publicado.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Mapa para seleccionar ubicación (eventos y emprendimientos) */}
            {(formData.tag === "evento" ||
              formData.tag === "emprendimiento") && (
              <div style={{ gridColumn: "1 / -1" }}>
                <MapaUbicacion
                  onLocationSelect={handleUbicacionChange}
                  initialLocation={ubicacion}
                />
              </div>
            )}

            {/* Botones desktop */}
            <div className="botones-desktop">
              <button type="button" onClick={handleClose} className="boton-volver">
                Volver
              </button>
              <button type="submit" className="boton-publicar">
                Publicar
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Alerta de límite de publicaciones */}
      <AlertaLimitePublicaciones
        show={mostrarAlerta}
        onClose={() => setMostrarAlerta(false)}
      />

      <ConfirmDialog
        dialog={dialog}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
};

export default FormularioPublicacion;