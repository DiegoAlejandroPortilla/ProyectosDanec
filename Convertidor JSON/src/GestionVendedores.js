import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Typography, TextField, Grid } from "@mui/material";

const ExcelReader = () => {
    const [file, setFile] = useState(null);
    const [data, setData] = useState([]);
    const [search, setSearch] = useState("");
    const [duplicatesCount, setDuplicatesCount] = useState(0);

    const handleFileUpload = (event) => {
        setFile(event.target.files[0]);
    };

    const parseTime = (excelTime) => {
        if (!excelTime) return "";
        if (typeof excelTime === "string") return excelTime;

        const date = XLSX.SSF.parse_date_code(excelTime);
        return `${date.H.toString().padStart(2, "0")}:${date.M.toString().padStart(2, "0")}:${date.S.toString().padStart(2, "0")}`;
    };

    const getColorForTime = (time, type) => {
        const [hours, minutes] = time.split(":").map(Number);
        if (type === "inicio" && hours >= 9) return "red"; // Si la hora de inicio es mayor o igual a las 9:00, pintarlo de rojo
        if (type === "final" && hours < 15) return "red"; // Si la hora final es menor a las 15:00, pintarlo de rojo
        return "initial"; // Si no, el color es el predeterminado
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

                if (workbook.SheetNames.length === 0) {
                    alert("El archivo Excel está vacío.");
                    return;
                }

                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: 0 });

                if (jsonData.length === 0) {
                    alert("No se encontraron datos en la hoja seleccionada.");
                    return;
                }

                const vendedores = {};
                const seenDescricion = new Map();
                let duplicateCounter = 0;

                jsonData.forEach(({ nom_nombre, inicio, final, Total, Programado, Descricion }) => {
                    if (!nom_nombre) return;
                    const horaInicio = parseTime(inicio);
                    const horaFinal = parseTime(final);
                    const venta = parseFloat(Total) || 0;
                    const key = nom_nombre;
                    const uniqueKey = `${nom_nombre}_${Descricion}`;

                    if (!vendedores[key]) {
                        vendedores[key] = { 
                            nom_nombre, 
                            inicio: horaInicio, 
                            final: horaFinal, 
                            totalVentas: 0, 
                            fueraDeRuta: 0, 
                            countDuplicados: 0, 
                            countProgramadoTotal0: 0, 
                            countProgramadoTotalMayor0: 0, 
                            countFueraRuta: 0, 
                        };
                    }

                    vendedores[key].inicio = vendedores[key].inicio < horaInicio ? vendedores[key].inicio : horaInicio;
                    vendedores[key].final = vendedores[key].final > horaFinal ? vendedores[key].final : horaFinal;
                    vendedores[key].totalVentas += venta;

                    if (seenDescricion.has(uniqueKey)) {
                        let existingData = seenDescricion.get(uniqueKey);
                        if (existingData.total === 0 && venta > 0) {
                            seenDescricion.set(uniqueKey, { total: venta });
                        } else if (existingData.total === venta) {
                            vendedores[key].countDuplicados += 1;
                            duplicateCounter += 1;
                        }
                    } else {
                        seenDescricion.set(uniqueKey, { total: venta });

                        if (venta === 0) {
                            vendedores[key].countProgramadoTotal0 += 1;
                        } else {
                            vendedores[key].countProgramadoTotalMayor0 += 1;
                        }
                    }

                    if (Programado === "FUERA DE RUTA") {
                        vendedores[key].fueraDeRuta += venta;
                        vendedores[key].countFueraRuta += 1;
                    }
                });

                setDuplicatesCount(duplicateCounter);

                if (duplicateCounter > 0) {
                    alert("Se encontraron registros duplicados.");
                }

                const processedData = Object.values(vendedores).map((vendedor) => ({
                    nom_nombre: vendedor.nom_nombre,
                    inicio: vendedor.inicio,
                    final: vendedor.final,
                    "Valor Total": vendedor.totalVentas.toFixed(2),
                    "Total Fuera de Ruta": vendedor.fueraDeRuta.toFixed(2),
                    "Cantidad Duplicados": vendedor.countDuplicados,
                    "Conteo Programado (Total = 0)": vendedor.countProgramadoTotal0,
                    "Conteo Programado (Total > 0)": vendedor.countProgramadoTotalMayor0,
                    "Conteo Fuera de Ruta": vendedor.countFueraRuta
                }));

                setData(processedData);
            } catch (error) {
                console.error("Error procesando el archivo:", error);
                alert("Error al leer el archivo. Asegúrate de que tenga datos y esté bien formateado.");
            }
        };
    };

    const handleExportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Datos Procesados");

        // Generar archivo Excel y descargarlo
        XLSX.writeFile(wb, "datos_procesados.xlsx");
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
                    <Button variant="contained" color="secondary" fullWidth onClick={handleExportToExcel}>
                        Descargar Excel
                    </Button>
                </Grid>
                <Grid item>
                    <TextField label="Buscar" variant="outlined" fullWidth margin="normal" value={search} onChange={(e) => setSearch(e.target.value)} />
                </Grid>
                <Typography variant="h6" color={duplicatesCount > 0 ? "error" : "initial"}>
                    Duplicados encontrados: {duplicatesCount}
                </Typography>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Nombre</TableCell>
                                <TableCell>Inicio</TableCell>
                                <TableCell>Final</TableCell>
                                <TableCell>Valor Total</TableCell>
                                <TableCell>Total Fuera de Ruta</TableCell>
                                <TableCell>Cantidad Duplicados</TableCell>
                                <TableCell>Conteo Programado (Total = 0)</TableCell>
                                <TableCell>Conteo Programado (Total > 0)</TableCell>
                                <TableCell>Conteo Fuera de Ruta</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.filter(row => row.nom_nombre.toLowerCase().includes(search.toLowerCase())).map((row, index) => (
                                <TableRow key={index}>
                                    <TableCell>{row.nom_nombre}</TableCell>
                                    <TableCell style={{ color: getColorForTime(row.inicio, "inicio") }}>{row.inicio}</TableCell>
                                    <TableCell style={{ color: getColorForTime(row.final, "final") }}>{row.final}</TableCell>
                                    <TableCell>${row["Valor Total"]}</TableCell>
                                    <TableCell>${row["Total Fuera de Ruta"]}</TableCell>
                                    <TableCell>{row["Cantidad Duplicados"]}</TableCell>
                                    <TableCell>{row["Conteo Programado (Total = 0)"]}</TableCell>
                                    <TableCell>{row["Conteo Programado (Total > 0)"]}</TableCell>
                                    <TableCell>{row["Conteo Fuera de Ruta"]}</TableCell>
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
