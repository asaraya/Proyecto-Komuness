import { verifySingleFile, acceptAttr } from '../utils/fileValidation';
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  FiCheck,
  FiEdit3,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
  FiUpload,
  FiX,
} from "react-icons/fi";
import { API_URL } from "../utils/api";
import { DEFAULT_THEME, useTheme } from "./context/ThemeContext";
import "../CSS/adminModales.css";

const COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
const MAX_INLINE_THEME_IMAGE_BYTES = 2 * 1024 * 1024;

const COLOR_FIELDS = [
  { key: "siteBackgroundColor", label: "Color de fondo del sitio" },
  { key: "navbarBackgroundColor", label: "Color de navbar" },
  { key: "navbarTextColor", label: "Texto de navbar" },
  { key: "navbarActiveBackgroundColor", label: "Fondo opción activa navbar" },
  { key: "navbarActiveTextColor", label: "Texto opción activa navbar" },
  { key: "cardBackgroundColor", label: "Color de cartas" },
  { key: "cardTextColor", label: "Texto principal de cartas" },
  { key: "cardSecondaryTextColor", label: "Texto secundario de cartas" },
  { key: "cardBorderColor", label: "Borde de cartas" },
];

const sanitizeColor = (value, fallback) =>
  typeof value === "string" && COLOR_REGEX.test(value.trim())
    ? value.trim()
    : fallback;

const sanitizeBoolean = (value, fallback) =>
  typeof value === "boolean" ? value : fallback;

const sanitizeImage = (value, fallback) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : "";
};

const normalizeTheme = (themeRaw = {}, fallback = DEFAULT_THEME) => ({
  siteBackgroundColorEnabled: sanitizeBoolean(
    themeRaw.siteBackgroundColorEnabled,
    fallback.siteBackgroundColorEnabled,
  ),
  siteBackgroundColor: sanitizeColor(
    themeRaw.siteBackgroundColor,
    fallback.siteBackgroundColor,
  ),
  siteBackgroundImageUrl: sanitizeImage(
    themeRaw.siteBackgroundImageUrl,
    fallback.siteBackgroundImageUrl,
  ),
  navbarBackgroundColor: sanitizeColor(
    themeRaw.navbarBackgroundColor,
    fallback.navbarBackgroundColor,
  ),
  navbarTextColor: sanitizeColor(themeRaw.navbarTextColor, fallback.navbarTextColor),
  navbarActiveBackgroundColor: sanitizeColor(
    themeRaw.navbarActiveBackgroundColor,
    fallback.navbarActiveBackgroundColor,
  ),
  navbarActiveTextColor: sanitizeColor(
    themeRaw.navbarActiveTextColor,
    fallback.navbarActiveTextColor,
  ),
  cardBackgroundColor: sanitizeColor(
    themeRaw.cardBackgroundColor,
    fallback.cardBackgroundColor,
  ),
  cardTextColor: sanitizeColor(themeRaw.cardTextColor, fallback.cardTextColor),
  cardSecondaryTextColor: sanitizeColor(
    themeRaw.cardSecondaryTextColor,
    fallback.cardSecondaryTextColor,
  ),
  cardBorderColor: sanitizeColor(themeRaw.cardBorderColor, fallback.cardBorderColor),
});

const createScheduleDraft = (baseTheme) => ({
  id: "",
  nombre: "",
  descripcion: "",
  fechaInicio: "",
  fechaFin: "",
  activo: true,
  prioridad: 100,
  tema: normalizeTheme(baseTheme, DEFAULT_THEME),
});

const normalizeSchedule = (item, fallbackTheme) => {
  const temaNormalizado = normalizeTheme(item?.tema || {}, fallbackTheme);
  return {
    id: item?.id || `tema-${Date.now()}`,
    nombre: item?.nombre || "Tema programado",
    descripcion: item?.descripcion || "",
    fechaInicio: item?.fechaInicio || "",
    fechaFin: item?.fechaFin || item?.fechaInicio || "",
    activo: item?.activo !== false,
    prioridad: Number.isFinite(Number(item?.prioridad))
      ? Number(item.prioridad)
      : 0,
    tema: temaNormalizado,
  };
};

