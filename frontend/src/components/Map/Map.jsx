// src/components/Map/Map.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  GoogleMap,
  LoadScript,
  Polyline,
  Marker
} from "@react-google-maps/api";
import { Box, Select, MenuItem, Typography } from "@mui/material";
import darkTheme from "../Theme/Theme.jsx";
import config from "../../config";

const API_KEY = config.googleMapsApiKey;
const center  = { lat: 45.657974, lng: 25.601198 };

export default function MyMap() {
  /* ─ state ───────────────────────────── */
  const [routes,        setRoutes]        = useState([]);
  const [selectedRoute, setSelectedRoute] = useState("");
  const [shape,         setShape]         = useState([]);   // puncte traseu
  const [stops,         setStops]         = useState([]);   // staţii
  const [idx,           setIdx]           = useState(0);
  const [forward,       setForward]       = useState(true);

  const animRef = useRef(null); // ↙️  păstrăm intervalul

  /* ─ 1) toate rutele pentru dropdown ─ */
  useEffect(() => {
    fetch("http://localhost:3001/api/routes")
      .then(r => r.json())
      .then(setRoutes)
      .catch(e => console.error("Nu pot încărca rutele:", e));
  }, []);

  /* ─ 2) la schimbare rută: reset + fetch shape&stops ─ */
  useEffect(() => {
    // opreşte animaţia veche
    if (animRef.current) clearInterval(animRef.current);

    // reset vizual
    setShape([]); setStops([]); setIdx(0); setForward(true);

    if (!selectedRoute) return;

    fetch(`http://localhost:3001/api/route/${selectedRoute}`)
      .then(r => r.json())
      .then(({ shapes, stops }) => {
        const path = shapes
          .sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence)
          .map(p => ({ lat: p.shape_pt_lat, lng: p.shape_pt_lon }));
        setShape(path);
        setStops(stops);
      })
      .catch(e => console.error("Nu pot încărca ruta:", e));
  }, [selectedRoute]);

  /* ─ 3) animaţie marker după ce avem shape ─ */
  useEffect(() => {
    if (shape.length === 0) return;

    animRef.current = setInterval(() => {
      setIdx(i => {
        if (forward) {
          if (i < shape.length - 1) return i + 1;
          setForward(false);
          return i - 1;
        } else {
          if (i > 0) return i - 1;
          setForward(true);
          return i + 1;
        }
      });
    }, 500);

    return () => clearInterval(animRef.current);
  }, [shape, forward]);

  /* ─ JSX ───────────────────────────── */
  return (
    <Box display="flex" flexDirection="column" alignItems="center" height="100vh">
      <Typography variant="h6" m={2}>Selectează o rută RATBV</Typography>

      <Select
        value={selectedRoute}
        onChange={e => setSelectedRoute(e.target.value)}
        sx={{ width: 320, mb: 2 }}
      >
        {routes.map(r => (
          <MenuItem key={r.route_id} value={r.route_id}>
            {r.route_short_name} – {r.route_long_name}
          </MenuItem>
        ))}
      </Select>

      <LoadScript googleMapsApiKey={API_KEY}>
        <GoogleMap
          mapContainerStyle={{ width: "80vw", height: "70vh" }}
          center={center}
          zoom={13}
          options={{ styles: darkTheme }}
          key={selectedRoute} // reîncărcăm harta la schimbare rută
        >
          {/* traseul */}
          {shape.length > 0 && (
            <Polyline
              key={`line-${selectedRoute}`}
              path={shape}
              options={{ strokeColor: "#00D1FF", strokeWeight: 4, geodesic: true }}
            />
          )}

          {/* marker animat pentru autobuz */}
          {shape.length > 0 && (
            <Marker
              key={`bus-${selectedRoute}`}
              position={shape[idx]}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: "#00D1FF", // Albastru deschis, similar cu linia traseului
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#1d2c4d", // Culoarea din tema dark pentru contrast
              }}
            />
          )}

          {/* stații */}
          {stops.map(s => (
            <Marker
              key={`${s.stop_id}-${selectedRoute}`}
              position={{ lat: s.stop_lat, lng: s.stop_lon }}
              label={{
                text: s.stop_name,
                color: "#ffffff", // Text alb pentru contrast
                fontSize: "12px",
                fontWeight: "500"
              }}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 6,
                fillColor: "#8ec3b9", // Culoarea text.fill din tema dark
                fillOpacity: 0.9,
                strokeWeight: 2,
                strokeColor: "#1a3646" // Culoarea text.stroke din tema dark
              }}
            />
          ))}
        </GoogleMap>
      </LoadScript>
    </Box>
  );
}
