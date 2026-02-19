const PADRON_ABBR = [
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

function padronApplyAbbr(address) {
  let s = String(address || "");
  for (const [rx, rep] of PADRON_ABBR) s = s.replace(rx, rep);
  return s.replace(/\s{2,}/g, " ").trim();
}

// Extrai número + complemento do endereço original
// "R Min Firmino, 27, Loja" → "27, Loja"
function padronExtractRest(original) {
  const s = String(original).trim();
  const m1 = s.match(/,\s*(\d+.*)$/);
  if (m1) return m1[1].trim();
  const m2 = s.match(/\s+(\d+\S*.*)$/);
  if (m2) return m2[1].trim();
  return null;
}

function padronBuildAddress(original, logradouro) {
  const rest = padronExtractRest(original);
  return rest ? logradouro + ", " + rest : logradouro;
}

// ViaCEP com cache
const padronCepCache = {};
async function padronFetchViaCEP(rawCep) {
  const cep = String(rawCep).replace(/\D/g, "");
  if (cep.length !== 8) return null;
  if (padronCepCache[cep] !== undefined) return padronCepCache[cep];
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!res.ok) {
      padronCepCache[cep] = null;
      return null;
    }
    const data = await res.json();
    if (data.erro) {
      padronCepCache[cep] = null;
      return null;
    }
    padronCepCache[cep] = data;
    return data;
  } catch {
    padronCepCache[cep] = null;
    return null;
  }
}

// ── Inicialização (executa após o DOM estar pronto) ──
export function initPadronizador() {
  const dropzone = document.getElementById("padronDropzone");
  const fileInput = document.getElementById("padronFileInput");
  const progress = document.getElementById("padronProgress");
  const bar = document.getElementById("padronBar");
  const label = document.getElementById("padronLabel");
  const btnDownload = document.getElementById("padronBtnDownload");

  if (!dropzone) return; // elemento não existe na página atual

  let workbook = null;
  let sheetName = "";
  let isXlsx = false;
  let processedRows = [];

  // Drag & drop visual
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
  dropzone.addEventListener("dragleave", () =>
    dropzone.classList.remove("dragover"),
  );
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  function handleFile(file) {
    isXlsx = /\.xlsx?$/i.test(file.name);

    // Feedback visual na dropzone
    dropzone.classList.add("file-ready");
    dropzone.querySelector('span[class*="material"]').textContent =
      "check_circle";
    document.getElementById("padronDropLabel").textContent = file.name;

    // Esconde botão de download anterior
    btnDownload.style.display = "none";
    processedRows = [];

    const reader = new FileReader();
    if (isXlsx) {
      reader.onload = (e) => parseAndProcess(e.target.result, true);
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (e) => parseAndProcess(e.target.result, false);
      reader.readAsText(file, "utf-8");
    }
  }

  async function parseAndProcess(data, xlsx) {
    let parsedRows;

    if (xlsx) {
      // Carrega SheetJS dinamicamente se não estiver disponível
      if (!window.XLSX) {
        await loadScript(
          "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
        );
      }
      workbook = XLSX.read(data, { type: "array", cellDates: true });
      sheetName = workbook.SheetNames[0];
      parsedRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1,
        defval: "",
      });
    } else {
      workbook = null;
      parsedRows = parseCsvText(data);
    }

    if (parsedRows.length < 2) {
      label.textContent = "Arquivo vazio ou inválido.";
      return;
    }

    // Auto-detectar colunas de endereço e CEP
    const headers = parsedRows[0].map((h) => String(h));
    const addrCol = headers.findIndex((h) =>
      /destination.?address|endere|logradouro/i.test(h),
    );
    const cepCol = headers.findIndex((h) =>
      /zipcode|zip.?code|postal.?code|cep|zip|postal/i.test(h),
    );

    if (addrCol < 0 || cepCol < 0) {
      label.textContent = `Colunas não encontradas. Endereço: col ${addrCol} | CEP: col ${cepCol}`;
      progress.style.display = "block";
      return;
    }

    // Iniciar processamento
    progress.style.display = "block";
    bar.style.width = "0%";
    label.textContent = "Iniciando...";

    processedRows = [[...parsedRows[0]]]; // header
    const dataRows = parsedRows.slice(1);
    const total = dataRows.length;

    for (let i = 0; i < dataRows.length; i++) {
      const row = [...dataRows[i]];
      const cepClean = String(row[cepCol] || "").replace(/\D/g, "");
      const origAddr = String(row[addrCol] || "").trim();

      // Atualizar barra
      const pct = Math.round(((i + 1) / total) * 100);
      bar.style.width = pct + "%";
      label.textContent = `${i + 1} / ${total} — CEP ${cepClean || "—"}`;

      const via = await padronFetchViaCEP(cepClean);

      if (via && via.logradouro) {
        row[addrCol] = padronBuildAddress(origAddr, via.logradouro);
      } else {
        row[addrCol] = padronApplyAbbr(origAddr);
      }

      processedRows.push(row);

      // Throttle apenas para CEPs novos (não em cache)
      if (cepClean.length === 8 && !(cepClean in padronCepCache)) {
        await new Promise((r) => setTimeout(r, 120));
      }
    }

    label.textContent = "✓ Concluído!";
    bar.style.width = "100%";
    btnDownload.style.display = "block";
  }

  // Download
  btnDownload.addEventListener("click", () => {
    if (isXlsx && workbook) {
      const ws = XLSX.utils.aoa_to_sheet(processedRows);
      workbook.Sheets[sheetName] = ws;
      XLSX.writeFile(workbook, "enderecos_padronizados.xlsx");
    } else {
      const csv = processedRows
        .map((r) =>
          r
            .map((c) => {
              const s = String(c ?? "");
              return s.includes(",") || s.includes('"') || s.includes("\n")
                ? '"' + s.replace(/"/g, '""') + '"'
                : s;
            })
            .join(","),
        )
        .join("\r\n");
      const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement("a"), {
        href: url,
        download: "enderecos_padronizados.csv",
      }).click();
      URL.revokeObjectURL(url);
    }
  });

  // ── Helpers ──
  function parseCsvText(text) {
    const sep = detectSepChar(text);
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
    return rows;
  }

  function detectSepChar(text) {
    const line = text.split("\n")[0];
    const counts = { ",": 0, ";": 0, "\t": 0, "|": 0 };
    for (const c of line) if (counts[c] !== undefined) counts[c]++;
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
}

// Executa quando o DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPadronizador);
} else {
  initPadronizador();
}