const formatDateRange = (start, end) =>
  start && end && start !== end ? `${start} a ${end}` : start || "Sin fecha";

const getSnapshot = (programadas) =>
  JSON.stringify({
    programadas: [...programadas].sort((a, b) => a.id.localeCompare(b.id)),
  });

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."));
    reader.readAsDataURL(file);
  });

const ModalConfiguracionTematica = ({ isOpen, onClose }) => {
  const { reloadTheme, activeSchedule, date, timezone } = useTheme();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [baseTheme, setBaseTheme] = useState(DEFAULT_THEME);
  const [programadas, setProgramadas] = useState([]);
  const [scheduleDraft, setScheduleDraft] = useState(createScheduleDraft(DEFAULT_THEME));
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [snapshotInicial, setSnapshotInicial] = useState("");
  const [uploadingScheduleImage, setUploadingScheduleImage] = useState(false);

  const currentSnapshot = useMemo(() => getSnapshot(programadas), [programadas]);
  const hasChanges = currentSnapshot !== snapshotInicial;
  const previewTheme = useMemo(
    () => normalizeTheme(scheduleDraft.tema, baseTheme),
    [scheduleDraft.tema, baseTheme],
  );

  const sortedProgramadas = useMemo(
    () =>
      [...programadas].sort((a, b) => {
        if (a.fechaInicio === b.fechaInicio) return b.prioridad - a.prioridad;
        return a.fechaInicio.localeCompare(b.fechaInicio);
      }),
    [programadas],
  );

  const resetDraft = (theme) => {
    setScheduleDraft(createScheduleDraft(theme));
    setEditingScheduleId(null);
  };

  const hydrateFromConfig = (config) => {
    const normalizedBase = normalizeTheme(config?.base || {}, DEFAULT_THEME);
    const normalizedSchedules = Array.isArray(config?.programadas)
      ? config.programadas.map((item) => normalizeSchedule(item, normalizedBase))
      : [];

    setBaseTheme(normalizedBase);
    setProgramadas(normalizedSchedules);
    resetDraft(normalizedBase);
    setSnapshotInicial(getSnapshot(normalizedSchedules));
  };

  const loadTematica = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Debes iniciar sesión para configurar la temática.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/configuracion/tematica/admin`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "No se pudo cargar la temática");
      }

      hydrateFromConfig(payload?.data?.config || {});
    } catch (error) {
      console.error("Error al cargar temática:", error);
      toast.error(error.message || "Error al cargar temática");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadTematica();
  }, [isOpen]);

  const uploadBackgroundImage = async (file) => {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Debes iniciar sesión para subir la imagen.");
    }

    if (!file) {
      throw new Error("No se seleccionó ninguna imagen.");
    }

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`${API_URL}/configuracion/tematica/background`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const payload = await response.json().catch(() => null);
    if (response.ok && payload?.success) {
      return payload?.data?.imageUrl || "";
    }

    // Fallback: si la ruta de upload no existe en el backend actual,
    if (response.status === 404) {
      if (file.size > MAX_INLINE_THEME_IMAGE_BYTES) {
        throw new Error(
          "Tu servidor no tiene activa la ruta de subida de fondo y la imagen es muy grande. Usa una imagen menor a 2MB o reinicia backend.",
        );
      }

      const inlineDataUrl = await fileToDataUrl(file);
      return typeof inlineDataUrl === "string" ? inlineDataUrl : "";
    }

    throw new Error(
      payload?.message ||
        `No se pudo subir la imagen de fondo (HTTP ${response.status}).`,
    );
  };

  const handleScheduleBackgroundUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!(await verifySingleFile(file, "images"))) return;

    setUploadingScheduleImage(true);
    try {
      const imageUrl = await uploadBackgroundImage(file);
      if (!imageUrl) {
        throw new Error("No se obtuvo URL de imagen luego de subir el archivo.");
      }
      setScheduleDraft((prev) => ({
        ...prev,
        tema: {
          ...prev.tema,
          siteBackgroundImageUrl: imageUrl,
        },
      }));
      toast.success("Imagen para tema programado actualizada.");
    } catch (error) {
      console.error("Error al subir imagen de tema programado:", error);
      toast.error(error.message || "No se pudo subir la imagen.");
    } finally {
      setUploadingScheduleImage(false);
    }
  };

  const handleSaveSchedule = () => {
    const nombre = scheduleDraft.nombre.trim();
    const fechaInicio = scheduleDraft.fechaInicio;
    const fechaFin = scheduleDraft.fechaFin || fechaInicio;

    if (!nombre) {
      toast.error("El nombre del tema programado es obligatorio.");
      return;
    }

    if (!fechaInicio) {
      toast.error("La fecha de inicio es obligatoria.");
      return;
    }

    if (fechaFin < fechaInicio) {
      toast.error("La fecha fin no puede ser menor a la fecha inicio.");
      return;
    }

    const normalized = normalizeSchedule(
      {
        ...scheduleDraft,
        nombre,
        fechaInicio,
        fechaFin,
        id:
          editingScheduleId ||
          `tema-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      },
      baseTheme,
    );

    if (editingScheduleId) {
      setProgramadas((prev) =>
        prev.map((item) => (item.id === editingScheduleId ? normalized : item)),
      );
      toast.success("Tema programado actualizado.");
    } else {
      setProgramadas((prev) => [...prev, normalized]);
      toast.success("Tema programado agregado.");
    }

    resetDraft(baseTheme);
  };

  const handleEditSchedule = (schedule) => {
    setEditingScheduleId(schedule.id);
    setScheduleDraft({
      ...schedule,
      tema: normalizeTheme(schedule.tema, baseTheme),
    });
  };

  const handleRemoveSchedule = (schedule) => {
    if (!window.confirm(`¿Eliminar "${schedule.nombre}"?`)) return;
    setProgramadas((prev) => prev.filter((item) => item.id !== schedule.id));
    if (editingScheduleId === schedule.id) {
      resetDraft(baseTheme);
    }
  };

  const handleSaveAll = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Debes iniciar sesión para guardar la temática.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/configuracion/tematica`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          programadas: programadas.map((item) => ({
            id: item.id,
            nombre: item.nombre,
            descripcion: item.descripcion,
            fechaInicio: item.fechaInicio,
            fechaFin: item.fechaFin,
            activo: item.activo,
            prioridad: Number(item.prioridad) || 0,
            tema: normalizeTheme(item.tema, baseTheme),
          })),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "No se pudo guardar la temática");
      }

      hydrateFromConfig(payload?.data?.config || {});
      await reloadTheme();
      toast.success("Temática guardada correctamente.");
    } catch (error) {
      console.error("Error al guardar temática:", error);
      toast.error(error.message || "Error al guardar temática");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      const proceed = window.confirm(
        "Tienes cambios sin guardar. ¿Deseas cerrar y descartarlos?",
      );
      if (!proceed) return;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="kw-admin-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Temática del Sitio</h2>
            <p className="text-sm text-gray-500">
              Programa temas por fecha especial. El tema base queda fijo.
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-36 bg-gray-200 rounded-lg"></div>
              <div className="h-52 bg-gray-200 rounded-lg"></div>
            </div>
                    ) : (
            <>
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Editor de temas programados por fecha
                    </h3>
                    <p className="text-sm text-gray-600">
                      Configura cada tema por rango de fechas; se activa y desactiva automaticamente.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => resetDraft(baseTheme)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <FiRefreshCw />
                    Limpiar formulario
                  </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                          Nombre del tema
                        </label>
                        <input
                          type="text"
                          value={scheduleDraft.nombre}
                          onChange={(event) =>
                            setScheduleDraft((prev) => ({
                              ...prev,
                              nombre: event.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-800"
                          placeholder="Ej: Independencia CR"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                          Prioridad
                        </label>
                        <input
                          type="number"
                          value={scheduleDraft.prioridad}
                          onChange={(event) =>
                            setScheduleDraft((prev) => ({
                              ...prev,
                              prioridad: Number(event.target.value) || 0,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                        Descripción (opcional)
                      </label>
                      <textarea
                        rows={2}
                        value={scheduleDraft.descripcion}
                        onChange={(event) =>
                          setScheduleDraft((prev) => ({
                            ...prev,
                            descripcion: event.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-800"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                          Fecha inicio
                        </label>
                        <input
                          type="date"
                          value={scheduleDraft.fechaInicio}
                          onChange={(event) =>
                            setScheduleDraft((prev) => ({
                              ...prev,
                              fechaInicio: event.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                          Fecha fin (opcional)
                        </label>
                        <input
                          type="date"
                          value={scheduleDraft.fechaFin}
                          onChange={(event) =>
                            setScheduleDraft((prev) => ({
                              ...prev,
                              fechaFin: event.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-800"
                        />
                      </div>
                    </div>

                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={scheduleDraft.activo}
                        onChange={(event) =>
                          setScheduleDraft((prev) => ({
                            ...prev,
                            activo: event.target.checked,
                          }))
                        }
                      />
                      Activo
                    </label>

                    <details className="border border-gray-200 rounded-md p-3">
                      <summary className="cursor-pointer text-sm font-semibold text-gray-700">
                        Colores de este tema programado
                      </summary>
                      <div className="space-y-2 mt-3">
                        <div>
                          <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                            Imagen de fondo del evento (subir foto)
                          </label>
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                              <FiUpload size={14} />
                              Seleccionar imagen
                              <input
                                type="file"
                                accept={acceptAttr("images")}
                                className="hidden"
                                onChange={handleScheduleBackgroundUpload}
                                disabled={uploadingScheduleImage}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setScheduleDraft((prev) => ({
                                  ...prev,
                                  tema: {
                                    ...prev.tema,
                                    siteBackgroundImageUrl: "",
                                  },
                                }))
                              }
                              className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                            >
                              Quitar imagen
                            </button>
                            {uploadingScheduleImage && (
                              <span className="text-xs text-blue-600">Subiendo imagen...</span>
                            )}
                          </div>
                          {scheduleDraft.tema.siteBackgroundImageUrl ? (
                            <div className="mt-2 rounded-md border border-gray-200 overflow-hidden">
                              <img
                                src={scheduleDraft.tema.siteBackgroundImageUrl}
                                alt="Vista previa fondo del evento"
                                className="w-full h-24 object-cover"
                              />
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-gray-500">
                              Sin imagen específica. Se hereda la imagen del tema base.
                            </p>
                          )}
                        </div>

                        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={scheduleDraft.tema.siteBackgroundColorEnabled}
                            onChange={(event) =>
                              setScheduleDraft((prev) => ({
                                ...prev,
                                tema: {
                                  ...prev.tema,
                                  siteBackgroundColorEnabled: event.target.checked,
                                },
                              }))
                            }
                          />
                          Usar color de fondo en este tema
                        </label>

                        {COLOR_FIELDS.map((field) => (
                          <div
                            key={`scheduled-${field.key}`}
                            className="grid grid-cols-[1fr_auto_auto] gap-2"
                          >
                            <label className="text-xs font-semibold uppercase text-gray-600 self-center">
                              {field.label}
                            </label>
                            <input
                              type="color"
                              value={scheduleDraft.tema[field.key]}
                              onChange={(event) =>
                                setScheduleDraft((prev) => ({
                                  ...prev,
                                  tema: {
                                    ...prev.tema,
                                    [field.key]: event.target.value.toUpperCase(),
                                  },
                                }))
                              }
                              disabled={
                                field.key === "siteBackgroundColor" &&
                                !scheduleDraft.tema.siteBackgroundColorEnabled
                              }
                              className="h-10 w-14 p-1 border border-gray-300 rounded"
                            />
                            <input
                              type="text"
                              value={scheduleDraft.tema[field.key]}
                              onChange={(event) =>
                                setScheduleDraft((prev) => ({
                                  ...prev,
                                  tema: {
                                    ...prev.tema,
                                    [field.key]: event.target.value.toUpperCase(),
                                  },
                                }))
                              }
                              disabled={
                                field.key === "siteBackgroundColor" &&
                                !scheduleDraft.tema.siteBackgroundColorEnabled
                              }
                              className="w-28 px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 disabled:bg-gray-100 disabled:text-gray-400"
                            />
                          </div>
                        ))}
                      </div>
                    </details>

                    <button
                      type="button"
                      onClick={handleSaveSchedule}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
                    >
                      {editingScheduleId ? <FiEdit3 /> : <FiPlus />}
                      {editingScheduleId ? "Actualizar tema programado" : "Agregar tema programado"}
                    </button>
                  </div>

                  <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                    <h4 className="text-base font-semibold text-gray-800 mb-2">Vista previa</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Esta vista refleja el tema por fecha que estas editando ahora.
                    </p>
                    <div
                      className="rounded-lg overflow-hidden border"
                      style={{
                        borderColor: previewTheme.cardBorderColor,
                        backgroundColor: previewTheme.siteBackgroundColorEnabled
                          ? previewTheme.siteBackgroundColor
                          : "transparent",
                        backgroundImage: previewTheme.siteBackgroundImageUrl
                          ? `url("${previewTheme.siteBackgroundImageUrl}")`
                          : "none",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      <div
                        className="px-4 py-3 text-sm font-semibold"
                        style={{
                          backgroundColor: previewTheme.navbarBackgroundColor,
                          color: previewTheme.navbarTextColor,
                        }}
                      >
                        Navbar de ejemplo
                      </div>
                      <div className="p-4 space-y-3">
                        <button
                          type="button"
                          className="px-3 py-1 rounded text-xs font-semibold"
                          style={{
                            backgroundColor: previewTheme.navbarActiveBackgroundColor,
                            color: previewTheme.navbarActiveTextColor,
                          }}
                        >
                          Opción activa
                        </button>
                        <div
                          className="rounded-lg border p-3"
                          style={{
                            backgroundColor: previewTheme.cardBackgroundColor,
                            borderColor: previewTheme.cardBorderColor,
                          }}
                        >
                          <p className="font-semibold text-sm" style={{ color: previewTheme.cardTextColor }}>
                            Carta de publicación
                          </p>
                          <p className="text-xs mt-1" style={{ color: previewTheme.cardSecondaryTextColor }}>
                            Texto secundario para fechas y detalles.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-gray-500">
                      <p>
                        Tema activo hoy ({date || "sin fecha"} - {" "}
                        {timezone || "America/Costa_Rica"}):
                      </p>
                      <p className="font-semibold text-gray-700 mt-1">
                        {activeSchedule?.nombre || "Tema predeterminado"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-base font-semibold text-gray-800 mb-3">Temas programados</h4>
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {sortedProgramadas.length === 0 && (
                      <div className="border border-dashed border-gray-300 rounded-lg p-6 text-sm text-gray-500 text-center">
                        Aún no hay temas programados.
                      </div>
                    )}
                    {sortedProgramadas.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-gray-800">{item.nombre}</p>
                            <p className="text-xs text-gray-600">{formatDateRange(item.fechaInicio, item.fechaFin)}</p>
                            {item.descripcion ? <p className="text-xs text-gray-500 mt-1">{item.descripcion}</p> : null}
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${item.activo ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>
                            {item.activo ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <button type="button" onClick={() => handleEditSchedule(item)} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">
                            <FiEdit3 size={13} />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setProgramadas((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, activo: !entry.activo } : entry))}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-600 text-white rounded text-xs hover:bg-amber-700"
                          >
                            {item.activo ? "Desactivar" : "Activar"}
                          </button>
                          <button type="button" onClick={() => handleRemoveSchedule(item)} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 text-white rounded text-xs hover:bg-rose-700">
                            <FiTrash2 size={13} />
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="px-5 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving || !hasChanges}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiCheck />
            {saving ? "Guardando..." : "Guardar temática"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalConfiguracionTematica;