import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Grid } from "@mui/material";

const ExcelReader = () => {
    const [file, setFile] = useState(null);
    const [data, setData] = useState([]);

    const handleFileUpload = (event) => {
        setFile(event.target.files[0]);
    };

    const parseTime = (excelTime) => {
        if (!excelTime) return "";
        if (typeof excelTime === "string") return excelTime;

        const date = XLSX.SSF.parse_date_code(excelTime);
        return [date.H, date.M, date.S].map(n => n.toString().padStart(2, "0")).join(":");
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

                jsonData.forEach(({ Vendedor, razon, Tipo, programado, distancia, hora_inicio, hora_fin, Clientes_Programados, Total }) => {
                    if (!Vendedor) return;
                    const key = Vendedor;
                    const clientKey = `${Vendedor}_${razon}`;

                    if (!vendedores[key]) {
                        vendedores[key] = {
                            Vendedor,
                            planificados: parseInt(Clientes_Programados) || 0,
                            hora_inicio: null,
                            hora_final: null,
                            totalVentas: 0,
                            fueraDeRuta: 0,
                            countFueraRuta: 0,
                            Clientes_Con_Venta: new Set(),
                            Clientes_Sin_Venta: new Set(),
                            clientesProcesados: new Map(),
                            tiempoTotalVisitas: 0,
                            cantidadVisitas: 0,
                        };
                    }

                    const parsedHoraInicio = parseTime(hora_inicio);
                    const parsedHoraFin = parseTime(hora_fin);

                    if (parsedHoraInicio) {
                        if (!vendedores[key].hora_inicio || parsedHoraInicio < vendedores[key].hora_inicio) {
                            vendedores[key].hora_inicio = parsedHoraInicio;
                        }
                    }

                    if (parsedHoraFin) {
                        if (!vendedores[key].hora_final || parsedHoraFin > vendedores[key].hora_final) {
                            vendedores[key].hora_final = parsedHoraFin;
                        }
                    }

                    vendedores[key].totalVentas += parseFloat(Total) || 0;

                    if (programado === "FUERA DE RUTA") {
                        vendedores[key].fueraDeRuta += parseFloat(Total) || 0;
                        vendedores[key].countFueraRuta += 1;
                    }

                    if (!vendedores[key].clientesProcesados.has(clientKey)) {
                        vendedores[key].clientesProcesados.set(clientKey, { tipos: new Set(), distancia: parseFloat(distancia) || 0 });
                    }

                    vendedores[key].clientesProcesados.get(clientKey).tipos.add(Tipo);

                    // Calcular tiempo de visita solo para "03-Pedido Contado"
                    if (Tipo === "03-Pedido Contado" && parsedHoraInicio && parsedHoraFin) {
                        const minutosInicio = timeToMinutes(parsedHoraInicio);
                        const minutosFin = timeToMinutes(parsedHoraFin);
                        const duracionVisita = minutosFin - minutosInicio;

                        if (duracionVisita > 0) {
                            vendedores[key].tiempoTotalVisitas += duracionVisita;
                            vendedores[key].cantidadVisitas += 1;
                        }
                    }
                });

                // Ajuste para evitar clientes duplicados en las métricas
                Object.values(vendedores).forEach(vendedor => {
                    vendedor.clientesProcesados.forEach(({ tipos }, cliente) => {
                        if (tipos.has("03-Pedido Contado")) {
                            vendedor.Clientes_Con_Venta.add(cliente);
                            vendedor.Clientes_Sin_Venta.delete(cliente); // Si compró, se elimina de "sin venta"
                        } else if (tipos.has("00-Registro de Visita")) {
                            if (!vendedor.Clientes_Con_Venta.has(cliente)) { // Solo lo agregamos si NO compró
                                vendedor.Clientes_Sin_Venta.add(cliente);
                            }
                        }
                    });
                });


                // Ajuste en el cálculo de Cumplimiento de Ruta (solo clientes únicos)
                const processedData = Object.values(vendedores).map((vendedor) => {
                    const planificados = vendedor.planificados || "Sin clientes Planificados";
                    const esEspejo = vendedor.Vendedor.endsWith("1") ? "ESPEJO" : null;
                    const tiempoPromedioVisita = vendedor.cantidadVisitas > 0 ? (vendedor.tiempoTotalVisitas / vendedor.cantidadVisitas).toFixed(2) + " min" : "0.00 min";

                    // 🔹 Corrección: Clientes únicos sin duplicados
                    const clientesUnicos = new Set([...vendedor.Clientes_Con_Venta, ...vendedor.Clientes_Sin_Venta]).size;

                    return {
                        Vendedor: vendedor.Vendedor,
                        planificados,
                        hora_inicio: vendedor.hora_inicio || "Sin registro",
                        hora_final: vendedor.hora_final || "Sin registro",
                        "Valor Total": "$" + vendedor.totalVentas.toFixed(2),
                        "Total Fuera de Ruta": "$" + vendedor.fueraDeRuta.toFixed(2),
                        "Clientes con Venta": vendedor.Clientes_Con_Venta.size,
                        "Clientes sin Venta": vendedor.Clientes_Sin_Venta.size,
                        "Conteo Fuera de Ruta": vendedor.countFueraRuta,
                        "Efectividad de Ventas": esEspejo || (planificados > 0 ? ((vendedor.Clientes_Con_Venta.size / planificados) * 100).toFixed(2) + "%" : "S/P"),
                        "Cumplimiento de Ruta": esEspejo || (planificados > 0 ?
                            ((clientesUnicos / planificados) * 100).toFixed(2) + "%" : "S/P"),
                        "Ticket Promedio": esEspejo || "$" + (vendedor.Clientes_Con_Venta.size > 0 ? (vendedor.totalVentas / vendedor.Clientes_Con_Venta.size).toFixed(2) : "0.00"),
                        "Tiempo Promedio de Visita": tiempoPromedioVisita
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
