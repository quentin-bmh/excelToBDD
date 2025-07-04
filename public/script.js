let currentData = null; // variable globale pour stocker les données courantes

// Réinitialisation de l'application
document.getElementById('reset-app')?.addEventListener('click', () => {
  document.getElementById('preview-container').innerHTML = '';
  document.getElementById('type-form').innerHTML = '';
  document.getElementById('create-sql').textContent = '';
  document.getElementById('insert-sql').textContent = '';
  document.getElementById('table-name').value = 'ma_table';
  document.getElementById('error-message').textContent = '';
  document.getElementById('generate-sql-btn').style.display = 'none';
  currentData = null;
});

document.getElementById('toggle-theme')?.addEventListener('click', () => {
  document.body.classList.toggle('dark');
});

document.getElementById('upload-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fileInput = document.getElementById('excel-file');
  if (!fileInput.files.length) {
    showError('Veuillez sélectionner un fichier Excel.');
    return;
  }

  const formData = new FormData();
  formData.append('excel', fileInput.files[0]);

  try {
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Erreur serveur');

    const { data: rawData } = await response.json();

    if (!rawData || !rawData.length) {
      showError('Fichier vide ou format non reconnu.');
      return;
    }

    const cleanedData = removeEmptyColumns(rawData);
    showPreview(cleanedData);
    generateColumnTypeForm(cleanedData);
    showError('');
    currentData = cleanedData;
  } catch (err) {
    showError(`Erreur de chargement : ${err.message}`);
    currentData = null;
  }
});

function showPreview(data) {
  const previewEl = document.getElementById('preview-container');
  previewEl.textContent = JSON.stringify(data, null, 2);
}

function inferType(values) {
  let isNumber = true;
  let isDate = true;

  for (const value of values) {
    if (value === '') continue;
    if (isNumber && isNaN(Number(value))) isNumber = false;
    if (isDate && isNaN(Date.parse(value))) isDate = false;
  }

  if (isNumber) return 'INT';
  if (isDate) return 'DATE';
  return 'VARCHAR(255)';
}

function escapeSQL(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function removeEmptyColumns(data) {
  if (!data.length) return [];

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

function generateSQL(data) {
  const createEl = document.getElementById('create-sql');
  const insertEl = document.getElementById('insert-sql');
  const columns = Object.keys(data[0]);

  const colTypes = {};
  columns.forEach(col => {
    const select = document.querySelector(`select[name="${col}"]`);
    colTypes[col] = select ? select.value : 'VARCHAR(255)';
  });

  const tableNameInput = document.getElementById('table-name');
  const tableName = tableNameInput?.value?.trim() || 'ma_table';

  const createSQL =
    `CREATE TABLE "${tableName}" (\n` +
    columns.map(col => `  "${col}" ${colTypes[col]}`).join(',\n') +
    `\n);`;

  const insertSQL = data.map(row => {
    const values = columns.map(col => escapeSQL(row[col]));
    return `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});`;
  }).join('\n');

  createEl.textContent = createSQL;
  insertEl.textContent = insertSQL;
}

function generateColumnTypeForm(data) {
  const typeForm = document.getElementById('type-form');
  const generateBtn = document.getElementById('generate-sql-btn');
  typeForm.innerHTML = '';
  generateBtn.style.display = 'inline-block';

  const columns = Object.keys(data[0]);

  columns.forEach(col => {
    const values = data.map(row => row[col]);
    const inferredType = inferType(values);

    const wrapper = document.createElement('div');
    wrapper.className = 'form-group';

    const label = document.createElement('label');
    label.textContent = col;
    label.style.fontWeight = 'bold';

    const select = document.createElement('select');
    select.name = col;

    const options = ['INT', 'FLOAT', 'VARCHAR(255)', 'TEXT', 'DATE', 'BOOLEAN'];
    options.forEach(type => {
      const opt = document.createElement('option');
      opt.value = type;
      opt.textContent = type;
      if (type === inferredType) opt.selected = true;
      select.appendChild(opt);
    });

    wrapper.appendChild(label);
    wrapper.appendChild(select);
    typeForm.appendChild(wrapper);
  });
}

// Affiche une erreur utilisateur
function showError(message) {
  const errorEl = document.getElementById('error-message');
  errorEl.textContent = message || '';
}

// Boutons de copie SQL
document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target');
    const content = document.getElementById(targetId)?.textContent;

    if (!content) return;

    navigator.clipboard.writeText(content)
      .then(() => {
        btn.textContent = '✅ Copié !';
        setTimeout(() => btn.textContent = '📋 Copier', 2000);
      })
      .catch(() => {
        alert("Erreur lors de la copie.");
      });
  });
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('generate-sql-btn')?.addEventListener('click', () => {
    if (!currentData) {
        showError("❌ Aucune donnée chargée pour générer le SQL.");
        return;
    }
    generateSQL(currentData);
    document.getElementById('sql-output').style.display = 'block';
    });

});


