import { useLocation, useNavigate } from "react-router-dom";

export const DateFilter = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const fechaInicio = searchParams.get("fechaInicio") || "";
  const fechaFin = searchParams.get("fechaFin") || "";

  // Dejar solo "fechaInicio" filtra un día específico; agregar "fechaFin" filtra un rango.
  const updateFecha = (campo, valor) => {
    if (valor) {
      searchParams.set(campo, valor);

      if (
        campo === "fechaInicio" &&
        searchParams.get("fechaFin") &&
        valor > searchParams.get("fechaFin")
      ) {
        searchParams.set("fechaFin", valor);
      }
      if (
        campo === "fechaFin" &&
        searchParams.get("fechaInicio") &&
        valor < searchParams.get("fechaInicio")
      ) {
        searchParams.set("fechaInicio", valor);
      }
    } else {
      searchParams.delete(campo);
    }

    navigate(`${location.pathname}?${searchParams.toString()}`);
  };

  const inputClasses =
    "w-[140px] max-w-full bg-blue-900 text-gray-50 text-sm border " +
    "border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-yellow-400";

  return (
    <div className="flex items-center gap-2 min-w-0">
      <label className="hidden sm:inline text-yellow-400 font-bold text-sm whitespace-nowrap">
        Fecha
      </label>
      <input
        type="date"
        value={fechaInicio}
        onChange={(e) => updateFecha("fechaInicio", e.target.value)}
        title="Fecha (o inicio del rango)"
        className={inputClasses}
      />
      <span className="text-white">—</span>
      <input
        type="date"
        value={fechaFin}
        onChange={(e) => updateFecha("fechaFin", e.target.value)}
        title="Fin del rango (opcional)"
        className={inputClasses}
      />
    </div>
  );
};

export default DateFilter;
