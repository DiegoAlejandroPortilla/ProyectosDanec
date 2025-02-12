import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Grid, TextField } from "@mui/material";

const ExcelReader = () => {
    const [file, setFile] = useState(null);
    const [data, setData] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    const handleFileUpload = (event) => {
        setFile(event.target.files[0]);
    };

    const timeToMinutes = (time) => {
        if (!time) return 0;
        const [hours, minutes, seconds] = time.split(":").map(Number);
        return hours * 60 + minutes + seconds / 60;
    };

    const handleProcessFile = () => {
        if (!file) {
            alert("Por favor, selecciona un archivo primero.");
            return;
        }

        const reader = new FileReader();
        reader.readAsBinaryString(file);

        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(e.target.result, { type: "binary" });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

                if (jsonData.length === 0) {
                    alert("No se encontraron datos en la hoja seleccionada.");
                    return;
                }

                const vendedores = {};

                jsonData.forEach(({ Vendedor, razon, Tipo, programado, Clientes_Programados, Total, hora_inicio, hora_fin }) => {
                    if (!Vendedor) return;

                    const key = Vendedor;
                    const clientKey = razon;

                    if (!vendedores[key]) {
                        vendedores[key] = {
                            Vendedor,
                            planificados: parseInt(Clientes_Programados) || 0,
                            totalVentas: 0,
                            totalFueraDeRuta: 0,
                            cantidadFueraDeRuta: 0,
                            Clientes_Con_Venta: new Set(),
                            Clientes_Sin_Venta: new Set(),
                            clientesProcesados: new Set(),
                            hora_inicio: null,
                            hora_final: null,
                            tiempoTotalVisitas: 0,
                            cantidadVisitas: 0,
                            registrosEfectividad: new Map()
                        };
                    }

                    vendedores[key].totalVentas += parseFloat(Total) || 0;

                    if (programado === "FUERA DE RUTA") {
                        vendedores[key].totalFueraDeRuta += parseFloat(Total) || 0;
                        vendedores[key].cantidadFueraDeRuta += 1;
                        return;
                    }

                    vendedores[key].clientesProcesados.add(clientKey);

                    if (hora_inicio && (!vendedores[key].hora_inicio || hora_inicio < vendedores[key].hora_inicio)) {
                        vendedores[key].hora_inicio = hora_inicio;
                    }

                    if (hora_fin && (!vendedores[key].hora_final || hora_fin > vendedores[key].hora_final)) {
                        vendedores[key].hora_final = hora_fin;
                    }

                    if ((Tipo === "03-Pedido Contado" || Tipo === "01-Pedido CREDITO o CPP") && hora_inicio && hora_fin) {
                        const minutosInicio = timeToMinutes(hora_inicio);
                        const minutosFin = timeToMinutes(hora_fin);
                        const duracionVisita = minutosFin - minutosInicio;

                        if (duracionVisita > 0) {
                            vendedores[key].tiempoTotalVisitas += duracionVisita;
                            vendedores[key].cantidadVisitas += 1;
                        }
                    }

                    if (Tipo === "00-Registro de Efectividad de Visita") {
                        const distanciaActual = parseFloat(programado) || 0;

                        if (!vendedores[key].registrosEfectividad.has(razon)) {
                            vendedores[key].registrosEfectividad.set(razon, distanciaActual);
                        } else {
                            const distanciaGuardada = vendedores[key].registrosEfectividad.get(razon);
                            vendedores[key].registrosEfectividad.set(razon, Math.max(distanciaGuardada, distanciaActual));
                        }
                    }
                });

                Object.values(vendedores).forEach(vendedor => {
                    vendedor.clientesProcesados.forEach(cliente => {
                        const tipos = jsonData
                            .filter(entry => entry.Vendedor === vendedor.Vendedor && entry.razon === cliente)
                            .map(entry => entry.Tipo);

                        if (tipos.includes("03-Pedido Contado") || tipos.includes("01-Pedido CREDITO o CPP")) {
                            vendedor.Clientes_Con_Venta.add(cliente);
                        } else if (tipos.includes("00-Registro de Efectividad de Visita") || tipos.includes("20-Cambio de producto")) {
                            vendedor.Clientes_Sin_Venta.add(cliente);
                        }
                    });

                    const visitasEfectivas = Array.from(vendedor.registrosEfectividad.values())
                        .filter(distancia => distancia < 50)
                        .length;

                    vendedor.efectividadVisitas = vendedor.planificados > 0
                        ? ((visitasEfectivas / vendedor.planificados) * 100).toFixed(2) + "%"
                        : "S/P";

                    vendedor.cumplimientoRuta = vendedor.planificados > 0
                        ? (((vendedor.Clientes_Con_Venta.size + vendedor.Clientes_Sin_Venta.size) / vendedor.planificados) * 100).toFixed(2) + "%"
                        : "S/P";
                });

                const processedData = Object.values(vendedores).map((vendedor) => {
                    return {
                        Vendedor: vendedor.Vendedor,
                        planificados: vendedor.planificados,
                        "Valor Total": "$" + vendedor.totalVentas.toFixed(2),
                        "Valor Total FUERA DE RUTA": "$" + vendedor.totalFueraDeRuta.toFixed(2),
                        "Cantidad FUERA DE RUTA": vendedor.cantidadFueraDeRuta,
                        "Clientes con Venta": vendedor.Clientes_Con_Venta.size,
                        "Clientes sin Venta": vendedor.Clientes_Sin_Venta.size,
                        "Hora Inicio": vendedor.hora_inicio || "Sin registro",
                        "Hora Fin": vendedor.hora_final || "Sin registro",
                        "Ticket Promedio": "$" + (vendedor.Clientes_Con_Venta.size > 0 
                            ? (vendedor.totalVentas / vendedor.Clientes_Con_Venta.size).toFixed(2) 
                            : "0.00"),
                        "Efectividad de Visitas": vendedor.efectividadVisitas,
                        "Cumplimiento de Ruta": vendedor.cumplimientoRuta, // ✅ Agregado correctamente
                        "Registros Efectividad": vendedor.registrosEfectividad.size
                    };
                });

                setData(processedData);
            } catch (error) {
                console.error("Error procesando el archivo:", error);
                alert("Error al leer el archivo. Asegúrate de que tenga datos y esté bien formateado.");
            }
        };
    };

    const filteredData = data.filter(row => row.Vendedor.toLowerCase().includes(searchTerm.toLowerCase()));

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Vendedores");
        XLSX.writeFile(wb, "Reporte_Vendedores.xlsx");
    };

    return (
        <div>
            <Grid container spacing={2} direction="column" alignItems="stretch">
                <Grid item>
                    <input type="file" accept=".xls,.xlsx" onChange={handleFileUpload} style={{ width: "100%" }} />
                </Grid>
                <Grid item>
                    <Button variant="contained" color="primary" fullWidth onClick={handleProcessFile}>
                        Procesar Archivo
                    </Button>
                </Grid>

                <Grid item>
                    <Button variant="contained" color="secondary" fullWidth onClick={exportToExcel} disabled={data.length === 0}>
                        Exportar a Excel
                    </Button>
                </Grid>
                <Grid item>
                    <TextField
                        fullWidth
                        label="Buscar por Vendedor"
                        variant="outlined"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </Grid>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                {Object.keys(filteredData[0] || {}).map((key, index) => (
                                    <TableCell key={index}>{key}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredData.map((row, index) => (
                                <TableRow key={index}>
                                    {Object.values(row).map((value, i) => (
                                        <TableCell key={i}>{value}</TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Grid>
        </div>
    );
};

export default ExcelReader;
