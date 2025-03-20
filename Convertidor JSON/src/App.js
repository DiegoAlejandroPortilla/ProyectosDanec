import React, { useState, useEffect } from "react";
import { Tabs, Tab, Box, Paper, Typography } from "@mui/material";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import Sidebar from "./components/Sliderbar";
import ExcelToJsonConverter from "./ExcelToJsonConverter";
import GestionVendedores from "./GestionVendedores";
import Grafics from "./Grafics";
import "./App.css"; // Asegúrate de que los estilos estén aquí
import ExcelViewer from "./Graficas/ExcelViewer";
import SeguimientoVendedores from "./SeguimientoVendedores";

function App() {
  const [tabIndex, setTabIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isLandscape, setIsLandscape] = useState(window.matchMedia("(orientation: landscape)").matches);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsLandscape(window.matchMedia("(orientation: landscape)").matches);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  return (
    <div style={{ display: "flex" }}>
      {/* Sidebar colapsable por hover */}
      <Sidebar onSelectTab={setTabIndex} />

      {/* Contenido Principal */}
      <div style={{ flexGrow: 1, padding: "20px", transition: "margin-left 0.3s ease-in-out" }}>
        <Paper elevation={3} sx={{ padding: "20px", borderRadius: "10px" }}>
          <TransitionGroup component={null}>
            <CSSTransition key={tabIndex} timeout={300} classNames="tab-content" unmountOnExit>
              <div className="tab-content-wrapper">
                {/* 🔹 Si el usuario está en "Indicadores" y en modo vertical en móvil, muestra el aviso */}
                {tabIndex === 3 && isMobile && !isLandscape ? (
                  <Typography variant="h5" align="center" color="error">
                    ⚠️ Gira tu dispositivo a posición horizontal para visualizar los indicadores. 📊
                  </Typography>
                ) : (
                  <>
                    {tabIndex === 0 && <SeguimientoVendedores />} {/* Nueva opción */}
                    {tabIndex === 1 && <ExcelToJsonConverter />}
                    {tabIndex === 2 && <GestionVendedores />}
                    {tabIndex === 3 && <Grafics />}
                    {tabIndex === 4 && <ExcelViewer />} {/* Nueva opción */}
                  </>
                )}
              </div>
            </CSSTransition>
          </TransitionGroup>
        </Paper>
      </div>
    </div>
  );
}

export default App;
