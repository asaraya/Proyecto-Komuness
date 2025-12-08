import { useState, useRef } from "react";
import { FaCamera, FaTrash } from "react-icons/fa";
import { BiLoaderAlt } from "react-icons/bi";

const UserProfileAvatar = ({
  currentImage,
  defaultImage = "https://via.placeholder.com/200x200/cccccc/666666?text=Sin+Foto",
  onImageChange,
  onImageDelete,
  size = "medium",
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const sizeClasses = {
    small: "w-16 h-16",
    medium: "w-24 h-24",
    large: "w-32 h-32",
    xlarge: "w-40 h-40"
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Por favor selecciona un archivo de imagen");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen debe ser menor a 5MB");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      await onImageChange(file);
    } catch (err) {
      setError("Error al subir la imagen");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = async () => {
    try {
      setIsLoading(true);
      await onImageDelete();
    } catch (err) {
      setError("Error al eliminar la imagen");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative group">
      <div
        className={`relative ${sizeClasses[size]} rounded-full overflow-hidden transition-transform duration-300 ease-in-out ${isHovered ? "scale-105" : ""} cursor-pointer`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="button"
        tabIndex={0}
        aria-label="Imagen de perfil"
      >
        <img
          src={currentImage ? `${currentImage}?t=${Date.now()}` : defaultImage}
          alt="Perfil de usuario"
          className="w-full h-full object-cover"
          onError={(e) => {
            console.error('Error cargando imagen:', e.target.src);
            e.target.src = defaultImage;
          }}
          onLoad={() => {
            
          }}
          loading="lazy"
        />

        <div
          className={`absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0"}`}
        >
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all duration-300"
              aria-label="Subir nueva imagen"
              title="Subir nueva imagen"
              type="button"
            >
              <FaCamera className="text-white text-lg" />
            </button>
            {currentImage && (
              <button
                onClick={handleDeleteClick}
                className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all duration-300"
                aria-label="Eliminar imagen"
                title="Eliminar imagen"
                type="button"
              >
                <FaTrash className="text-white text-lg" />
              </button>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <BiLoaderAlt className="text-white text-2xl animate-spin" />
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageChange}
        aria-label="Subir imagen de perfil"
      />

      {error && (
        <div
          role="alert"
          className="absolute -bottom-8 left-0 right-0 text-red-500 text-sm text-center bg-red-100 p-1 rounded mt-2"
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default UserProfileAvatar;
