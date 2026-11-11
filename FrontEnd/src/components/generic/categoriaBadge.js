export const CategoriaBadge = ({ categoria, className = "", mobile = false }) => {
  
  // Clases base responsivas
  const baseClasses = mobile 
    ? "bg-blue-600 text-white px-1.5 py-0.5 rounded-full text-[10px] md:px-2 md:py-1 md:text-xs"
    : "bg-blue-600 text-white text-xs px-2 py-1 rounded-full";

  // Si es null/undefined
  if (!categoria) {
    return (
      <span className={`${baseClasses} ${className}`}>
        SIN CATEGORÍA
      </span>
    );
  }

  // Si es un string (ID) en lugar de objeto populado
  if (typeof categoria === 'string') {
    return (
      <span className={`${baseClasses} ${className}`}>
        ID: {categoria.substring(0, 8)}...
      </span>
    );
  }

  // Si es objeto pero no tiene nombre
  if (categoria._id && !categoria.nombre) {
    return (
      <span className={`${baseClasses} ${className}`}>
        CATEGORÍA SIN NOMBRE
      </span>
    );
  }

  // Si está correctamente populado
  return (
    <span className={`${baseClasses} ${className}`}>
      {categoria.nombre.toUpperCase()}
    </span>
  );
};

export default CategoriaBadge;