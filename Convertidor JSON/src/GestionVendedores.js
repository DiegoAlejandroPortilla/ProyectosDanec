import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Button, Grid, TextField, Tooltip, Typography, Box
} from "@mui/material";
import { styled } from "@mui/material/styles";
import CircleIcon from "@mui/icons-material/Circle";
import CancelIcon from "@mui/icons-material/Cancel";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import GpsFixedIcon from "@mui/icons-material/GpsFixed";



const StyledTableCell = styled(TableCell)(({ theme }) => ({
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.common.white,
    fontWeight: "bold",
    textAlign: "center",
}));
const getIconColor = (row) => {
    const ventas = row.Clientes_Con_Venta?.size || 0;
    const sinVenta = row.Clientes_Sin_Venta?.size || 0;
    const fueraRuta = row.cantidadFueraDeRuta || 0;

    if (ventas >= sinVenta && ventas >= fueraRuta) return "green"; // Predomina Clientes con Venta
    if (sinVenta >= ventas && sinVenta >= fueraRuta) return "red"; // Predomina Clientes sin Venta
    if (fueraRuta >= ventas && fueraRuta >= sinVenta) return "yellow"; // Predomina Fuera de Ruta

    return "grey"; // En caso de empate o sin datos
};


const StyledTableRow = styled(TableRow)(({ theme }) => ({
    '&:nth-of-type(odd)': {
        backgroundColor: theme.palette.action.hover,
    },
    '&:hover': {
        backgroundColor: theme.palette.action.selected,
    },
}));

