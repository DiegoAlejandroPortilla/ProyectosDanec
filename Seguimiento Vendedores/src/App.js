import React, { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Container,
  Typography,
  Box,
} from "@mui/material";
import { LineChart } from '@mui/x-charts/LineChart';
import * as XLSX from "xlsx";
const App = () => {

  const [formData, setFormData] = useState({
    vendedor: "",
    horaInicio: "",
    clientesPlanificados: "",
    clientesConVenta: "",
    clientesSinVenta: "",
    avanceVentas: "",
    validaciones: "",  // Cambié de "Ubiciacion" a "validaciones"
    clientesConVenta2: "",
    clientesSinVenta2: "",
    avanceVentas2: "",
    AlertasPedidosLejanos: "",
    visitadosFueraRuta: "",
    horaFin: "",
  });

  const [data, setData] = useState([]);
  const [filter, setFilter] = useState("Tabla Completa");
  const vendedoresRuta = {
    IG: "COB",
    IB: "COB",
    IR: "COB",
    IX: "COB",
    IQ: "COB",
    RB: "COB",
    RA: "COB",
    IN: "COB",
    IP: "COB",
    RD: "COB",
    IC: "COB",
    IZ: "COB",
    II: "MAY",
    ID: "MAY",
    IU: "MAY",
    I1: "MAY_ESPEJO",
    IJ: "HOR",
    IW: "HOR",
    IT: "HOR",
    RC: "HOR",
    IV: "PAN",
    IS: "PAN",
  };

  const tipoRutaNombre = {
    MAY: "Mayorista",
    HOR: "Horeca",
    COB: "Cobertura",
    MAY_ESPEJO: "Mayorista Espejo",
    PAN: "Panadería",
  };

  const ubicaciones = {
    SI: "SI",
    NO: "NO",
  };

  const validaciones = Object.keys(ubicaciones);
  const vendedores = Object.keys(vendedoresRuta);



  useEffect(() => {
    const initialData = vendedores.map((vendedor) => {
      const tipoRuta = vendedoresRuta[vendedor];
      return {
        vendedor,
        tipoRuta,
        horaInicio: "08:00",
        clientesPlanificados: Math.floor(Math.random() * 50) + 10, // Valores aleatorios entre 10 y 50
        clientesConVenta: Math.floor(Math.random() * 20) + 5, // Valores aleatorios entre 5 y 20
        clientesSinVenta: Math.floor(Math.random() * 10) + 2, // Valores aleatorios entre 2 y 10
        avanceVentas: (Math.random() * 1000).toFixed(2), // Avance en ventas aleatorio
        validaciones: validaciones[Math.floor(Math.random() * validaciones.length)], // Validaciones aleatorias
        clientesVisitados: Math.floor(Math.random() * 30) + 5,
        clientesConVenta2: Math.floor(Math.random() * 20) + 3,
        clientesSinVenta2: Math.floor(Math.random() * 10) + 1,
        avanceVentas2: (Math.random() * 1500).toFixed(2),
        AlertasPedidosLejanos: Math.floor(Math.random() * 5), // Alertas aleatorias
        visitadosFueraRuta: Math.floor(Math.random() * 3), // Valores aleatorios
        horaFin: "17:00",
      };
    });
    setData(initialData);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = () => {
    const tipoRuta = vendedoresRuta[formData.vendedor];
    const clientesVisitados =
      (parseInt(formData.clientesConVenta) || 0) +
      (parseInt(formData.clientesSinVenta) || 0);
    const clientesVisitados2 =
      (parseInt(formData.clientesConVenta2) || 0) +
      (parseInt(formData.clientesSinVenta2) || 0);

    const existingIndex = data.findIndex(
      (row) => row.vendedor === formData.vendedor
    );

    if (existingIndex !== -1) {
      // Si el vendedor ya existe, actualizamos los valores acumulando las sumas
      const updatedData = [...data];
      updatedData[existingIndex] = {
        ...updatedData[existingIndex],
        ...Object.fromEntries(
          Object.entries(formData).filter(([key, value]) => value !== "")
        ),
        tipoRuta,
        clientesVisitados: updatedData[existingIndex].clientesVisitados + clientesVisitados,
        clientesVisitados2: updatedData[existingIndex].clientesVisitados2 + clientesVisitados2,
      };
      setData(updatedData);
    } else {
      // Si el vendedor no existe, simplemente agregamos los nuevos datos
      setData([
        ...data,
        {
          ...formData,
          tipoRuta,
          clientesVisitados,
          clientesVisitados2,
        },
      ]);
    }

    // Reiniciar el formulario, pero no el estado de 'data'
    setFormData({
      vendedor: "",
      horaInicio: "",
      clientesPlanificados: "",
      clientesConVenta: "",
      clientesSinVenta: "",
      avanceVentas: "",
      validaciones: "",
      clientesConVenta2: "",
      clientesSinVenta2: "",
      avanceVentas2: "",
      AlertasPedidosLejanos: "",
      visitadosFueraRuta: "",
      horaFin: "",
    });
  };


  const calculatePercentage = (visitados, planificados) => {
    if (!planificados || planificados === 0) return 0;
    return ((visitados / planificados) * 100).toFixed(2);
  };

  const calculatePercentage2 = (visitados2, planificados) => {
    if (!planificados || planificados === 0) return 0;
    return ((visitados2 / planificados) * 100).toFixed(2);
  };

  const calculateEfectividadVentas = (clientesConVenta2, planificados) => {
    if (!planificados || planificados === 0) return 0;
    return ((clientesConVenta2 / planificados) * 100).toFixed(2);
  }


  const getRowStyle = (row) => {
    const { tipoRuta, avanceVentas } = row;

    // Asegurarse de que avanceVentas sea un número válido
    const avanceVentasNum = parseFloat(avanceVentas);

    if (isNaN(avanceVentasNum)) return {}; // Si no es un número, no aplicar estilo

    // Definir los umbrales de comparación para cada tipo de ruta
    if (tipoRuta === "COB" || tipoRuta === "HOR" || tipoRuta === "PAN") {
      return avanceVentasNum < 250 ? { color: "red" } : {}; // Color rojo si avanceVentas < 250
    } else if (tipoRuta === "MAY_ESPEJO") {
      return avanceVentasNum < 2500 ? { color: "red" } : {}; // Color rojo si avanceVentas < 2500
    }

    return {}; // Si no se cumple ninguna condición, no cambiar el color
  };


  const getRowStyle2 = (row) => {
    const { tipoRuta, avanceVentas2 } = row;

    // Asegurarse de que avanceVentas sea un número válido
    const avanceVentasNum2 = parseFloat(avanceVentas2);

    if (isNaN(avanceVentasNum2)) return {}; // Si no es un número, no aplicar estilo

    // Definir los umbrales de comparación para cada tipo de ruta
    if (tipoRuta === "COB" || tipoRuta === "HOR" || tipoRuta === "PAN") {
      return avanceVentasNum2 < 500 ? { color: "red" } : {}; // Color rojo si avanceVentas < 250
    } else if (tipoRuta === "MAY_ESPEJO") {
      return avanceVentasNum2 < 5000 ? { color: "red" } : {}; // Color rojo si avanceVentas < 2500
    }

    return {}; // Si no se cumple ninguna condición, no cambiar el color
  }

  const getFilteredColumns = () => {
    switch (filter) {
      case "Inicio de Jornada":
        return ["vendedor", "tipoRuta", "horaInicio", "validaciones"];
      case "Avance de Productividad":
        return ["vendedor", "tipoRuta", "clientesPlanificados", "porcentajeDeVisitas1", "avanceVentas"];
      case "Cumplimiento de Estándares":
        return [
          "vendedor",
          "tipoRuta",
          "clientesPlanificados",
          "porcentajeDeVisitas2",
          "efectividadDeVentas",
          "avanceVentas2",
          "AlertasPedidosLejanos",
          "visitadosFueraRuta",
          "horaFin",
        ];
      case "Tabla Completa":
      default:
        return [
          "vendedor",
          "tipoRuta",
          "horaInicio",
          "validaciones",
          "clientesPlanificados",
          "clientesVisitados",
          "clientesConVenta",
          "clientesSinVenta",
          "porcentajeDeVisitas1",
          "avanceVentas",
          "clientesVisitados2",
          "clientesConVenta2",
          "clientesSinVenta2",
          "porcentajeDeVisitas2",
          "efectividadDeVentas",
          "avanceVentas2",
          "AlertasPedidosLejanos",
          "visitadosFueraRuta",
          "horaFin",
        ];
    }
  };
  const filteredColumns = getFilteredColumns();
  const downloadExcel = () => {
    const headers = [
      "Vendedor",
      "Tipo de Ruta",
      "Clientes Planificados",
      "Hora Inicio",
      "Efectividad de Visitas (Medio Día)",
      "Avance de Ventas(Medio Día)",
      "Efectividad de Visitas (Fin del Día)",
      "Efectividad de Ventas (Fin del Día)",
      "Avance de Ventas(Fin del Día)",
      "Alertas Pedidos fuera lejos del cliente",
      "Visitados Fuera de Ruta",
      "Hora Fin"
    ];
    const excelData = data.map((row) => ({
      Vendedor: row.vendedor,
      "Tipo de Ruta": row.tipoRuta,
      "Clientes Planificados": row.clientesPlanificados,
      "Hora Inicio": row.horaInicio,
      "Efectividad de Visitas (Medio Día)": row.percentaje,
      "Avance Ventas (Medio Día)": row.avanceVentas,
      "Efectividad de Visitas (Fin del Día)": row.percentaje2,
      "Efectividad de Ventas (Fin del Día)": row.efectividadVentas,
      "Avance de Ventas(Fin del Día)": row.avanceVentas2,
      "Alertas Pedidos fuera lejos del cliente": row.AlertasPedidosLejanos,
      "Visitados Fuera de Ruta": row.visitadosFueraRuta,
      "Hora Fin": row.horaFin,

    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");

    XLSX.writeFile(workbook, "datos_vendedores.xlsx");
  };
  const dataset = data.map((row) => ({
    vendedor: row.vendedor,
    clientesVisitados: row.clientesVisitados,
    clientesPlanificados: row.clientesPlanificados,
    ventasTotales: row.avanceVentas2,
    date: new Date(),
  }));



  return (
    <Container maxWidth="80%" style={{ backgroundColor: "#f4f6f8", padding: "20px", borderRadius: "10px" }}>

      <div className="header">
        <Typography variant="h3" className="title">
          Gestión de Vendedores Ibarra
        </Typography>
        <img
          src="https://static.wixstatic.com/media/8c779e_1409e43beb09452fb412354a283d060a~mv2.png/v1/fill/w_638,h_416,al_c,lg_1,q_85/8c779e_1409e43beb09452fb412354a283d060a~mv2.png" // Reemplaza con tu imagen
          alt="Logo"
          className="header-image"
        />
      </div>
      <Box
        component="form"
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          marginBottom: "20px",
          backgroundColor: "#fff",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: 3,
        }}
      >
        <FormControl fullWidth>
          <InputLabel>Vendedor</InputLabel>
          <Select value={formData.vendedor} onChange={handleChange} name="vendedor">
            {vendedores.map((vendedor) => (
              <MenuItem key={vendedor} value={vendedor}>
                {vendedor}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

      </Box>

      <FormControl fullWidth>
        <InputLabel>Filtro</InputLabel>
        <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <MenuItem value="Inicio de Jornada">Inicio de Jornada</MenuItem>
          <MenuItem value="Avance de Productividad">Avance de Productividad</MenuItem>
          <MenuItem value="Cumplimiento de Estándares">Cumplimiento de Estándares</MenuItem>
          <MenuItem value="Tabla Completa">Tabla Completa</MenuItem>
        </Select>
      </FormControl>


      <TableContainer component={Paper} sx={{ marginTop: "40px", boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)" }}>
        <Table>
          <TableHead sx={{ backgroundColor: "#1976d2" }}>
            <TableRow>
              {filteredColumns.includes("vendedor") && (
                <TableCell sx={{ color: "#ffffff", fontWeight: "bold" }}>Vendedor</TableCell>
              )}
              {filteredColumns.includes("tipoRuta") && (
                <TableCell sx={{ color: "#ffffff", fontWeight: "bold" }}>Tipo de Ruta</TableCell>
              )}
              {filteredColumns.includes("horaInicio") && (
                <TableCell sx={{ color: "#ffffff", fontWeight: "bold" }}>Hora de Inicio</TableCell>
              )}
              {filteredColumns.includes("validaciones") && (
                <TableCell sx={{ color: "#ffffff", fontWeight: "bold" }}>Ubicación</TableCell>
              )}
              {filteredColumns.includes("clientesPlanificados") && (
                <TableCell sx={{ color: "#ffffff", fontWeight: "bold" }}>Clientes Planificados</TableCell>
              )}
              {filteredColumns.includes("clientesVisitados") && (
                <TableCell sx={{ color: "#ffffff", fontWeight: "bold" }}>Clientes Visitados(Medio día)</TableCell>
              )}
              {filteredColumns.includes("clientesConVenta") && (
                <TableCell sx={{ color: "#ffffff", fontWeight: "bold" }}>Clientes con Venta(Medio día)</TableCell>
              )}
              {filteredColumns.includes("clientesSinVenta") && (
                <TableCell sx={{ color: "#ffffff", fontWeight: "bold" }}>Clientes sin Venta(Medio día)</TableCell>
              )}
              {filteredColumns.includes("porcentajeDeVisitas1") && (
                <TableCell sx={{ color: "#ffffff", fontWeight: "bold" }}>Porcentaje de Visitas(Medio día)</TableCell>
              )}
              {filteredColumns.includes("avanceVentas") && (
                <TableCell sx={{ color: "#ffffff", fontWeight: "bold" }}>Avance de Ventas</TableCell>
              )}
              {filteredColumns.includes("clientesVisitados2") && (
                <TableCell sx={{ color: "#ffffff", fontWeight: "bold" }}>Clientes Visitados(Fin del día)</TableCell>
              )}
              {filteredColumns.includes("clientesConVenta2") && (
                <TableCell sx={{ color: "#ffffff", fontWeight: "bold" }}>Clientes con Venta (Fin del día)</TableCell>
              )}
              {filteredColumns.includes("clientesSinVenta2") && (
                <TableCell sx={{ color: "#ffffff", fontWeight: "bold" }}>Clientes sin Venta (Fin del día)</TableCell>
              )}
              {filteredColumns.includes("porcentajeDeVisitas2") && (
                <TableCell sx={{ color: "#ffffff", fontWeight: "bold" }}>Porcentaje de Visitas(Fin del día)</TableCell>
              )}
              {filteredColumns.includes("efectividadDeVentas") && (
                <TableCell sx={{ color: "#ffffff", fontWeight: "bold" }}>Efectividad de Ventas(Fin del día)</TableCell>
              )}
              {filteredColumns.includes("avanceVentas2") && (
                <TableCell sx={{ color: "#ffffff", fontWeight: "bold" }}>Avance de Ventas (Fin del día)</TableCell>
              )}
              {filteredColumns.includes("horaFin") && (
                <TableCell sx={{ color: "#ffffff", fontWeight: "bold" }}>Hora de Finalización</TableCell>
              )}
            </TableRow>

          </TableHead>
          <TableBody>
            {data.map((row, index) => {
              const percentage = calculatePercentage(row.clientesVisitados, row.clientesPlanificados);
              const percentage2 = calculatePercentage2(row.clientesVisitados2, row.clientesPlanificados);
              const efectividadVentas = calculateEfectividadVentas(row.clientesConVenta2, row.clientesPlanificados);
              const [hours, minutes] = row.horaInicio.split(":").map(Number);
              const totalHours = hours + minutes / 60;
              const [hours1, minutes1] = row.horaFin.split(":").map(Number);
              const totalHours1 = hours1 + minutes1 / 60;

              return (
                <TableRow key={index} style={getRowStyle(row)}>
                  {filteredColumns.includes("vendedor") && (
                    <TableCell>{row.vendedor}</TableCell>
                  )}
                  {filteredColumns.includes("tipoRuta") && (
                    <TableCell>{tipoRutaNombre[row.tipoRuta] || "Desconocido"}</TableCell>
                  )}
                  {filteredColumns.includes("horaInicio") && (
                    <TableCell
                      style={{
                        color: row.horaInicio > "09:00" ? "red" : "green",
                      }}
                    >
                      {row.horaInicio}
                    </TableCell>
                  )}
                  {filteredColumns.includes("validaciones") && (
                    <TableCell style={{ color: row.validaciones === "NO" ? "red" : "black" }}>
                      {row.validaciones}
                    </TableCell>
                  )}
                  {filteredColumns.includes("clientesPlanificados") && (
                    <TableCell>{row.clientesPlanificados}</TableCell>
                  )}
                  {filteredColumns.includes("clientesVisitados") && (
                    <TableCell>{row.clientesVisitados}</TableCell>
                  )}
                  {filteredColumns.includes("clientesConVenta") && (
                    <TableCell>{row.clientesConVenta}</TableCell>
                  )}
                  {filteredColumns.includes("clientesSinVenta") && (
                    <TableCell>{row.clientesSinVenta}</TableCell>
                  )}
                  {filteredColumns.includes("porcentajeDeVisitas1") && (
                    <TableCell style={{ color: percentage < 40 ? "red" : "green", }}>
                      {percentage}%
                    </TableCell>
                  )}
                  {filteredColumns.includes("avanceVentas") && (
                    <TableCell style={getRowStyle(row)}>
                      ${isNaN(row.avanceVentas) || row.avanceVentas === "" ? "0.00" : parseFloat(row.avanceVentas).toFixed(2)}
                    </TableCell>
                  )}
                  {filteredColumns.includes("clientesVisitados2") && (
                    <TableCell>{row.clientesVisitados2}</TableCell>
                  )}
                  {filteredColumns.includes("clientesConVenta2") && (
                    <TableCell>{row.clientesConVenta2}</TableCell>
                  )}
                  {filteredColumns.includes("clientesSinVenta2") && (
                    <TableCell>{row.clientesSinVenta2}</TableCell>
                  )}
                  {filteredColumns.includes("porcentajeDeVisitas2") && (
                    <TableCell
                      style={{
                        color: percentage2 < 60 ? "red" : "green",
                      }}
                    >
                      {percentage2}%
                    </TableCell>
                  )}
                  {filteredColumns.includes("efectividadDeVentas") && (
                    <TableCell
                      style={{
                        color: efectividadVentas < 60 ? "red" : "green",
                      }}
                    >
                      {efectividadVentas}%
                    </TableCell>
                  )}
                  {filteredColumns.includes("avanceVentas2") && (
                    <TableCell style={getRowStyle2(row)}>
                      ${isNaN(row.avanceVentas2) || row.avanceVentas2 === "" ? "0.00" : parseFloat(row.avanceVentas2).toFixed(2)}
                    </TableCell>
                  )}
                  {filteredColumns.includes("horaFin") && (
                    <TableCell
                      style={{
                        color: totalHours1 < "15.30" || totalHours1 > "16.45" ? "red" : "green",
                      }}
                    >
                      {row.horaFin}
                    </TableCell>
                  )}
                </TableRow>


              );
            })}

          </TableBody>
        </Table>
      </TableContainer>

      {/* Gráfico de Línea */}
      <Box sx={{ marginTop: "40px", textAlign: "center" }}>
        <LineChart
          dataset={dataset}
          xAxis={[
            {
              id: 'Vendedor',
              dataKey: 'vendedor',
              scaleType: 'band',
            },
          ]}
          series={[
            {
              id: 'Clientes Con venta',
              label: 'Clientes con Venta',
              dataKey: 'clientesVisitados',
              showMark: true,
            },
            {
              id: 'Clientes Planificados',
              label: 'Clientes Planificados',
              dataKey: 'clientesPlanificados',
              showMark: true,
            },
          ]}
          width={1000}
          height={400}
        />
      </Box>
      <Box sx={{ textAlign: "center", marginTop: "20px" }}>
        <Button variant="contained" color="secondary" onClick={downloadExcel}>
          Descargar Excel
        </Button>
      </Box>
    </Container>
  );
};

export default App;
