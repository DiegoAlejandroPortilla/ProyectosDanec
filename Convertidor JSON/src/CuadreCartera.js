import React, { useState } from 'react';
import * as XLSX from 'xlsx';

const Cartera = () => {
  const [excelData1, setExcelData1] = useState(null); // Primer archivo
  const [excelData2, setExcelData2] = useState(null); // Segundo archivo
  const [resultados, setResultados] = useState([]);

  const handleFileUpload1 = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]]; // Asumiendo que solo hay una hoja
        const json = XLSX.utils.sheet_to_json(sheet);
        setExcelData1(json);
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleFileUpload2 = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]]; // Asumiendo que solo hay una hoja
        const json = XLSX.utils.sheet_to_json(sheet);
        setExcelData2(json);
      };
      reader.readAsBinaryString(file);
    }
  };

  const procesarDatos = () => {
    const resultados = [];

    if (excelData1 && excelData2) {
      // Comparar datos
      excelData1.forEach((fila1) => {
        const tmaa30 = fila1['TMAA30'];
        const tmac03 = fila1['TMAC03'];
        const tmaap = fila1['TMAAP'];

        // Verificar CUE o IBA en TMAC03
        if (tmac03 === 'CUE' || tmac03 === 'IBA') {
          resultados.push(`Selecciona para TMAC03: ${tmac03}`);
        }

        excelData2.forEach((fila2) => {
          const documento = fila2['Documento'];
          const balance = fila2['Balance'];

          // Comparar TMAA30 con Documento y TMAAP con Balance
          if (tmaa30 === documento && tmaap === balance) {
            const diferencia = Number(balance) - Number(tmaa30); // Restar
            if (diferencia !== 0) {
              resultados.push(`No coincide: ${documento} con TMAA30 ${tmaa30}, diferencia: ${diferencia}`);
            } else {
              resultados.push(`Coincide: ${documento} con TMAA30 ${tmaa30}`);
            }
          }
        });
      });

      // Mostrar los resultados
      setResultados(resultados);
    }
  };

  return (
    <div>
      <h1>Comparar Cartera</h1>

      <input type="file" onChange={handleFileUpload1} accept=".xlsx,.xls" />
      <input type="file" onChange={handleFileUpload2} accept=".xlsx,.xls" />

      <button onClick={procesarDatos}>Procesar Datos</button>

      <div>
        <h3>Resultados:</h3>
        {resultados.length > 0 ? (
          <ul>
            {resultados.map((resultado, index) => (
              <li key={index}>{resultado}</li>
            ))}
          </ul>
        ) : (
          <p>No hay resultados aún.</p>
        )}
      </div>
    </div>
  );
};

export default Cartera;