const ExcelReader = () => {
    const [file, setFile] = useState(null);
    const [data, setData] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    const handleFileUpload = (event) => {
        setFile(event.target.files[0]);
    };

    const timeToMinutes = (time) => {
        if (!time) return Infinity;
        const [hours, minutes, seconds] = time.split(":").map(Number);
        return hours * 60 + minutes + (seconds / 60);
    };
    const formatTime = (totalMinutes) => {
        if (isNaN(totalMinutes) || totalMinutes <= 0) return "00:00:00";

        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.floor(totalMinutes % 60);
        const seconds = Math.round((totalMinutes % 1) * 60);

        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
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
                let jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

                if (jsonData.length === 0) {
                    alert("No se encontraron datos en la hoja seleccionada.");
                    return;
                }

                // **FILTRADO**: Excluir registros donde 'Codigoak' tiene más de dos caracteres
                jsonData = jsonData.filter(row => (row.Codigoak || "").toString().length <= 2);

                const vendedores = {};

                jsonData.forEach(({ Vendedor, razon, Tipo, programado, Clientes_Programados, Total, hora_inicio, hora_fin, distancia }) => {
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
                            clientesEfectivosMenor70: 0,
                            registrosEfectividad: new Map()
                        };
                    }

                    vendedores[key].totalVentas += parseFloat(Total) || 0;

                    // **Registrar hora más temprana como Hora_inicio**
                    if (hora_inicio && (!vendedores[key].hora_inicio || timeToMinutes(hora_inicio) < timeToMinutes(vendedores[key].hora_inicio))) {
                        vendedores[key].hora_inicio = hora_inicio.trim();
                    }

                    // **Registrar hora más tardía como Hora_Fin**
                    if (hora_fin && (!vendedores[key].hora_final || timeToMinutes(hora_fin) > timeToMinutes(vendedores[key].hora_final))) {
                        vendedores[key].hora_final = hora_fin.trim();
                    }

                    // Si es fuera de ruta, igual contabilizar pero sin afectar los cálculos de efectividad
                    // Contabilizar clientes fuera de ruta, pero no en el cálculo de efectividad
                    if (programado === "FUERA DE RUTA") {
                        vendedores[key].totalFueraDeRuta += parseFloat(Total) || 0;
                        vendedores[key].cantidadFueraDeRuta += 1;
                        
                    } else {
                        vendedores[key].clientesProcesados.add(clientKey);
                    }

                    if (Tipo === "00-Registro de Efectividad de Visita" && parseFloat(distancia) <= 70) {
                        if (!vendedores[key].registrosEfectividad.has(razon)) {
                            vendedores[key].registrosEfectividad.set(razon, programado !== "FUERA DE RUTA" ? 1 : 0);
                        }
                    }


                    if (hora_inicio && hora_fin) {
                        const minutosInicio = timeToMinutes(hora_inicio);
                        const minutosFin = timeToMinutes(hora_fin);
                        const duracionVisita = minutosFin - minutosInicio;

                        if (duracionVisita > 0) {
                            vendedores[key].tiempoTotalVisitas += duracionVisita;
                            vendedores[key].cantidadVisitas += 1;
                        }
                    }

                });

                // **Iteración sobre los clientes procesados**
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
                    
                    // **Cálculo de visitas efectivas**
                    Object.values(vendedores).forEach(vendedor => {
                        const visitasEfectivas = Array.from(vendedor.registrosEfectividad.values()).filter(value => value > 0).length;
                        vendedor.clientesEfectivosMenor70 = visitasEfectivas;
                        vendedor.efectividadVisitas = vendedor.planificados > 0
                            ? ((visitasEfectivas / vendedor.planificados) * 100).toFixed(2) + "%"
                            : "S/P";
                    });
                    console.log(`Vendedor: ${vendedor.Vendedor}`);

                    vendedor.cumplimientoRuta = vendedor.planificados > 0
                        ? (((vendedor.Clientes_Con_Venta.size + vendedor.Clientes_Sin_Venta.size) / vendedor.planificados) * 100).toFixed(2) + "%"
                        : "S/P";
                });
                
                // **Conversión final de datos**
                const processedData = Object.values(vendedores).map(vendedor => {
                    const totalClientes = Number(vendedor.Clientes_Con_Venta.size) + Number(vendedor.cantidadFueraDeRuta);
                
                    return {
                        ...vendedor,
                        totalClientes,
                        cumplimientoRuta: vendedor.planificados > 0
                            ? (Math.min(((vendedor.Clientes_Con_Venta.size + vendedor.Clientes_Sin_Venta.size) / vendedor.planificados) * 100, 100)).toFixed(2) + "%"
                            : "S/P",
                        ticketPromedio: totalClientes > 0
                            ? "$" + (vendedor.totalVentas / totalClientes).toFixed(2)
                            : "$0.00",
                        tiempoPromedioVisitas: vendedor.cantidadVisitas > 0
                            ? formatTime(vendedor.tiempoTotalVisitas / vendedor.cantidadVisitas)
                            : "00:00:00",
                        efectividadVentas: vendedor.planificados > 0
                            ? ((parseFloat(vendedor.Clientes_Con_Venta.size) / parseFloat(vendedor.planificados)) * 100).toFixed(2) + "%"
                            : "S/P",
                        valorPorCliente: vendedor.clientesProcesados.size > 0
                            ? "$" + (vendedor.totalVentas / vendedor.clientesProcesados.size).toFixed(2)
                            : "$0.00",
                        clientessinVisitayVenta: ((vendedor.Clientes_Con_Venta.size + vendedor.Clientes_Sin_Venta.size) - vendedor.planificados),
                        valorTotalFueraRuta: "$" + vendedor.totalFueraDeRuta.toFixed(2)
                    };
                });
                

                setData(processedData);
            } catch (error) {
                console.error("Error procesando el archivo:", error);
                alert("Error al leer el archivo. Asegúrate de que tenga datos y esté bien formateado.");
            }
        };
    };


    const filteredData = useMemo(() => {
        return data.filter(row =>
            row.Vendedor?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [data, searchTerm]);
    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(data.map(row => ({
            Vendedor: row.Vendedor,
            Planificados: row.planificados,
            "Cumplimiento Ruta": row.cumplimientoRuta,
            "Efectividad Visitas": row.efectividadVisitas,
            "Efectividad Ventas": row.efectividadVentas,
            "Valor Total": row.totalVentas,
            "Valor Total FUERA DE RUTA": row.valorTotalFueraRuta,
            "Ticket Promedio": row.ticketPromedio,
            "Hora Inicio": row.hora_inicio || "Sin registro",
            "Hora Fin": row.hora_final || "Sin registro",    
            "Tiempo Promedio Visitas": row.tiempoPromedioVisitas,
            "Clientes con Venta": row.Clientes_Con_Venta.size,
            "Clientes sin Venta": row.Clientes_Sin_Venta.size,
            "Cantidad FUERA DE RUTA": row.cantidadFueraDeRuta,
            "Registros Efectividad": row.registrosEfectividad.size
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reporte");
        XLSX.writeFile(wb, "Reporte_Vendedores.xlsx");
    };


    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>Gestión de Ventas</Typography>
            <Grid container spacing={2} alignItems="center">
                <Grid item>
                    <Button variant="contained" component="label" sx={{ textTransform: "none" }}>
                        Subir Archivo
                        <input type="file" accept=".xls,.xlsx" hidden onChange={handleFileUpload} />
                    </Button>

                </Grid>
                <Grid item>
                    <Button variant="contained" color="primary" onClick={handleProcessFile} sx={{ textTransform: "none" }}>
                        Procesar Archivo
                    </Button>
                    <Button variant="contained" color="secondary" onClick={exportToExcel} sx={{ textTransform: "none" }} disabled={data.length === 0}>
                        Exportar a Excel
                    </Button>
                </Grid>

            </Grid>
            <br></br>
            <Grid item>
                <TextField
                    label="Buscar Vendedor"
                    variant="outlined"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="small"
                />
            </Grid>

            <TableContainer component={Paper} sx={{ mt: 3, borderRadius: 2, overflow: "hidden" }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <StyledTableCell>Vendedor</StyledTableCell>
                            <StyledTableCell>Planificados</StyledTableCell>
                            <StyledTableCell>Cumplimiento Ruta</StyledTableCell>
                            <StyledTableCell>Efectividad Visitas (70 m)</StyledTableCell>
                            <StyledTableCell>Efectividad de Ventas</StyledTableCell>
                            <StyledTableCell>Valor Total</StyledTableCell>
                            <StyledTableCell>Valor Total FUERA DE RUTA</StyledTableCell>
                            <StyledTableCell>Ticket Promedio</StyledTableCell>
                            <StyledTableCell>Hora Inicio</StyledTableCell>
                            <StyledTableCell>Hora Fin</StyledTableCell>                       
                            <StyledTableCell>Tiempo Promedio Visitas</StyledTableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredData.map((row, index) => (
                            <StyledTableRow key={index}>
                                <Tooltip
                                    title={
                                        <Box>
                                            <Box display="flex" alignItems="center">
                                                <AttachMoneyIcon fontSize="small" style={{ color: "white", marginRight: 4 }} /> Clientes con Venta: {row.Clientes_Con_Venta?.size || 0}
                                            </Box>
                                            <Box display="flex" alignItems="center">
                                                <CancelIcon fontSize="small" style={{ color: "#8B0000", marginRight: 4 }} /> Clientes sin Venta: {row.Clientes_Sin_Venta?.size || 0}
                                            </Box>
                                            <Box display="flex" alignItems="center">
                                                < WarningAmberIcon fontSize="small" style={{ color: "yellow", marginRight: 4 }} />
                                                Clientes sin venta y visita: {Math.abs(row.clientessinVisitayVenta || 0)}
                                            </Box>

                                            <Box display="flex" alignItems="center">
                                                <GpsFixedIcon fontSize="small" style={{ color: "blue", marginRight: 4 }} />
                                                Visitas en rango (70m): {row?.clientesEfectivosMenor70 ?? 0}
                                            </Box>

                                            <Box display="flex" alignItems="center">
                                                <CircleIcon fontSize="small" style={{ color: "orange", marginRight: 4 }} /> FUERA DE RUTA: {row.cantidadFueraDeRuta || 0}
                                            </Box>


                                        </Box>
                                    }
                                    arrow>
                                    <TableCell>
                                        <CircleIcon fontSize="small" style={{ color: getIconColor(row), marginRight: 8 }} />
                                        {row.Vendedor}
                                    </TableCell>
                                </Tooltip>
                                <TableCell sx={{ textAlign: "center" }}>{row.planificados}</TableCell>
                                <TableCell sx={{ textAlign: "center" }}>{row.cumplimientoRuta}</TableCell>
                                <TableCell sx={{ textAlign: "center" }}>{row.efectividadVisitas}</TableCell>
                                <TableCell sx={{ textAlign: "center" }}>{row.efectividadVentas}</TableCell>
                                <TableCell sx={{ textAlign: "center" }}>{"$" + (row.totalVentas?.toFixed(2) || "0.00")}</TableCell>
                                <TableCell sx={{ textAlign: "center" }}>{row.valorTotalFueraRuta}</TableCell>
                                <TableCell sx={{ textAlign: "center" }}>{row.ticketPromedio}</TableCell>
                                <TableCell sx={{ textAlign: "center" }}>{row.hora_inicio || "Sin registro"}</TableCell>
                                <TableCell sx={{ textAlign: "center" }}>{row.hora_final || "Sin registro"}</TableCell>
                                <TableCell sx={{ textAlign: "center" }}>{row.tiempoPromedioVisitas}</TableCell>
                            </StyledTableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};


export default ExcelReader;
