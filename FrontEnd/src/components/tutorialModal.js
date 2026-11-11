import { useState } from "react";
import { toast } from "react-hot-toast"

const TutorialModal = ({
    onClose,
    onSubmit,
    tutorial = null, // si viene con datos esta editando
}) => {
    const [nombre, setNombre] = useState(tutorial?.nombre || "");
    const [url, setUrl] = useState(tutorial?.url || "");
    const [descripcion, setDescripcion] = useState(tutorial?.descripcion || "");

    const modoCrear = (tutorial == null);

    const handleSubmit = () => {
        if (!nombre.trim()){
            toast.error("El nombre del tutorial es obligatorio");
            return;
        }
        onSubmit({nombre: nombre.trim(), url: url.trim(), descripcion: descripcion.trim()});
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-6xl shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              {modoCrear ? "Nuevo tutorial" : "Editar tutorial"}
            </h3>
     
            <p className="text-black text-sm mt-2 text-center">*Nombre del tutorial:</p>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del tutorial"
              className="w-full px-4 py-2 mb-4 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
     
            <p className="text-black text-sm mt-2 text-center">Link al tutorial (opcional, YouTube recomendado):</p>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Link al tutorial (opcional)"
              className="w-full px-4 py-2 mb-4 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
     
            <p className="text-black text-sm mt-2 text-center">Descripción del tutorial (opcional):</p>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción del tutorial (opcional)"
              rows={15}
              className="w-full px-4 py-2 mb-4 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
     
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

export default TutorialModal;
