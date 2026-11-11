import { useLocation, useNavigate } from "react-router-dom";

export const PriceFilter = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);

  const precioMin = searchParams.get("precioMin") || "";
  const precioMax = searchParams.get("precioMax") || "";

  const updatePrice = (tipo, valor) => {
    if (valor) {
      searchParams.set(tipo, valor);
      if (
        tipo === "precioMin" &&
        valor > Number(searchParams.get("precioMax"))
      ) {
        searchParams.set("precioMax", valor);
      }
      if (
        tipo === "precioMax" &&
        valor < Number(searchParams.get("precioMin"))
      ) {
        searchParams.set("precioMin", valor);
      }
    } else {
      searchParams.delete(tipo);
    }

    navigate(`${location.pathname}?${searchParams.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 min-w-0">
      <label className="hidden sm:inline text-yellow-400 font-bold text-sm whitespace-nowrap">
        Precio
      </label>

      <input
        type="number"
        min="0"
        placeholder="Min"
        value={precioMin}
        onChange={(e) => updatePrice("precioMin", e.target.value)}
        className=" w-[80px] bg-blue-900 text-gray-50 text-sm border border-gray-300
        rounded p-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 "
      />

      <span className="text-white">—</span>

      <input
        className=" w-[80px] bg-blue-900 text-gray-50 text-sm border border-gray-300
        rounde p-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        type="number"
        min="0"
        placeholder="Max"
        value={precioMax}
        onChange={(e) => updatePrice("precioMax", e.target.value)}
      />
    </div>
  );
};

export default PriceFilter;
