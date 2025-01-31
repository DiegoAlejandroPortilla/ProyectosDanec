import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Typography, TextField } from "@mui/material";

const ExcelReader = () => {
    const [file, setFile] = useState(null);
    const [data, setData] = useState([]); 
    const [search, setSearch] = useState(""); 

    const handleFileUpload = (event) => {
        setFile(event.target.files[0]);
    };

    const parseTime = (excelTime) => {
        if (!excelTime) return ""; 
        if (typeof excelTime === "string") return excelTime; 

        const date = XLSX.SSF.parse_date_code(excelTime);
        return `${date.H.toString().padStart(2, "0")}:${date.M.toString().padStart(2, "0")}:${date.S.toString().padStart(2, "0")}`;
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
                let totalFueraRuta = 0;
                let totalProgramado = 0;

                jsonData.forEach(({ nom_nombre, inicio, final, Total, Programado }) => {
                    const horaInicio = parseTime(inicio);
                    const horaFinal = parseTime(final);
                    const venta = parseFloat(Total) || 0;

                    if (Programado === "SI") {
                        totalProgramado += venta;
                    } else if (Programado === "FUERA DE RUTA") {
                        totalFueraRuta += venta;
                    }

                    if (!vendedores[nom_nombre]) {
                        vendedores[nom_nombre] = { inicio: horaInicio, final: horaFinal, totalVentas: venta, programado: 0, fueraDeRuta: 0, countProgramado: 0, countFueraRuta: 0 };
                    } else {
                        vendedores[nom_nombre].inicio = vendedores[nom_nombre].inicio < horaInicio ? vendedores[nom_nombre].inicio : horaInicio;
                        vendedores[nom_nombre].final = vendedores[nom_nombre].final > horaFinal ? vendedores[nom_nombre].final : horaFinal;
                        vendedores[nom_nombre].totalVentas += venta;
                    }

                    if (Programado === "SI") {
                        vendedores[nom_nombre].programado += venta;
                        vendedores[nom_nombre].countProgramado += 1; // Incrementar el contador de programados
                    } else if (Programado === "FUERA DE RUTA") {
                        vendedores[nom_nombre].fueraDeRuta += venta;
                        vendedores[nom_nombre].countFueraRuta += 1; // Incrementar el contador fuera de ruta
                    }
                });

                const processedData = Object.keys(vendedores).map((vendedor) => ({
                    nom_nombre: vendedor,
                    inicio: vendedores[vendedor].inicio,
                    final: vendedores[vendedor].final,
                    "Valor Total": vendedores[vendedor].programado.toFixed(2),
                    "Total Fuera de Ruta": vendedores[vendedor].fueraDeRuta.toFixed(2),
                    "Conteo Programado": vendedores[vendedor].countProgramado, // Mostrar el conteo programado
                    "Conteo Fuera de Ruta": vendedores[vendedor].countFueraRuta, // Mostrar el conteo fuera de ruta
                }));

                setData(processedData);

            } catch (error) {
                console.error("Error procesando el archivo:", error);
                alert("Error al leer el archivo. Asegúrate de que tenga datos y esté bien formateado.");
            }
        };
    };

    const filteredData = data.filter((row) =>
        row.nom_nombre.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ padding: 20 }}>
            <Typography variant="h5">Cargar Archivo Excel</Typography>
            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
            <Button variant="contained" color="primary" onClick={handleProcessFile} style={{ marginLeft: 10 }}>
                Procesar
            </Button>

            <TextField
                label="Buscar por vendedor"
                variant="outlined"
                fullWidth
                style={{ marginTop: 20 }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            <TableContainer component={Paper} style={{ marginTop: 20 }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>Vendedor</strong></TableCell>
                            <TableCell><strong>Primera Hora (Inicio)</strong></TableCell>
                            <TableCell><strong>Última Hora (Final)</strong></TableCell>
                            <TableCell><strong>Valor Total</strong></TableCell>
                            <TableCell><strong>Total Fuera de Ruta</strong></TableCell>
                            <TableCell><strong>Conteo Programado</strong></TableCell> {/* Nueva columna Conteo Programado */}
                            <TableCell><strong>Conteo Fuera de Ruta</strong></TableCell> {/* Nueva columna Conteo Fuera de Ruta */}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredData.length > 0 ? (
                            filteredData.map((row, index) => (
                                <TableRow key={index}>
                                    <TableCell>{row.nom_nombre}</TableCell>
                                    <TableCell>{row.inicio}</TableCell>
                                    <TableCell>{row.final}</TableCell>
                                    <TableCell>${row["Valor Total"]}</TableCell>
                                    <TableCell>${row["Total Fuera de Ruta"]}</TableCell>
                                    <TableCell>{row["Conteo Programado"]}</TableCell> {/* Mostrar el conteo programado */}
                                    <TableCell>{row["Conteo Fuera de Ruta"]}</TableCell> {/* Mostrar el conteo fuera de ruta */}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    No hay resultados para "{search}"
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    );
};

export default ExcelReader;
