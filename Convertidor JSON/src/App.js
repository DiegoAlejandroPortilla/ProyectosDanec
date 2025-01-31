import React, { useState } from "react";
import { Tabs, Tab, Box } from "@mui/material";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import ExcelToJsonConverter from "./ExcelToJsonConverter";
import AnotherTransformation from "./AnotherTransformation";
import GestionVendedores from "./GestionVendedores";
import "./App.css"; // Asegúrate de que los estilos estén aquí

function App() {
  const [tabIndex, setTabIndex] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  const renderContent = () => {
    if (tabIndex === 0) return <ExcelToJsonConverter />;
    if (tabIndex === 1) return <AnotherTransformation />;
    if (tabIndex === 2) return <GestionVendedores />;
    return null;
  };

  return (
    <div>
      <Box
        sx={{
          "& .MuiTabs-flexContainer": { justifyContent: "center" },
          "& .MuiTab-root": { fontSize: "1rem", fontWeight: "bold" },
        }}
      >
        <Tabs value={tabIndex} onChange={handleTabChange}>
          <Tab label="Embarques" />
          <Tab label="Cartera  " />
          <Tab label="Extracción Datos Vendedor  " />
        </Tabs>
      </Box>
      <TransitionGroup component={null}>
        <CSSTransition
          key={tabIndex}
          timeout={300}
          classNames="tab-content"
          unmountOnExit
        >
          <div className="tab-content-wrapper">{renderContent()}</div>
        </CSSTransition>
      </TransitionGroup>
    </div>
  );
}

export default App;
