// components/categoriaSelector.js
import { useState, useEffect } from 'react';
import { API_URL } from '../utils/api';

export const CategoriaSelector = ({ selectedCategoria, onCategoriaChange, required = false }) => {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        
        const response = await fetch(`${API_URL}/categorias`);
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
       
        setCategorias(data.data || []);
        setError(null);
      } catch (error) {
        console.error('Error al cargar categorías:', error);
        setError('No se pudieron cargar las categorías. Verifica la conexión.');
      } finally {
        setLoading(false);
      }
    };

    fetchCategorias();
  }, []);

  if (loading) {
    return <div className="p-2 border rounded bg-gray-100">Cargando categorías...</div>;
  }

  if (error) {
    return (
      <div className="p-2 border rounded bg-red-100 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <select
      name="categoria"
      value={selectedCategoria || ''}
      onChange={onCategoriaChange}
      className="w-full p-2 border rounded"
      required={required}
    >
      <option value="">Selecciona una categoría</option>
      {categorias.map((categoria) => (
        <option key={categoria._id} value={categoria._id}>
          {categoria.nombre.toUpperCase()}
        </option>
      ))}
    </select>
  );
};

export default CategoriaSelector;