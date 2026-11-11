import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from "swiper/modules";
import 'swiper/css'
import "swiper/css/navigation";
import "swiper/css/pagination";

export const Slider = ({ publicacion }) => {
    const imagenes = publicacion?.adjunto ?? [];
  const [zoomedImg, setZoomedImg] = useState(null);

  const abrirZoom = (img) => setZoomedImg(img);
  const cerrarZoom = () => setZoomedImg(null);

  if (imagenes.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto h-64 bg-blue-900 rounded-lg flex items-center justify-center">
        <p className="text-white">No hay imágenes disponibles</p>
      </div>
    );
  }

  // Configuración condicional basada en la cantidad de imágenes
  const configSwiper = {
    spaceBetween: 10,
    slidesPerView: 1,
    loop: imagenes.length > 1, // Solo loop si hay más de 1 imagen
    modules: [Navigation, Pagination],
    navigation: imagenes.length > 1, // Solo navegación si hay más de 1 imagen
    pagination: imagenes.length > 1 ? { clickable: true } : false, // Solo paginación si hay más de 1 imagen
  };

  return (
    <div className="w-full max-w-md mx-auto h-64 relative">
      {imagenes.length === 1 ? (
        // Renderizado simple para una sola imagen
        <div className="w-full h-64">
          <img
            src={imagenes[0].url ?? "/notFound.jpg"}
            alt={publicacion.titulo}
            className="w-full h-full object-cover rounded-lg shadow-lg cursor-pointer"
            onClick={() => abrirZoom(imagenes[0].url)}
          />
        </div>
      ) : (
        // Swiper para múltiples imágenes
        <Swiper {...configSwiper}>
          {imagenes.map((img, idx) => (
            <SwiperSlide key={idx}>
              <img
                src={img.url ?? "/notFound.jpg"}
                alt={publicacion.titulo}
                className="w-full h-64 object-cover rounded-lg shadow-lg cursor-pointer"
                onClick={() => abrirZoom(img.url)}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      )}

      {/* Estilos solo para cuando hay múltiples imágenes */}
      {imagenes.length > 1 && (
        <style>{`
          .swiper-pagination-bullet {
            background-color: white;
            opacity: 0.6;
          }
          .swiper-pagination-bullet-active {
            background-color: white;
            opacity: 1;
          }
          .swiper-button-next,
          .swiper-button-prev {
            color: white;
          }
        `}</style>
      )}

      {/* Modal de zoom: la imagen se muestra completa, ajustada a la pantalla */}
      {zoomedImg && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-2"
          onClick={cerrarZoom}
        >
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute top-3 right-4 text-white text-4xl leading-none"
            onClick={cerrarZoom}
          >
            ×
          </button>
          <img
            src={zoomedImg}
            alt="Imagen ampliada"
            className="max-w-[96vw] max-h-[94vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default Slider;