const LimitePublicaciones = ({limiteData, navBar = true}) => {
 return (
        <div className="">
            
            <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-200 mx-2">Publicaciones</span>
                <span className="font-semibold text-white">
                {limiteData.publicacionesActuales} / {limiteData.limite}
                </span>
            </div>
            
            <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <div
                className={`h-full transition-all duration-500 ${
                    (limiteData.publicacionesActuales / limiteData.limite) * 100 >= 100
                    ? "bg-red-500"
                    : (limiteData.publicacionesActuales / limiteData.limite) * 100 >= 80
                    ? "bg-yellow-500"
                    : "bg-blue-500"
                }`}
                style={{
                    width: `${Math.min(
                    (limiteData.publicacionesActuales / limiteData.limite) * 100,
                    100
                    )}%`,
                }}
                ></div>
            </div>

            {!navBar && (
            <p className="text-xs text-gray-300 mt-1">
                {limiteData.publicacionesActuales > limiteData.limite
                ? "¡Has alcanzado tu límite!"
                : `${
                    limiteData.limite - limiteData.publicacionesActuales
                    } publicaciones disponibles`}
            </p>
            )}
        </div>
  );
};
export default LimitePublicaciones;