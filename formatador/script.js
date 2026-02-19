// ============================================================
//  Padronizador de Endereços — script.js
// ============================================================

// ── Abreviações (fallback quando ViaCEP não retorna logradouro) ──
const ABBR = [
  [/^R\s+/i, "Rua "],
  [/\bR\.\s*/gi, "Rua "],
  [/^Av\s+/i, "Avenida "],
  [/\bAv\.\s*/gi, "Avenida "],
  [/^Al\s+/i, "Alameda "],
  [/\bAl\.\s*/gi, "Alameda "],
  [/\bTrav\.\s*/gi, "Travessa "],
  [/^Trav\s+/i, "Travessa "],
  [/\bEst\.\s*/gi, "Estrada "],
  [/\bRod\.\s*/gi, "Rodovia "],
  [/\bPça\b\s*/gi, "Praça "],
  [/\bPç\.\s*/gi, "Praça "],
  [/\bLgo\b\s*/gi, "Largo "],
  [/\bCond\.\s*/gi, "Condomínio "],
  [/\bBl\.\s*/gi, "Bloco "],
  [/\bApt\.\s*/gi, "Apartamento "],
  [/\bApto\b\s*/gi, "Apartamento "],
  [/\bSl\.\s*/gi, "Sala "],
  [/\bDr\.\s*/gi, "Doutor "],
  [/\bDra\.\s*/gi, "Doutora "],
  [/\bProf\.\s*/gi, "Professor "],
  [/\bProfa\.\s*/gi, "Professora "],
  [/\bEng\.\s*/gi, "Engenheiro "],
  [/\bMin\.\s*/gi, "Ministro "],
  [/\bMin\s+/gi, "Ministro "],
  [/\bCel\.\s*/gi, "Coronel "],
  [/\bCap\.\s*/gi, "Capitão "],
  [/\bPres\.\s*/gi, "Presidente "],
  [/\bSen\.\s*/gi, "Senador "],
  [/\bDep\.\s*/gi, "Deputado "],
  [/\bVer\.\s*/gi, "Vereador "],
  [/\bGov\.\s*/gi, "Governador "],
  [/\bCons\.\s*/gi, "Conselheiro "],
  [/\bAlm\.\s*/gi, "Almirante "],
  [/\bBrig\.\s*/gi, "Brigadeiro "],
];

function applyAbbr(address) {
  let s = String(address || "");
  for (const [rx, rep] of ABBR) s = s.replace(rx, rep);
  return s.replace(/\s{2,}/g, " ").trim();
}

// ── Extrai número + complemento do endereço original ──
// Exemplos:
//   "R Miller, 297"                          → "297"
//   "R Min Firmino Whitaker, 27, Loja"       → "27, Loja"
//   "Rua Maria Marcolina, 200, sala 01 ..."  → "200, sala 01 ..."
function extractRest(original) {
  const s = String(original).trim();
  const m1 = s.match(/,\s*(\d+.*)$/);
  if (m1) return m1[1].trim();
  const m2 = s.match(/\s+(\d+\S*.*)$/);
  if (m2) return m2[1].trim();
  return null;
}

function buildAddress(original, logradouro) {
  const rest = extractRest(original);
  return rest ? logradouro + ", " + rest : logradouro;
}

// ── ViaCEP com cache ──
const cepCache = {};

async function fetchViaCEP(rawCep) {
  const cep = String(rawCep).replace(/\D/g, ""); // remove hífen, espaços, etc.
  if (cep.length !== 8) return null;
  if (cepCache[cep] !== undefined) return cepCache[cep];
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!res.ok) {
      cepCache[cep] = null;
      return null;
    }
    const data = await res.json();
    if (data.erro) {
      cepCache[cep] = null;
      return null;
    }
    cepCache[cep] = data;
    return data;
  } catch {
    cepCache[cep] = null;
    return null;
  }
}

// ── Estado global ──
let workbook = null;
let sheetName = "";
let parsedRows = [];
let headers = [];
let isXlsx = false;
let processedRows = [];
let statsOk = 0,
  statsSkip = 0,
  statsErr = 0;

