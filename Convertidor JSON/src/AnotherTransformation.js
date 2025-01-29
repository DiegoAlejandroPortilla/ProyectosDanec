import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import Swal from 'sweetalert2';

function ExcelToJsonCartera() {
    const [excelFile, setExcelFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [jsonPreview, setJsonPreview] = useState('');

    const handleFileUpload = (event) => {
        setExcelFile(event.target.files[0]);
    };

    const handleFileNameChange = (event) => {
        setFileName(event.target.value.trim());
    };

    const processExcelToJson = () => {
        if (!excelFile) {
            Swal.fire('Error', 'Por favor, selecciona un archivo Excel.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            const formattedData = jsonData.map(row => ({
                idexterno: String(row.IDEXTERNO || "").trim(),
                iddocpwst: String(row.IDDOCPWST || "").trim(),
                fechaemision: formatFecha(String(row.FECHAEMISION || "").trim()),
                ruta: String(row.RUTA || "").trim(),
                descripcionmov: String(row.DESCRIPCIONMOV || "").trim(),
                procesadosap: "1",
                saldo: parseFloat(row.SALDO) || 0,
                fechavencimiento: formatFecha(String(row.FECHAVENCIMIENTO || "").trim()),
                cedis: String(row.CEDIS || "").trim(),
                cliente: String(row.CLIENTE || "").trim(),
                sucursal: String(row.SUCURSAL || "").trim(),
                moneda: String(row.MONEDA || "D").trim(),
                tipodoc: String(row.TIPODOC || "").trim(),
                empresa: String(row.EMPRESA || "").trim()
            }));

            const finalJson = { cuentasxcobrar: formattedData };
            setJsonPreview(JSON.stringify(finalJson, null, 4));
        };
        reader.readAsArrayBuffer(excelFile);
    };

    function formatFecha(fecha) {
        if (!fecha) return "";
        if (!isNaN(fecha)) {
            const parsedDate = XLSX.SSF.parse_date_code(Number(fecha));
            return `${String(parsedDate.d).padStart(2, '0')}/${String(parsedDate.m).padStart(2, '0')}/${parsedDate.y}`;
        }
        if (typeof fecha === 'string') {
            const [año, mes, día] = fecha.split('-');
            return `${día.padStart(2, '0')}/${mes.padStart(2, '0')}/${año}`;
        }
        return "";
    }

    const saveJsonToFile = () => {
        if (!fileName.trim()) {
            Swal.fire('Error', 'Por favor, ingresa un nombre para el archivo.', 'error');
            return;
        }

        const blob = new Blob([jsonPreview], { type: 'application/json' });
        saveAs(blob, `${fileName}.json`);
        Swal.fire('Éxito', 'Archivo JSON guardado correctamente.', 'success');
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ textAlign: 'center', color: '#333' }}>Convertidor de Excel a JSON (Cartera)</h1>
            <div style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '5px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
                <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ width: '100%', padding: '10px', fontSize: '16px' }} />
                <button onClick={processExcelToJson} style={{ width: '100%', padding: '10px', background: '#007BFF', color: '#fff', fontSize: '16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Procesar Excel</button>
            </div>
            <div style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '5px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontSize: '16px' }}>Nombre del archivo:</label>
                <input type="text" value={fileName} onChange={handleFileNameChange} placeholder="Ejemplo: miArchivo" style={{ width: '100%', padding: '10px', fontSize: '16px', border: '1px solid #ddd', borderRadius: '4px' }} />
            </div>
            <h1 style={{ textAlign: 'center', color: '#333' }}>Previsualizador</h1>
            <div style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '5px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
                <textarea value={jsonPreview} readOnly placeholder="Aquí se mostrará el JSON generado..." style={{ width: '100%', height: '400px', padding: '10px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px', background: '#fff', fontFamily: 'monospace', resize: 'none' }} />
            </div>
            <button onClick={saveJsonToFile} style={{ width: '100%', padding: '10px', background: '#007BFF', color: '#fff', fontSize: '16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }} disabled={!jsonPreview}>Guardar JSON</button>
        </div>
    );
}

export default ExcelToJsonCartera;