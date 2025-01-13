import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

function ExcelToJsonConverter() {
    const [excelFile, setExcelFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [jsonPreview, setJsonPreview] = useState('');

    const handleFileUpload = (event) => {
        setExcelFile(event.target.files[0]);
    };

    const handleFileNameChange = (event) => {
        setFileName(event.target.value);
    };

    const processExcelToJson = async () => {
        if (!excelFile) {
            alert('Por favor, selecciona un archivo Excel.');
            return;
        }

        const reader = new FileReader();

        reader.onload = (event) => {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Asume que los datos están en la primera hoja
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

            // Procesamiento de datos para estructurar JSON
            const consolidatedData = [];
            console.log(jsonData);
            console.log(consolidatedData);
            const groupedData = groupBy(jsonData, ['CLIENTE', 'NUMERODOCUMENTO']);

            Object.entries(groupedData).forEach(([key, rows]) => {
                const [clientId, documentId] = key.split(',');
                consolidatedData.push({
                    Empresa: String(rows[0].EMPRESA),
                    TipoDocumento: rows[0].TIPODOCUMENTO,
                    Serie: rows[0].SERIE,
                    NumeroDocumento: parseInt(documentId),
                    Cliente: String(clientId),
                    Sucursal: parseInt(rows[0].SUCURSAL),
                    Deposito: rows[0].DEPOSITO,
                    ListaPrecio: parseInt(rows[0].LISTAPRECIO),
                    Moneda: parseInt(rows[0].MONEDA),
                    Vendedor: rows[0].VENDEDOR,
                    Itinerario: rows[0].ITINERARIO,
                    Fecha: rows[0].FECHA,
                    FechaVencimiento: rows[0].FECHAVENCIMIENTO,
                    FechaEntrega: rows[0].FECHAENTREGA,
                    Observaciones: rows[0].OBSERVACIONES,
                    Observaciones2: rows[0].OBSERVACIONES2,
                    NumeroPedido: rows[0].NUMEROPEDIDO,
                    NroTranspo: rows[0].TRANSPORTISTA,
                    NroPlaca: rows[0].PLACA,
                    NroCarga: rows[0].NROEMBARQUE,
                    TipoDocJDE: rows[0].TIPODOCUMENTOSJDE,
                    CondicionP: rows[0].CONDICIONPAGO,
                    Items: rows.map(row => ({
                        Articulo: String(row.ARTICULO),
                        CodReglon: row.CODRENGLON,
                        Cantidad: parseInt(row.CANTIDAD),
                        PrecioVenta: parseFloat(String(row.PRECIOVENTA).replace(',', '.')),
                        PorcDescuento: parseInt(row.PORCDESCUENTO),
                        bonificacion: String(row['BONIFICACION']).toLowerCase() === 'true'
                    })),
                });
            });

            const finalData = { documentos: consolidatedData };

            // Actualiza la vista previa del JSON
            setJsonPreview(JSON.stringify(finalData, null, 4));
        };

        reader.readAsArrayBuffer(excelFile);
    };

    const saveJsonToFile = () => {
        if (!fileName.trim()) {
            alert('Por favor, ingresa un nombre para el archivo.');
            return;
        }

        const blob = new Blob([jsonPreview], { type: 'application/json' });
        saveAs(blob, `${fileName}.json`);
        alert('Archivo JSON guardado exitosamente.');
    };

    // Helper para agrupar por campos específicos
    const groupBy = (array, keys) => {
        return array.reduce((result, currentValue) => {
            const key = keys.map(k => currentValue[k]).join(',');
            (result[key] = result[key] || []).push(currentValue);
            return result;
        }, {});
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Convertidor de Excel a JSON</h1>
            <div style={styles.card}>
                <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileUpload}
                    style={styles.inputFile}
                />
                <button onClick={processExcelToJson} style={styles.button}>
                    Procesar Excel
                </button>
            </div>
            <div style={styles.card}>
                <label style={styles.label}>Nombre del archivo:</label>
                <input
                    type="text"
                    value={fileName}
                    onChange={handleFileNameChange}
                    placeholder="Ejemplo: miArchivo"
                    style={styles.inputText}
                />
            </div>
            <h1 style={styles.header}>Previsualizador</h1>
            <div style={styles.card}>
                <textarea
                    value={jsonPreview}
                    readOnly
                    placeholder="Aquí se mostrará el JSON generado..."
                    style={styles.textarea}
                />
            </div>
            <button onClick={saveJsonToFile} style={styles.button} disabled={!jsonPreview}>
                Guardar JSON
            </button>
        </div>
    );
}

const styles = {
    container: {
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '800px',
        margin: '0 auto',
    },
    header: {
        textAlign: 'center',
        color: '#333',
    },
    card: {
        marginBottom: '20px',
        padding: '15px',
        background: '#f9f9f9',
        borderRadius: '5px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
    label: {
        display: 'block',
        marginBottom: '10px',
        fontSize: '16px',
    },
    inputFile: {
        width: '100%',
        padding: '10px',
        fontSize: '16px',
    },
    inputText: {
        width: '100%',
        padding: '10px',
        fontSize: '16px',
        border: '1px solid #ddd',
        borderRadius: '4px',
    },
    textarea: {
        width: '100%',
        height: '400px',
        padding: '10px',
        fontSize: '14px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        background: '#fff',
        fontFamily: 'monospace',
        resize: 'none',
    },
    button: {
        width: '100%',
        padding: '10px',
        background: '#007BFF',
        color: '#fff',
        fontSize: '16px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    buttonDisabled: {
        background: '#ccc',
    },
};

export default ExcelToJsonConverter;