// ── Referências DOM ──
const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const fileSelected = document.getElementById("fileSelected");
const configCard = document.getElementById("configCard");
const colAddress = document.getElementById("colAddress");
const colCep = document.getElementById("colCep");
const btnProcess = document.getElementById("btnProcess");
const progressCard = document.getElementById("progressCard");
const progressBar = document.getElementById("progressBar");
const progressLabel = document.getElementById("progressLabel");
const progressCount = document.getElementById("progressCount");
const logEl = document.getElementById("log");
const resultCard = document.getElementById("resultCard");
const btnDownload = document.getElementById("btnDownload");

// ── Drag & drop ──
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () =>
  dropZone.classList.remove("dragover"),
);
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) loadFile(fileInput.files[0]);
});

// ── Carregar arquivo ──
function loadFile(file) {
  isXlsx = /\.xlsx?$/i.test(file.name);
  fileSelected.textContent =
    "✓ " + file.name + "  (" + (file.size / 1024).toFixed(1) + " KB)";
  fileSelected.style.display = "block";

  const reader = new FileReader();
  if (isXlsx) {
    reader.onload = (e) => parseXlsx(e.target.result);
    reader.readAsArrayBuffer(file);
  } else {
    reader.onload = (e) => parseCsv(e.target.result);
    reader.readAsText(file, "utf-8");
  }
}

// ── Parser XLSX (SheetJS) ──
function parseXlsx(buffer) {
  workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  sheetName = workbook.SheetNames[0];
  const ws = workbook.Sheets[sheetName];
  parsedRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  setupColumns();
}

// ── Parser CSV ──
function parseCsv(text) {
  workbook = null;
  const sep = detectSep(text);
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cols = [];
    let cur = "",
      inQ = false;
    for (const c of line) {
      if (c === '"') {
        inQ = !inQ;
      } else if (c === sep && !inQ) {
        cols.push(cur);
        cur = "";
      } else cur += c;
    }
    cols.push(cur);
    rows.push(cols);
  }
  parsedRows = rows;
  setupColumns();
}

