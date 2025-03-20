import React from "react";
import { Button, Typography, Box, Paper } from "@mui/material";
import { OpenInNew } from "@mui/icons-material";

const ExcelViewer = () => {
  // URL directa al archivo en SharePoint
  const excelUrl = "https://danec.sharepoint.com/:x:/s/APP_Customer_Centric/EZ0h_Y3JxHxGmvqJ-zORz5MB19L-DwoEcJNSxNaky3RsnA?e=C6OGyg";

  return (
    <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
      <Paper elevation={3} sx={{ padding: 4, textAlign: "center", borderRadius: 3, maxWidth: 500 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          📊 Revisa la información diaria y el histórico de tus vendedores
        </Typography>

        <Button
          variant="contained"
          color="primary"
          endIcon={<OpenInNew />}
          onClick={() => window.open(excelUrl, "_blank")}
          sx={{
            mt: 2,
            mb: 2,
            borderRadius: 2,
            paddingX: 3,
            paddingY: 1,
            fontSize: "1rem",
          }}
        >
          Abrir en SharePoint
        </Button>

        <Typography variant="body2" color="textSecondary">
          🔐 Siempre recuerda iniciar sesión en Danec para visualizar.
        </Typography>
      </Paper>
    </Box>
  );
};

export default ExcelViewer;
