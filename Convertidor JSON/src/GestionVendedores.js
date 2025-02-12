import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Grid } from "@mui/material";

const ExcelReader = () => {
    const [file, setFile] = useState(null);
    const [data, setData] = useState([]);

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
                    const clientKey = `${Vendedor}_${razon}`;

                    if (!vendedores[key]) {
                        vendedores[key] = {
                            Vendedor,
                            planificados: parseInt(Clientes_Programados) || 0,
                            totalVentas: 0,
                            totalFueraDeRuta: 0,
                            cantidadFueraDeRuta: 0,
                            Clientes_Con_Venta: new Set(),
                            Clientes_Sin_Venta: new Set(),
                            clientesProcesados: new Map(),
                            hora_inicio: null,
                            hora_final: null,
                            tiempoTotalVisitas: 0,
                            cantidadVisitas: 0
                        };
                    }

                    vendedores[key].totalVentas += parseFloat(Total) || 0;

                    if (programado === "FUERA DE RUTA") {
                        vendedores[key].totalFueraDeRuta += parseFloat(Total) || 0;
                        vendedores[key].cantidadFueraDeRuta += 1;
                        return;
                    }

                    if (!vendedores[key].clientesProcesados.has(clientKey)) {
                        vendedores[key].clientesProcesados.set(clientKey, new Set());
                    }
                    
                    vendedores[key].clientesProcesados.get(clientKey).add(Tipo);

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
                });

                Object.values(vendedores).forEach(vendedor => {
                    vendedor.clientesProcesados.forEach((tipos, cliente) => {
                        if (tipos.has("03-Pedido Contado") || tipos.has("01-Pedido CREDITO o CPP")) {
                            vendedor.Clientes_Con_Venta.add(cliente);
                        } else if (tipos.has("00-Registro de Visita") || tipos.has("20-Cambio de producto")) {
                            vendedor.Clientes_Sin_Venta.add(cliente);
                        }
                    });
                });

                const processedData = Object.values(vendedores).map((vendedor) => {
                    const ticketPromedio = vendedor.Clientes_Con_Venta.size > 0 ? (vendedor.totalVentas / vendedor.Clientes_Con_Venta.size).toFixed(2) : "0.00";
                    const efectividadVisitas = vendedor.planificados > 0 ? ((vendedor.Clientes_Con_Venta.size / vendedor.planificados) * 100).toFixed(2) + "%" : "S/P";
                    const efectividadVentas = vendedor.Clientes_Con_Venta.size > 0 ? ((vendedor.Clientes_Con_Venta.size / (vendedor.Clientes_Con_Venta.size + vendedor.Clientes_Sin_Venta.size)) * 100).toFixed(2) + "%" : "S/P";
                    const cumplimientoRuta = vendedor.planificados > 0 ? (((vendedor.Clientes_Con_Venta.size + vendedor.Clientes_Sin_Venta.size) / vendedor.planificados) * 100).toFixed(2) + "%" : "S/P";
                    const tiempoPromedioVisita = vendedor.cantidadVisitas > 0 ? (vendedor.tiempoTotalVisitas / vendedor.cantidadVisitas).toFixed(2) + " min" : "0.00 min";
                    
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
                        "Ticket Promedio": "$" + ticketPromedio,
                        "Efectividad de Visitas": efectividadVisitas,
                        "Efectividad de Ventas": efectividadVentas,
                        "Cumplimiento de Ruta": cumplimientoRuta,
                        "Tiempo Promedio Visita": tiempoPromedioVisita
                    };
                });

                setData(processedData);
            } catch (error) {
                console.error("Error procesando el archivo:", error);
                alert("Error al leer el archivo. Asegúrate de que tenga datos y esté bien formateado.");
            }
        };
    };
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
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                {Object.keys(data[0] || {}).map((key, index) => (
                                    <TableCell key={index}>{key}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.map((row, index) => (
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
