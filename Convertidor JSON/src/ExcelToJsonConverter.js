import React, { useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import Swal from "sweetalert2";
import "./ExcelToJsonProcessor.css";

const ExcelToJsonProcessor = () => {
    const [excelFile, setExcelFile] = useState(null);
    const [jsonPreview, setJsonPreview] = useState("");
    const [fileName, setFileName] = useState("");

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setExcelFile(file);
            setFileName(file.name.replace(/\.[^/.]+$/, ".json"));
        } else {
            Swal.fire("Error", "No se seleccionó ningún archivo", "error");
        }
    };

    const groupBy = (array, keys) => {
        return array.reduce((result, item) => {
            const key = keys.map((k) => item[k]).join(",");
            if (!result[key]) {
                result[key] = [];
            }
            result[key].push(item);
            return result;
        }, {});
    };

    const formatFecha = (fecha) => {
        if (!fecha || fecha === 0 || fecha === null || fecha === undefined) {
            return 'Fecha no proporcionada'; // Mensaje predeterminado para fechas no válidas
        }
    
        if (!isNaN(fecha)) {
            const excelEpoch = (fecha - 25569) * 86400 * 1000; // Convertir desde Excel
            const excelDate = new Date(excelEpoch);
            const year = excelDate.getUTCFullYear();
            const month = String(excelDate.getUTCMonth() + 1).padStart(2, '0');
            const day = String(excelDate.getUTCDate()).padStart(2, '0');
            return `${year}/${month}/${day}`;
        }
    
        const dateParts = fecha.split('/');
        if (dateParts.length === 3) {
            const day = String(dateParts[0]).padStart(2, '0');
            const month = String(dateParts[1]).padStart(2, '0');
            const year = dateParts[2];
            return `${year}/${month}/${day}`;
        }
    
        return 'Fecha inválida';
    };
    
    

    const validateRow = (row) => {
        const requiredFields = ["EMPRESA", "TIPODOCUMENTO", "SERIE", "NUMERODOCUMENTO", "FECHA"];
        return requiredFields.every((field) => row[field]);
    };

    const saveJsonToFile = (jsonData, name) => {
        try {
            const blob = new Blob([JSON.stringify(jsonData, null, 4)], { type: "application/json" });
            saveAs(blob, name);
            Swal.fire("Éxito", `Archivo ${name} guardado correctamente.`, "success");
        } catch (error) {
            Swal.fire("Error", "No se pudo guardar el archivo JSON", "error");
        }
    };

    const processExcelToJson = async () => {
        if (!excelFile) {
            Swal.fire("Error", "Por favor, selecciona un archivo Excel.", "error");
            return;
        }

        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

                const consolidatedData = [];
                const invalidRows = [];
                const groupedData = groupBy(jsonData, ["CLIENTE", "NUMERODOCUMENTO"]);

                Object.entries(groupedData).forEach(([key, rows]) => {
                    const [clientId, documentId] = key.split(",");

                    rows.forEach((row) => {
                        if (!validateRow(row)) {
                            invalidRows.push(row);
                            return;
                        }
                    });

                    consolidatedData.push({
                        Empresa: String(rows[0].EMPRESA).trim(),
                        TipoDocumento: String(rows[0].TIPODOCUMENTO).trim(),
                        Serie: String(rows[0].SERIE).trim(),
                        NumeroDocumento: parseInt(documentId),
                        Cliente: String(clientId).trim(),
                        Sucursal: parseInt(rows[0].SUCURSAL),
                        Deposito: String(rows[0].DEPOSITO).trim(),
                        ListaPrecio: parseInt(rows[0].LISTAPRECIO),
                        Moneda: parseInt(rows[0].MONEDA),
                        Vendedor: String(rows[0].VENDEDOR).trim(),
                        Itinerario: String(rows[0].ITINERARIO).trim(),
                        Fecha: formatFecha(rows[0].FECHA),
                        FechaVencimiento: formatFecha(rows[0].FECHAVENCIMIENTO),
                        FechaEntrega: formatFecha(rows[0].FECHAENTREGA),
                        Observaciones: String(rows[0].OBSERVACIONES).trim(),
                        Observaciones2: String(rows[0].OBSERVACIONES2).trim(),
                        NumeroPedido: String(rows[0].NUMEROPEDIDO).trim(),
                        NroTranspo: String(rows[0].TRANSPORTISTA).trim(),
                        NroPlaca: String(rows[0].PLACA).trim(),
                        NroCarga: String(rows[0].NROEMBARQUE).trim(),
                        TipoDocJDE: String(rows[0].TIPODOCUMENTOSJDE).trim(),
                        CondicionP: String(rows[0].CONDICIONPAGO).trim(),
                        TotFacJDE: String(rows[0].TOTFACTJDE).trim(),
                        Items: rows.map(row => ({
                            Articulo: String(row.ARTICULO).trim(),
                            CodReglon: String(row.CODRENGLON).trim(),
                            Cantidad: parseInt(row.CANTIDAD),
                            PrecioVenta: parseFloat(String(row.PRECIOVENTA).replace(',', '.').trim()),
                            PorcDescuento: parseInt(row.PORCDESCUENTO),
                            bonificacion: String(row['BONIFICACION']).trim().toLowerCase() === 'true'
                        })),
                    });
                });

                if (invalidRows.length > 0) {
                    Swal.fire(
                        "Advertencia",
                        `Se encontraron ${invalidRows.length} filas inválidas. Verifica los datos.`,
                        "warning"
                    );
                }
    
                const uniqueNroEmbarques = [...new Set(consolidatedData.map((d) => d.NroCarga))];
    
                if (uniqueNroEmbarques.length > 1) {
                    Swal.fire({
                        title: "Múltiples NROEMBARQUE detectados",
                        text: "¿Qué deseas hacer con los archivos?",
                        icon: "question",
                        showCancelButton: true,
                        showDenyButton: true,
                        confirmButtonText: "Descargar separados",
                        denyButtonText: "Combinar en uno solo",
                        cancelButtonText: "Cancelar",
                    }).then((result) => {
                        if (result.isConfirmed) {
                            const zip = new JSZip();
                            uniqueNroEmbarques.forEach((nroEmbarque) => {
                                const filteredData = consolidatedData.filter((d) => d.NroCarga === nroEmbarque);
                                zip.file(`NroEmbarque_${nroEmbarque}.json`, JSON.stringify({ documentos: filteredData }, null, 4));
                            });
    
                            zip.generateAsync({ type: "blob" }).then((content) => {
                                saveAs(content, "archivos_json_por_embarque.zip");
                                Swal.fire("Éxito", "Archivos descargados por NROEMBARQUE", "success");  // Mostrar modal de éxito
                            });
                        } else if (result.isDenied) {
                            const finalData = { documentos: consolidatedData };
                            saveJsonToFile(finalData, fileName || "output.json");
                            Swal.fire("Éxito", "Archivo combinado descargado correctamente", "success");  // Mostrar modal de éxito
                        }
                    });
                } else {
                    const finalData = { documentos: consolidatedData };
                    saveJsonToFile(finalData, fileName || "output.json");
                    Swal.fire("Éxito", "Archivo combinado descargado correctamente", "success");  // Mostrar modal de éxito
                }
            } catch (error) {
                Swal.fire("Error", "Ocurrió un error al procesar el archivo.", "error");
            }
        };
    
        reader.readAsArrayBuffer(excelFile);
    };

    return (
        <div className="processor-container">
            <img src="/logo.png" alt="Logo" className="logo" />
            <h1>Procesador de Excel a JSON Embarques</h1>
            <div className="file-upload">
                <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
                <button onClick={processExcelToJson}>Procesar Archivo</button>
            </div>
            {jsonPreview && (
                <textarea
                    className="json-preview"
                    readOnly
                    value={jsonPreview}
                    placeholder="Vista previa del JSON generado"
                />
            )}
        </div>
    );
};

export default ExcelToJsonProcessor;