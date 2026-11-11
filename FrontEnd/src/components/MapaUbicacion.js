import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../CSS/MapaUbicacion.css';

// Icono por defecto de Leaflet (aquí se usa el de Leaflet)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

export const MapaUbicacion = ({ 
  onLocationSelect,
  initialLocation = null,
  className = ''
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const [ubicacion, setUbicacion] = useState(
    initialLocation || {
      latitude: 9.7489,
      longitude: -83.7534,
      direccion: 'San José, Costa Rica',
      mapLink: 'https://www.openstreetmap.org/?mlat=9.7489&mlon=-83.7534#map=16/9.7489/-83.7534'
    }
  );
  const [direccionManual, setDireccionManual] = useState(ubicacion.direccion || '');
  const [buscando, setBuscando] = useState(false);
  const [detectando, setDetectando] = useState(false);

  // Límites de Costa Rica (aproximados)
  const costaRicaBounds = L.latLngBounds(
    [8.0, -85.9], // Suroeste
    [11.3, -82.5]  // Noreste
  );

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current) return;

    if (map.current === null) {
      map.current = L.map(mapContainer.current, {
        maxBounds: costaRicaBounds,
        maxBoundsViscosity: 1.0
      }).setView(
        [ubicacion.latitude, ubicacion.longitude],
        13
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        minZoom: 8
      }).addTo(map.current);

      // Agregar marcador inicial
      marker.current = L.marker([ubicacion.latitude, ubicacion.longitude], {
        draggable: true,
      }).addTo(map.current).bindPopup(ubicacion.direccion);

      // Evento: arrastar el marcador
      marker.current.on('dragend', () => {
        const { lat, lng } = marker.current.getLatLng();
        actualizarUbicacion(lat, lng, ubicacion.direccion);
      });

      // Evento: hacer clic en el mapa
      map.current.on('click', (e) => {
        const { lat, lng } = e.latlng;
        if (marker.current) {
          map.current.removeLayer(marker.current);
        }
        marker.current = L.marker([lat, lng], { draggable: true })
          .addTo(map.current)
          .bindPopup(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);

        marker.current.on('dragend', () => {
          const { lat, lng } = marker.current.getLatLng();
          actualizarUbicacion(lat, lng, ubicacion.direccion);
        });

        // Obtener dirección desde coordenadas (geocodificación inversa)
        obtenerDireccionDesdeCoord(lat, lng);
      });
    }

    return () => {
      // Cleanup si es necesario
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Actualizar vista del mapa si la ubicación inicial cambia
  useEffect(() => {
    if (map.current && initialLocation) {
      map.current.setView([initialLocation.latitude, initialLocation.longitude], 13);
      if (marker.current) {
        map.current.removeLayer(marker.current);
      }
      marker.current = L.marker([initialLocation.latitude, initialLocation.longitude], {
        draggable: true,
      }).addTo(map.current).bindPopup(initialLocation.direccion);

      marker.current.on('dragend', () => {
        const { lat, lng } = marker.current.getLatLng();
        actualizarUbicacion(lat, lng, initialLocation.direccion);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLocation]);

  const actualizarUbicacion = (lat, lng, direccion) => {
    const nuevaUbicacion = {
      latitude: lat,
      longitude: lng,
      direccion: direccion || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`,
      mapLink: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
    };
    setUbicacion(nuevaUbicacion);
    setDireccionManual(nuevaUbicacion.direccion);
    onLocationSelect(nuevaUbicacion);
  };

  // Obtener dirección desde coordenadas usando Nominatim (OpenStreetMap)
  const obtenerDireccionDesdeCoord = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=16`
      );
      const data = await response.json();
      const direccion = data.address?.road || data.display_name || 
        `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
      
      setDireccionManual(direccion);
      setUbicacion(prev => ({
        ...prev,
        direccion
      }));
      
      if (marker.current) {
        marker.current.setPopupContent(direccion);
      }
      
      onLocationSelect({
        latitude: lat,
        longitude: lng,
        direccion,
        mapLink: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
      });
    } catch (error) {
      console.error('Error al obtener dirección:', error);
    }
  };

  // Buscar dirección y convertir a coordenadas (geocodificación)
  const buscarDireccion = async (e) => {
    // Prevenir comportamiento por defecto (solo aplicable si se llama desde Enter key)
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (!direccionManual.trim()) return;

    setBuscando(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          direccionManual
        )}&format=json&limit=1&countrycodes=cr`
      );
      const data = await response.json();

      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);

        // Actualizar mapa
        map.current.setView([latNum, lonNum], 13);
        if (marker.current) {
          map.current.removeLayer(marker.current);
        }
        marker.current = L.marker([latNum, lonNum], { draggable: true })
          .addTo(map.current)
          .bindPopup(display_name)
          .openPopup();

        marker.current.on('dragend', () => {
          const { lat, lng } = marker.current.getLatLng();
          actualizarUbicacion(lat, lng, display_name);
        });

        actualizarUbicacion(latNum, lonNum, display_name);
      } else {
        alert('No se encontró la dirección. Intenta con otra descripción.');
      }
    } catch (error) {
      console.error('Error al buscar dirección:', error);
      alert('Error al buscar la dirección.');
    } finally {
      setBuscando(false);
    }
  };

  const usarUbicacionActual = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no permite detectar la ubicación automáticamente.');
      return;
    }

    setDetectando(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const lat = coords.latitude;
        const lng = coords.longitude;
        map.current?.setView([lat, lng], 13);

        if (marker.current) {
          map.current.removeLayer(marker.current);
        }

        marker.current = L.marker([lat, lng], { draggable: true })
          .addTo(map.current)
          .bindPopup(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`)
          .openPopup();

        marker.current.on('dragend', () => {
          const { lat: markerLat, lng: markerLng } = marker.current.getLatLng();
          actualizarUbicacion(markerLat, markerLng, ubicacion.direccion);
        });

        obtenerDireccionDesdeCoord(lat, lng).finally(() => setDetectando(false));
      },
      () => {
        setDetectando(false);
        alert('No se pudo detectar tu ubicación. Puedes buscarla o seleccionarla en el mapa.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className={`mapa-ubicacion-container ${className}`}>
      <div className="mapa-seccion-busqueda">
        <h3 className="mapa-titulo">Buscar Ubicación</h3>
        <div className="mapa-busqueda-form">
          <input
            type="text"
            value={direccionManual}
            onChange={(e) => setDireccionManual(e.target.value)}
            placeholder="Ej: Avenida Central, San José, Costa Rica"
            className="mapa-input-busqueda"
            disabled={buscando}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                buscarDireccion(e);
              }
            }}
          />
          <button
            type="button"
            className="mapa-boton-buscar"
            disabled={buscando}
            onClick={buscarDireccion}
          >
            {buscando ? 'Buscando...' : 'Buscar'}
          </button>
          <button
            type="button"
            className="mapa-boton-actual"
            disabled={detectando}
            onClick={usarUbicacionActual}
          >
            {detectando ? 'Detectando...' : 'Usar mi ubicación'}
          </button>
        </div>
        <p className="mapa-ayuda">
          O haz clic en el mapa para seleccionar una ubicación, o arrastra el marcador
        </p>
      </div>

      <div className="mapa-contenedor" ref={mapContainer}></div>

      <div className="mapa-coordenadas">
        <h4 className="mapa-coord-titulo">Ubicación seleccionada:</h4>
        <p className="mapa-coord-item">
          <strong>Latitud:</strong> {ubicacion.latitude.toFixed(4)}
        </p>
        <p className="mapa-coord-item">
          <strong>Longitud:</strong> {ubicacion.longitude.toFixed(4)}
        </p>
        <p className="mapa-coord-item">
          <strong>Dirección:</strong> {ubicacion.direccion}
        </p>
      </div>
    </div>
  );
};

export default MapaUbicacion;
