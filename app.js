const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Configuration du dossier d'upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });

// Nettoyage des colonnes vides (utile côté serveur)
function removeEmptyColumns(data) {
  const rawCols = Object.keys(data[0]);
  const validCols = rawCols.filter(col =>
    data.some(row => row[col] !== null && row[col] !== undefined && row[col] !== '')
  );

  return data.map(row => {
    const cleanedRow = {};
    validCols.forEach(col => {
      cleanedRow[col] = row[col];
    });
    return cleanedRow;
  });
}

// Endpoint de réception de fichier Excel
app.post('/upload', upload.single('excel'), (req, res) => {
  try {
    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      return res.status(400).json({ error: '❌ La première feuille du fichier est vide ou invalide.' });
    }

    const jsonData = XLSX.utils.sheet_to_json(sheet);
    if (jsonData.length === 0) {
      return res.status(400).json({ error: '❌ La feuille ne contient aucune donnée exploitable.' });
    }

    const cleanedData = removeEmptyColumns(jsonData);

    // Optionnel : supprimer le fichier après lecture
    fs.unlinkSync(filePath);

    return res.json({ data: cleanedData });
  } catch (err) {
    console.error('Erreur de lecture du fichier Excel :', err);
    return res.status(500).json({ error: '❌ Erreur lors de la lecture du fichier Excel.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});
