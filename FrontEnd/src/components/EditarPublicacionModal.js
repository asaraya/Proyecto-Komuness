import { filterValidFiles, acceptAttr } from '../utils/fileValidation';
import { useState, useEffect } from "react";
import { IoMdClose, IoMdRemove, IoMdAdd } from "react-icons/io";
import { API_URL } from "../utils/api";
import { toast } from "react-hot-toast";
import CategoriaSelector from "./generic/categoriaSelector";
import { CuentaRegresivaEventoToggle } from "./CuentaRegresivaEventoToggle";
import "../CSS/formularioPublicacion.css";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import {
  readSessionDraft,
  removeSessionDraft,
  writeSessionDraft,
} from "../utils/sessionDraftStorage";

const EDIT_DRAFT_PREFIX = "komuness:editar-publicacion";

const getDraftStorageKey = (publicacionId) =>
  `${EDIT_DRAFT_PREFIX}:${publicacionId}`;

const getInitialDraftState = (publicacion) => ({
  formData: {
    titulo: publicacion.titulo || "",
    contenido: publicacion.contenido || "",
    fechaEvento: publicacion.fechaEvento || "",
    horaEvento: publicacion.horaEvento || "",
    precio:
      publicacion.precio !== undefined && publicacion.precio !== null
        ? publicacion.precio.toString()
        : "",
    moneda:
      publicacion.moneda || (publicacion.monedaSimbolo === "$" ? "USD" : "CRC"),
    precioNegociable: publicacion.precioNegociable === true,
    precioEstudiante:
      publicacion.precioEstudiante !== undefined &&
      publicacion.precioEstudiante !== null
        ? publicacion.precioEstudiante.toString()
        : "",
    precioCiudadanoOro:
      publicacion.precioCiudadanoOro !== undefined &&
      publicacion.precioCiudadanoOro !== null
        ? publicacion.precioCiudadanoOro.toString()
        : "",
    descuento:
      publicacion.descuento !== undefined && publicacion.descuento !== null
        ? publicacion.descuento.toString()
        : "",
    telefono: publicacion.telefono || "",
    categoria: publicacion.categoria?._id || publicacion.categoria || "",
    comunidad: publicacion.comunidad || "",
  },
  enlacesExternos:
    publicacion.enlacesExternos && publicacion.enlacesExternos.length > 0
      ? publicacion.enlacesExternos
      : [{ nombre: "", url: "" }],
  imagenesMantenidas:
    publicacion.adjunto && publicacion.adjunto.length > 0
      ? publicacion.adjunto
      : [],
});