function detectSep(text) {
  const line = text.split("\n")[0];
  const counts = { ",": 0, ";": 0, "\t": 0, "|": 0 };
  for (const c of line) if (counts[c] !== undefined) counts[c]++;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// ── Montar selects de colunas ──
function setupColumns() {
  if (parsedRows.length < 2) return;
  headers = parsedRows[0].map((h) => String(h));

  const opts = headers
    .map((h, i) => `<option value="${i}">${h}</option>`)
    .join("");
  colAddress.innerHTML = opts;
  colCep.innerHTML = opts;

  // Auto-detectar colunas pelo nome do cabeçalho
  const addrIdx = headers.findIndex((h) =>
    /destination.?address|endere|logradouro/i.test(h),
  );
  const cepIdx = headers.findIndex((h) =>
    /zipcode|zip.?code|postal.?code|cep|zip|postal/i.test(h),
  );
  if (addrIdx >= 0) colAddress.value = addrIdx;
  if (cepIdx >= 0) colCep.value = cepIdx;

  configCard.classList.remove("hidden");
  btnProcess.disabled = false;
}

// ── Processar ──
btnProcess.addEventListener("click", async () => {
  const addrCol = parseInt(colAddress.value);
  const cepCol = parseInt(colCep.value);

  statsOk = 0;
  statsSkip = 0;
  statsErr = 0;
  logEl.innerHTML = "";
  processedRows = [[...parsedRows[0]]]; // copia o header

  progressCard.classList.remove("hidden");
  resultCard.classList.add("hidden");
  btnProcess.disabled = true;

  const dataRows = parsedRows.slice(1);
  const total = dataRows.length;

  for (let i = 0; i < dataRows.length; i++) {
    const row = [...dataRows[i]];
    const rawCep = String(row[cepCol] || "");
    const cepClean = rawCep.replace(/\D/g, ""); // remove hífen e outros não-dígitos
    const origAddr = String(row[addrCol] || "").trim();

    progressCount.textContent = `${i + 1} / ${total}`;
    progressBar.style.width = ((i + 1) / total) * 100 + "%";
    progressLabel.textContent = `Linha ${i + 2}: CEP ${cepClean || "—"}`;

    const via = await fetchViaCEP(cepClean);

    if (via && via.logradouro) {
      // ViaCEP retornou logradouro oficial → aplicar + manter número/complemento
      const newAddr = buildAddress(origAddr, via.logradouro);
      row[addrCol] = newAddr;
      if (newAddr !== origAddr) {
        addLog(
          `[CORRIGIDO] linha ${i + 2}: "${origAddr}" → "${newAddr}"`,
          "log-fixed",
        );
        statsOk++;
      } else {
        addLog(`[OK] linha ${i + 2}: "${origAddr}"`, "log-ok");
        statsSkip++;
      }
    } else if (via && !via.logradouro) {
      // CEP válido mas sem logradouro (CEP genérico de cidade/bairro) → abreviações
      const abbr = applyAbbr(origAddr);
      row[addrCol] = abbr;
      if (abbr !== origAddr) {
        addLog(
          `[ABREV] linha ${i + 2}: "${origAddr}" → "${abbr}"`,
          "log-fixed",
        );
        statsOk++;
      } else {
        addLog(
          `[OK — CEP sem logradouro] linha ${i + 2}: "${origAddr}"`,
          "log-ok",
        );
        statsSkip++;
      }
    } else if (cepClean.length === 8) {
      // CEP com 8 dígitos mas não encontrado no ViaCEP → tenta abreviações
      const abbr = applyAbbr(origAddr);
      row[addrCol] = abbr;
      if (abbr !== origAddr) {
        addLog(
          `[ABREV] linha ${i + 2}: "${origAddr}" → "${abbr}"`,
          "log-fixed",
        );
        statsOk++;
      } else {
        addLog(
          `[ERRO] linha ${i + 2}: CEP ${cepClean} não encontrado — "${origAddr}"`,
          "log-err",
        );
        statsErr++;
      }
    } else {
      // Sem CEP válido → tenta abreviações
      const abbr = applyAbbr(origAddr);
      row[addrCol] = abbr;
      if (abbr !== origAddr) {
        addLog(
          `[ABREV sem CEP] linha ${i + 2}: "${origAddr}" → "${abbr}"`,
          "log-fixed",
        );
        statsOk++;
      } else {
        addLog(
          `[IGNORADO] linha ${i + 2}: sem CEP válido — "${origAddr}"`,
          "log-skip",
        );
        statsSkip++;
      }
    }

    processedRows.push(row);

    // Throttle: aguarda só se a requisição foi nova (não estava em cache)
    if (cepClean.length === 8 && !(cepClean in cepCache)) await sleep(120);
  }

  document.getElementById("statOk").textContent = statsOk;
  document.getElementById("statSkip").textContent = statsSkip;
  document.getElementById("statErr").textContent = statsErr;
  resultCard.classList.remove("hidden");
  btnProcess.disabled = false;
  progressLabel.textContent = "✓ Concluído!";
});

// ── Download ──
btnDownload.addEventListener("click", () => {
  if (isXlsx && workbook) {
    // Substitui apenas a aba processada, preservando todo o restante do workbook
    const ws = XLSX.utils.aoa_to_sheet(processedRows);
    workbook.Sheets[sheetName] = ws;
    XLSX.writeFile(workbook, "enderecos_padronizados.xlsx");
  } else {
    // Fallback CSV
    const sep = ",";
    const csv = processedRows
      .map((r) =>
        r
          .map((c) => {
            const s = String(c ?? "");
            return s.includes(sep) || s.includes('"') || s.includes("\n")
              ? '"' + s.replace(/"/g, '""') + '"'
              : s;
          })
          .join(sep),
      )
      .join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: "enderecos_padronizados.csv",
    });
    a.click();
    URL.revokeObjectURL(url);
  }
});

// ── Helpers ──
function addLog(msg, cls) {
  const el = Object.assign(document.createElement("div"), {
    className: "log-entry " + cls,
    textContent: msg,
  });
  logEl.appendChild(el);
  logEl.scrollTop = logEl.scrollHeight;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
