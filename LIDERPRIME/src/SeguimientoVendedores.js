import React from "react";
import { Box, Typography } from "@mui/material";

const SeguimientoVendedores = () => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        textAlign: "center",
        padding: 4,
      }}
    >
        <img src="/LOGOLIDER.png" alt="Logo" className="logo" style={{ width: 300, height: 300, marginBottom: 20 }}/>
      <Typography variant="h3" fontWeight="bold">
        Seguimiento a Vendedores
      </Typography>
      <Typography variant="h6" color="textSecondary" sx={{ marginTop: 2 }}>
        Gestiona y monitorea el desempeño de ventas de tu equipo.
      </Typography>
    </Box>
  );
};

export default SeguimientoVendedores;
