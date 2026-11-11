import { verifySingleFile, acceptAttr } from '../utils/fileValidation';
import { useState } from "react";
import { toast } from "react-hot-toast"
import { useAuth } from './context/AuthContext';
import { TiraPublicidad } from "./PublicidadBanner";

const TITULO_MAX = 80;

// <input type="date"> necesita "YYYY-MM-DD"; las fechas se guardan como medianoche UTC
const aInputFecha = (fecha) =>
    fecha ? new Date(fecha).toISOString().slice(0, 10) : "";

const inputClase = "w-full px-4 py-2 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";

const PublicidadModal = ({
    onClose,
    onSubmit,
    publicidad = null, // si viene con datos esta editando
}) => {
    const { user } = useAuth();
    const [imagen, setImagen] = useState(publicidad?.imagen ?? "");
    const [preview, setPreview] = useState(publicidad?.imagen ?? "");
    const [titulo, setTitulo] = useState(publicidad?.titulo ?? "");
    const [descripcion, setDescripcion] = useState(publicidad?.descripcion ?? "");
    const [fechaInicioEvento, setFechaInicioEvento] = useState(aInputFecha(publicidad?.fechaInicioEvento));
    const [fechaFinEvento, setFechaFinEvento] = useState(aInputFecha(publicidad?.fechaFinEvento));
    const [fechaCaducidad, setFechaCaducidad] = useState(aInputFecha(publicidad?.fechaCaducidad));
    const [autor, setAutor] = useState(publicidad?.autor ?? user?._id ?? "");
    const [activa, setActiva] = useState(publicidad?.activa ?? true);
    const [publicacionRelacionada, setPublicacionRelacionada] = useState(publicidad?.publicacionRelacionada ?? "");
    const modoCrear = (publicidad == null);

    const handleImageChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!(await verifySingleFile(file, "images"))) { e.target.value = ""; return; }
        setImagen(file);
        const localPreview = URL.createObjectURL(file);
        setPreview(localPreview);
    };

    const handleSubmit = () => {
        if (!titulo.trim()) {
            toast.error("El título es obligatorio");
            return;
        }

        if (!descripcion.trim()) {
            toast.error(
                "La descripción es obligatoria"
            );
            return;
        }

        if (fechaFinEvento && !fechaInicioEvento) {
            toast.error("Si indica una fecha de fin, también debe indicar la de inicio");
            return;
        }

        // Comparar "YYYY-MM-DD" como texto funciona porque el formato es fijo
        if (fechaInicioEvento && fechaFinEvento && fechaFinEvento < fechaInicioEvento) {
            toast.error("La fecha de fin no puede ser anterior a la de inicio");
            return;
        }

        if (!fechaCaducidad) {
            toast.error(
                "La fecha de caducidad es obligatoria"
            );
            return;
        }

        if (!autor.trim()) {
            toast.error(
                "El autor es obligatorio"
            );
            return;
        }

        if (modoCrear && !(imagen instanceof File)) {
            toast.error(
                "La imagen es obligatoria"
            );
            return;
        }

        onSubmit({
            imagen,
            titulo: titulo.trim(),
            descripcion: descripcion.trim(),
            fechaInicioEvento,
            fechaFinEvento,
            fechaCaducidad,
            autor: autor.trim(),
            activa,
            publicacionRelacionada,
        });
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              {modoCrear ? "Nueva publicidad" : "Editar publicidad"}
            </h3>

        {/* Vista previa en vivo */}
        <div className="mb-6">
            <p className="block text-sm font-medium text-gray-700 mb-2">Vista previa</p>
            <TiraPublicidad
                publicidad={{
                    imagen: preview,
                    titulo: titulo || "Título de la publicidad",
                    descripcion,
                    fechaInicioEvento: fechaInicioEvento || null,
                    fechaFinEvento: fechaFinEvento || null,
                }}
            />
        </div>
    
        {/*Imagen*/}
        <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Imagen</label>
              <p className="text-xs text-gray-500 mb-2">
                Recomendado: imagen cuadrada de al menos 600×600 px. En la tira se muestra
                como miniatura y al abrirla se ve completa.
              </p>
              <input
                type="file"
                accept={acceptAttr('images')}
                onChange={handleImageChange}
                className="campo-input"
              />
        </div>

        {/* Título */}
        <div className="mb-6">
            <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Título</label>
                <span className={`text-xs ${titulo.length > TITULO_MAX - 10 ? "text-orange-600" : "text-gray-500"}`}>
                    {titulo.length}/{TITULO_MAX}
                </span>
            </div>
            <input
                type="text"
                value={titulo}
                maxLength={TITULO_MAX}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Festival Ambiental Piedras Blancas de Osa"
                className={inputClase}
            />
        </div>
     
         {/* Descripción */}
         <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
            </label>
            <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={4}
                placeholder="Se muestra completa al abrir la publicidad"
                className={`${inputClase} resize-y`}
            />
         </div>

        {/* Fechas visibles (opcionales) */}
        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Fechas a mostrar <span className="font-normal text-gray-500">(opcional)</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">
                Las ve el público, por ejemplo las fechas del evento. Deje la de fin vacía si es un solo día.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                    type="date"
                    value={fechaInicioEvento}
                    onChange={(e) => setFechaInicioEvento(e.target.value)}
                    aria-label="Fecha de inicio"
                    className={inputClase}
                />
                <input
                    type="date"
                    value={fechaFinEvento}
                    min={fechaInicioEvento || undefined}
                    onChange={(e) => setFechaFinEvento(e.target.value)}
                    aria-label="Fecha de fin"
                    className={inputClase}
                />
            </div>
        </div>

        {/* Fecha de caducidad */}
        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de caducidad
            </label>
            <p className="text-xs text-gray-500 mb-2">
                Ese día la publicidad se retira automáticamente. Solo la ven los administradores.
            </p>
            <input
                type="date"
                value={fechaCaducidad}
                onChange={(e) => setFechaCaducidad(e.target.value)}
                className={inputClase}
            />
        </div>

        {/*
        <div className="mb-8 flex items-center gap-3">
            <input
                type="checkbox"
                checked={activa}
                onChange={(e) =>
                    setActiva(e.target.checked)
                }
                className="w-4 h-4"
            />
            <label className="text-gray-700">
                Publicidad activa
            </label>
        </div>*/}


        {/*BOTONES*/}
            <div className="flex justify-end space-x-2">
              <button
                onClick={onClose}
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                {modoCrear ? "Crear" : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
    );
}

export default PublicidadModal;