export const EditarPublicacionModal = ({
  publicacion,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [formData, setFormData] = useState({
    titulo: "",
    contenido: "",
    fechaEvento: "",
    horaEvento: "",
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

  const [enlacesExternos, setEnlacesExternos] = useState([
    { nombre: "", url: "" },
  ]);
  const [imagenesMantenidas, setImagenesMantenidas] = useState([]);
  const [nuevasImagenes, setNuevasImagenes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [draftCargado, setDraftCargado] = useState(false);

  useLockBodyScroll(isOpen);

  // Verificar si se alcanzó el límite de ediciones
  const haAlcanzadoLimite = (publicacion.editCount || 0) >= 3;

  // Inicializar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen && publicacion) {
      setDraftCargado(false);
      const initialState = getInitialDraftState(publicacion);

      setFormData({
        titulo: publicacion.titulo || "",
        contenido: publicacion.contenido || "",
        fechaEvento: publicacion.fechaEvento || "",
        horaEvento: publicacion.horaEvento || "",
        precio:
          publicacion.precio !== undefined && publicacion.precio !== null
            ? publicacion.precio.toString()
            : "",
        moneda:
          publicacion.moneda ||
          (publicacion.monedaSimbolo === "$" ? "USD" : "CRC"),
        precioNegociable: publicacion.precioNegociable === true,
        precioEstudiante:
          publicacion.precioEstudiante !== undefined &&
          publicacion.precioEstudiante !== null
            ? publicacion.precioEstudiante.toString()
            : "",
        precioCiudadanoOro:
          publicacion.precioCiudadanoOro !== undefined &&
          publicacion.precioCiudadanoOro !== null
            ? publicacion.precioCiudadanoOro.toString()
            : "",
        descuento:
          publicacion.descuento !== undefined && publicacion.descuento !== null
            ? publicacion.descuento.toString()
            : "",
        telefono: publicacion.telefono || "",
        categoria: publicacion.categoria?._id || publicacion.categoria || "",
        comunidad: publicacion.comunidad || "",
      });

      // Inicializar enlaces externos
      if (
        publicacion.enlacesExternos &&
        publicacion.enlacesExternos.length > 0
      ) {
        setEnlacesExternos(publicacion.enlacesExternos);
      } else {
        setEnlacesExternos([{ nombre: "", url: "" }]);
      }

      // Inicializar imágenes mantenidas
      if (publicacion.adjunto && publicacion.adjunto.length > 0) {
        setImagenesMantenidas(publicacion.adjunto);
      } else {
        setImagenesMantenidas([]);
      }

      const savedDraft = readSessionDraft(getDraftStorageKey(publicacion._id));
      if (savedDraft) {
        setFormData({
          ...initialState.formData,
          ...(savedDraft.formData || {}),
        });
        if (
          Array.isArray(savedDraft.enlacesExternos) &&
          savedDraft.enlacesExternos.length > 0
        ) {
          setEnlacesExternos(savedDraft.enlacesExternos);
        } else {
          setEnlacesExternos(initialState.enlacesExternos);
        }
        if (Array.isArray(savedDraft.imagenesMantenidas)) {
          setImagenesMantenidas(savedDraft.imagenesMantenidas);
        } else {
          setImagenesMantenidas(initialState.imagenesMantenidas);
        }
      }

      setNuevasImagenes([]);
      setDraftCargado(true);
    } else {
      setDraftCargado(false);
    }
  }, [isOpen, publicacion]);

  useEffect(() => {
    if (!isOpen || !publicacion?._id || !draftCargado) return;

    writeSessionDraft(getDraftStorageKey(publicacion._id), {
      formData,
      enlacesExternos,
      imagenesMantenidas,
    });
  }, [
    isOpen,
    publicacion?._id,
    formData,
    enlacesExternos,
    imagenesMantenidas,
    draftCargado,
  ]);

  const CAMPOS_MONTO = ["precio", "precioEstudiante", "precioCiudadanoOro", "descuento"];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (CAMPOS_MONTO.includes(name) && value !== "" && Number(value) < 0) return;
    const normalizedValue = type === "checkbox" ? checked : value;
    setFormData((prev) => ({ ...prev, [name]: normalizedValue }));
  };

  const handlePrecioNegociableChange = (e) => {
    const checked = e.target.checked;
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
    e.target.value = "";
    const { valid: files } = await filterValidFiles(selected, "images");
    setNuevasImagenes((prev) => [...prev, ...files]);
  };

  const handleRemoveNewImage = (index) => {
    setNuevasImagenes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingImage = (index) => {
    setImagenesMantenidas((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEnlaceChange = (index, field, value) => {
    const updatedEnlaces = [...enlacesExternos];
    updatedEnlaces[index][field] = value;
    setEnlacesExternos(updatedEnlaces);
  };

  const addEnlace = () => {
    setEnlacesExternos([...enlacesExternos, { nombre: "", url: "" }]);
  };

  const removeEnlace = (index) => {
    if (enlacesExternos.length > 1) {
      setEnlacesExternos(enlacesExternos.filter((_, i) => i !== index));
    }
  };

  // Filtrar enlaces válidos
  const enlacesValidos = enlacesExternos.filter(
    (enlace) => enlace.nombre.trim() !== "" && enlace.url.trim() !== "",
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    const requiereFoto = publicacion.tag === "evento" || publicacion.tag === "emprendimiento";
      if (requiereFoto && imagenesMantenidas.length + nuevasImagenes.length === 0) {
        toast.error("Debes mantener o agregar al menos una imagen");
        return;
      }

    setCargando(true);

    try {
      // Crear objeto plano primero para debugging
      const datosActualizacion = {
        titulo: formData.titulo,
        contenido: formData.contenido,
        fechaEvento: formData.fechaEvento || "",
        horaEvento: formData.horaEvento || "",
        precio: formData.precio || "",
        moneda: formData.moneda || "CRC",
        precioNegociable: formData.precioNegociable === true,
        precioEstudiante: formData.precioEstudiante || "",
        precioCiudadanoOro: formData.precioCiudadanoOro || "",
        descuento: formData.descuento || "",
        telefono: formData.telefono || "",
        categoria: formData.categoria || "",
        comunidad: formData.comunidad || "",
        enlacesExternos: enlacesValidos.length > 0 ? enlacesValidos : [],
        imagenesMantenidas: imagenesMantenidas,
        nuevasImagenesCount: nuevasImagenes.length,
      };

      const data = new FormData();

      data.append("titulo", formData.titulo);
      data.append("contenido", formData.contenido);
      data.append("fechaEvento", formData.fechaEvento || "");
      data.append("horaEvento", formData.horaEvento || "");
      data.append("precio", formData.precio || "");
      data.append("moneda", formData.moneda || "CRC");
      data.append(
        "precioNegociable",
        String(formData.precioNegociable === true),
      );
      data.append("precioEstudiante", formData.precioEstudiante || "");
      data.append("precioCiudadanoOro", formData.precioCiudadanoOro || "");
      data.append("descuento", formData.descuento || "");
      data.append("telefono", formData.telefono || "");
      data.append("categoria", formData.categoria || "");
      data.append("comunidad", formData.comunidad || "");

      //  Siempre enviar enlaces externos, incluso si está vacío
      data.append("enlacesExternos", JSON.stringify(enlacesValidos));

      //  Siempre enviar imágenes mantenidas
      data.append("imagenesMantenidas", JSON.stringify(imagenesMantenidas));

      // Nuevas imágenes como archivos
      nuevasImagenes.forEach((archivo) => {
        data.append("archivos", archivo);
      });

      for (const [key] of data.entries()) {
        if (key === "archivos") {
          console.log("Bien");
        } else {
          console.log("Bien");
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout

      const response = await fetch(
        `${API_URL}/publicaciones/${publicacion._id}/request-update`,
        {
          method: "PUT",
          body: data,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            // NO incluir Content-Type para FormData, el navegador lo establece automáticamente
          },
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      const text = await response.text();

      let result;
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        console.error(" Error parseando respuesta JSON:", parseError);
        throw new Error(
          "Respuesta inesperada del servidor: " + text.substring(0, 100),
        );
      }

      if (!response.ok) {
        console.error(" Error del servidor:", result);
        throw new Error(
          result?.message ||
            result?.mensaje ||
            `Error ${response.status} al enviar solicitud de edición`,
        );
      }

      // Toast con duración más larga para que el usuario lo vea
      toast.success(
        "Solicitud de edición enviada para revisión. Un administrador debe aprobarla para aplicar los cambios.",
        { duration: 3000 },
      );

      // Cerrar el modal un poquito después para no matar el toast de inmediato
      removeSessionDraft(getDraftStorageKey(publicacion._id));
      setTimeout(() => {
        onClose?.();
      }, 300);
    } catch (error) {
      if (
        error.message &&
        error.message.includes("alcanzado el límite máximo")
      ) {
        // No hacer console.error para este caso específico, solo mostrar toast
        toast.error(error.message);
      } else {
        console.error(" Error al enviar solicitud:", error);
        if (error.name === "AbortError") {
          toast.error(
            "La solicitud tardó demasiado tiempo. Intenta nuevamente.",
          );
        } else {
          toast.error(error.message || "Error al enviar solicitud de edición");
        }
      }
    } finally {
      setCargando(false);
    }
  };

  if (!isOpen) return null;

  // Mostrar mensaje de límite alcanzado en lugar del formulario
  if (haAlcanzadoLimite) {
    return (
      <div className="formulario-publicacion-container">
        <div className="formulario-publicacion">
          <div className="p-6">
            {/* Header móvil */}
            <div className="formulario-mobile-header">
              <button
                type="button"
                onClick={onClose}
                className="text-gray-600 text-2xl font-bold"
              >
                <IoMdClose size={35} />
              </button>
              <h2 className="text-xl font-bold text-white">
                Límite de Ediciones Alcanzado
              </h2>
              <div className="w-10"></div> {/* Espacio para balancear */}
            </div>

            {/* Mensaje de límite alcanzado */}
            <div className="text-center py-8">
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-6 py-8 rounded-lg mb-6">
                <div className="text-5xl mb-4">⚠️</div>
                <h3 className="text-2xl font-bold text-yellow-800 mb-4">
                  Límite de Ediciones Alcanzado
                </h3>
                <p className="text-lg text-yellow-700 mb-4">
                  Esta publicación ha alcanzado el límite máximo de{" "}
                  <strong>3 ediciones</strong> permitidas.
                </p>
                <p className="text-yellow-600">
                  Para realizar más cambios, por favor contacte al administrador
                  del sistema.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-blue-800 mb-2">
                  Información de la publicación:
                </h4>
                <p className="text-blue-700">
                  <strong>Título:</strong> {publicacion.titulo}
                </p>
                <p className="text-blue-700">
                  <strong>Ediciones realizadas:</strong>{" "}
                  {publicacion.editCount || 0}/3
                </p>
                <p className="text-blue-700">
                  <strong>Última edición:</strong>{" "}
                  {publicacion.lastEditRequest
                    ? new Date(publicacion.lastEditRequest).toLocaleDateString()
                    : "No disponible"}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar formulario normal si no ha alcanzado el límite
  return (
    <div className="formulario-publicacion-container">
      <div className="formulario-publicacion">
        <form onSubmit={handleSubmit} className="formulario-grid">
          {/* Header móvil */}
          <div className="formulario-mobile-header">
            <button
              type="button"
              onClick={onClose}
              className="text-gray-600 text-2xl font-bold"
            >
              <IoMdClose size={35} />
            </button>
            <h2 className="text-xl font-bold text-white">Editar Publicación</h2>
            <button type="submit" className="boton-mobile" disabled={cargando}>
              {cargando ? "Enviando..." : "Solicitar Edición"}
            </button>
          </div>

          {/* Información sobre el proceso */}
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
            <p className="text-sm">
              <strong>Nota:</strong> Las ediciones requieren aprobación de un
              administrador. Límite: {publicacion.editCount || 0}/3 ediciones
              realizadas.
            </p>
          </div>

          {/* Título */}
          <div className="campo-grupo">
            <label htmlFor="titulo" className="campo-label">
              Título:
            </label>
            <input
              id="titulo"
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

          {/* Tag (solo lectura) */}
          <div className="campo-grupo">
            <label className="campo-label">Tipo (tag):</label>
            <input
              type="text"
              value={publicacion.tag}
              className="campo-input bg-gray-100"
              readOnly
              disabled
            />
            <p className="texto-ayuda">
              El tipo de publicación no se puede modificar
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
            <label htmlFor="comunidad" className="campo-label">
              Comunidad (opcional):
            </label>
            <input
              type="text"
              id="comunidad"
              name="comunidad"
              value={formData.comunidad}
              onChange={handleChange}
              maxLength={100}
              className="campo-input"
              placeholder="Ej: San José Centro, Heredia, Barrio Escalante"
            />
          </div>

          {/* Descripción */}
          <div className="campo-grupo">
            <label htmlFor="contenido" className="campo-label">
              Descripción:
            </label>
            <textarea
              id="contenido"
              name="contenido"
              value={formData.contenido}
              onChange={handleChange}
              className="campo-textarea"
              placeholder="Descripción de la publicación"
              rows="6"
              required
            />
          </div>

          {/* Precios para eventos y emprendimientos */}
          {(publicacion.tag === "evento" ||
            publicacion.tag === "emprendimiento") && (
            <div className="precios-seccion">
              <h3 className="precios-titulo">Precios</h3>

              {publicacion.tag === "emprendimiento" && (
                <div className="precio-negociable-box">
                  <div className="precio-negociable-header">
                    <input
                      id="precioNegociableEditar"
                      type="checkbox"
                      name="precioNegociable"
                      checked={formData.precioNegociable === true}
                      onChange={handlePrecioNegociableChange}
                      className="precio-negociable-checkbox"
                    />
                    <label
                      htmlFor="precioNegociableEditar"
                      className="precio-negociable-label"
                    >
                      Precio negociable
                    </label>
                  </div>
                  <p className="precio-negociable-help">
                    Si activas esta opción, no se mostrará un precio fijo en el
                    emprendimiento.
                  </p>
                </div>
              )}

              {(publicacion.tag === "evento" || !formData.precioNegociable) && (
                <>
                  <div className="campo-grupo">
                    <label htmlFor="moneda" className="campo-label">
                      Moneda *:
                    </label>
                    <select
                      id="moneda"
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
                    <label htmlFor="precio" className="campo-label">
                      Precio regular *:
                    </label>
                    <input
                      id="precio"
                      type="number"
                      name="precio"
                      value={formData.precio}
                      onChange={handleChange}
                      className="campo-input"
                      required
                      placeholder="Ej: 10000"
                      min="0"
                    />
                  </div>

                  {/* Precio Estudiante*/}
                  <div className="campo-grupo">
                    <label htmlFor="precioEstudiante" className="campo-label">
                      Precio estudiante (opcional):
                    </label>
                    <input
                      id="precioEstudiante"
                      type="number"
                      name="precioEstudiante"
                      value={formData.precioEstudiante}
                      onChange={handleChange}
                      className="campo-input"
                      placeholder="Ej: 5000"
                    />
                  </div>

                  {/* Precio Ciudadano de Oro  */}
                  <div className="campo-grupo">
                    <label htmlFor="precioCiudadanoOro" className="campo-label">
                      Precio ciudadano de oro (opcional):
                    </label>
                    <input
                      id="precioCiudadanoOro"
                      type="number"
                      name="precioCiudadanoOro"
                      value={formData.precioCiudadanoOro}
                      onChange={handleChange}
                      className="campo-input"
                      placeholder="Ej: 7000"
                      min="0"
                    />
                  </div>

                  {/* Descuento */}
                  <div className="campo-grupo">
                    <label htmlFor="descuento" className="campo-label">
                      Descuento (% - opcional):
                    </label>
                    <input
                      id="descuento"
                      type="number"
                      name="descuento"
                      value={formData.descuento}
                      onChange={handleChange}
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
            <label htmlFor="telefono" className="campo-label">
              Teléfono de contacto (opcional):
            </label>
            <input
              id="telefono"
              type="tel"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              className="campo-input"
              placeholder="Ej: 88888888"
            />
          </div>

          {/* Enlaces externos */}
          <div className="enlaces-seccion">
            <label className="campo-label">Enlaces externos (opcional):</label>
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
                  placeholder="https://..., correo@gmail.com, 88888888"
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

          {/* Gestión de imágenes existentes */}
          {imagenesMantenidas.length > 0 && (
            <div className="campo-grupo">
              <label className="campo-label">Imágenes actuales:</label>
              <p className="texto-ayuda mb-2">
                Desmarca las imágenes que quieres eliminar
              </p>
              <div className="previsualizacion-grid">
                {imagenesMantenidas.map((img, index) => (
                  <div key={index} className="previsualizacion-item relative">
                    <img
                      src={img.url}
                      alt={`Imagen ${index + 1}`}
                      className="previsualizacion-imagen"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingImage(index)}
                      className="boton-eliminar-imagen"
                    >
                      <IoMdClose />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nuevas imágenes  */}
          <div className="campo-grupo">
            <label htmlFor="nuevasImagenes" className="campo-label">
              Agregar nuevas imágenes {publicacion.tag === "publicacion" ? "(opcional)" : "*"}
            </label>
            <input
              id="nuevasImagenes"
              type="file"
              accept={acceptAttr('images')}
              multiple
              onChange={handleImageChange}
              className="campo-input"
            />
          </div>

          {/* Previsualización de nuevas imágenes */}
          {nuevasImagenes.length > 0 && (
            <div className="campo-grupo">
              <h3 className="campo-label">Vista previa de nuevas imágenes:</h3>
              <div className="previsualizacion-grid">
                {nuevasImagenes.map((img, index) => (
                  <div key={index} className="previsualizacion-item">
                    <img
                      src={URL.createObjectURL(img)}
                      alt={`Nueva imagen ${index + 1}`}
                      className="previsualizacion-imagen"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveNewImage(index)}
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
          {publicacion.tag === "evento" && (
            <>
              <div className="campo-grupo">
                <label htmlFor="fechaEvento" className="campo-label">
                  Fecha del evento:
                </label>
                <input
                  id="fechaEvento"
                  type="date"
                  name="fechaEvento"
                  value={formData.fechaEvento}
                  onChange={handleChange}
                  className="campo-input"
                  required
                />
              </div>

              <div className="campo-grupo">
                <label htmlFor="horaEvento" className="campo-label">
                  Hora del evento:
                </label>
                <input
                  id="horaEvento"
                  type="time"
                  name="horaEvento"
                  value={formData.horaEvento}
                  onChange={handleChange}
                  className="campo-input"
                  required
                />
              </div>

              <CuentaRegresivaEventoToggle publicacion={publicacion} />
            </>
          )}

          {/* Botones desktop */}
          <div className="botones-desktop">
            <button
              type="button"
              onClick={onClose}
              className="boton-volver"
              disabled={cargando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="boton-publicar"
              disabled={cargando}
            >
              {cargando ? "Enviando Solicitud..." : "Solicitar Edición"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarPublicacionModal;
