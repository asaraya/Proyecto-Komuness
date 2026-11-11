import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { API_URL } from "../utils/api";
import {
  createEmptySurvey,
  normalizeSurveyPayload,
} from "../utils/onboardingSurvey";
import { useAuth } from "./context/AuthContext";
import EncuestaInicioFields from "./EncuestaInicioFields";

const shouldShowEncuestaInicio = (user) => {
  if (!user?._id) return false;
  return !user.encuestaInicio?.completada;
};

const EncuestaInicioModal = () => {
  const { user, updateUser, cargando } = useAuth();
  const [survey, setSurvey] = useState(createEmptySurvey);
  const [saving, setSaving] = useState(false);
  const [completedUserId, setCompletedUserId] = useState(null);

  const visible = useMemo(
    () =>
      !cargando &&
      user?._id !== completedUserId &&
      shouldShowEncuestaInicio(user),
    [cargando, completedUserId, user],
  );

  useEffect(() => {
    if (user?._id !== completedUserId) {
      setCompletedUserId(null);
    }
  }, [completedUserId, user?._id]);

  useEffect(() => {
    if (!visible) return;

    setSurvey({
      ...createEmptySurvey(),
      ...(user?.encuestaInicio || {}),
      etiquetas: Array.isArray(user?.encuestaInicio?.etiquetas)
        ? user.encuestaInicio.etiquetas
        : [],
      ubicacion: user?.encuestaInicio?.ubicacion || null,
    });
  }, [visible, user]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user?._id || saving) return;

    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/usuario/${user._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          encuestaInicio: normalizeSurveyPayload(survey),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "No se pudo guardar la encuesta");
      }

      const encuestaInicio = {
        ...normalizeSurveyPayload(survey),
        completada: true,
        completadaEn: new Date().toISOString(),
      };
      const updatedUser = data.data || data.user || data;

      updateUser({
        ...user,
        ...updatedUser,
        encuestaInicio: updatedUser?.encuestaInicio || encuestaInicio,
      });
      setCompletedUserId(user._id);
      toast.success("Preferencias guardadas");
    } catch (error) {
      toast.error(error.message || "Error al guardar la encuesta");
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#12143d] text-[#f0f0f0] shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-7">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#ffbf30]">
              Personaliza tu experiencia
            </h2>
            <p className="text-sm sm:text-base text-gray-200">
              Completa esta encuesta para filtrar mejor eventos,
              emprendimientos y publicaciones según tus intereses.
            </p>
          </div>

          <EncuestaInicioFields value={survey} onChange={setSurvey} />

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-[#ffbf30] py-3 text-base sm:text-lg font-bold text-[#12141a] transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar preferencias"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EncuestaInicioModal;
