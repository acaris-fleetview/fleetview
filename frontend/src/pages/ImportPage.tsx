import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import api, { fuelApi } from '../services/api';

// --- Types --------------------------------------------------------------------

interface ImportResult {
  source: string;
  inserted: number;
  skipped: number;
  errors: string[];
}

interface SheetResult {
  name: string;
  status: 'pending' | 'processing' | 'done' | 'error' | 'skipped';
  result?: ImportResult;
  message?: string;
}

// --- Sheet parsers -------------------------------------------------------------

function normalizeStr(s: string): string {
  return s.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function findCol(headers: string[], keywords: string[]): number {
  return headers.findIndex(h =>
    h && keywords.some(k => normalizeStr(h).includes(normalizeStr(k)))
  );
}

function parseDate(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  const s = String(val);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  const n = Number(val);
  if (!isNaN(n) && n > 40000) {
    const d = new Date((n - 25569) * 86400 * 1000);
    return d.toISOString().split('T')[0];
  }
  return null;
}

function parseNum(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? null : n;
}

// Thank you (Tankyou)
function parseThankyou(rows: unknown[][]): object[] {
  if (!rows.length) return [];
  const headers = (rows[0] as string[]).map(h => String(h ?? '').trim());
  const iPlaque  = findCol(headers, ["plaque d'immatriculation", 'immatriculation', 'plaque', 'vehicle']);
  const iDate    = findCol(headers, ['date de livraison', 'livraison']);
  const iPrix    = findCol(headers, ['prix unitaire / au litre', 'prix unitaire', 'unit', 'prix/litre', 'litre']);
  const iVol     = findCol(headers, ['quantite', 'volume', 'qt']);
  const iTotal   = findCol(headers, ['total ht', 'montant ht', 'total']);
  const iProduit = findCol(headers, ['produit / service', 'produit', 'service', 'designation']);
  const iFuel    = findCol(headers, ['type de carburant', 'carburant', 'fuel']);

  const out: object[] = [];
  for (const row of rows.slice(1)) {
    const produit = String(row[iProduit] ?? '').toLowerCase();
    if (produit.includes('frais')) continue;
    const plaque = String(row[iPlaque] ?? '').trim();
    const date   = parseDate(iDate >= 0 ? row[iDate] : row[3]);
    const prix   = parseNum(row[iPrix]);
    const vol    = parseNum(row[iVol]);
    const total  = parseNum(row[iTotal]);
    const fuel   = iFuel >= 0 ? String(row[iFuel] ?? '').trim() || 'Gasoil' : 'Gasoil';
    if (!plaque || plaque === 'XX-XXX-XX' || !date || !prix || !vol) continue;
    if (prix > 5 || prix < 0.5 || vol < 1) continue;
    out.push({ vehicleId: plaque, transactedAt: date, volumeL: vol, unitPriceEur: prix, totalEur: total ?? +(prix * vol).toFixed(2), fuelType: fuel });
  }
  return out;
}


// Total Energies - carburant (export "Toutes-les-transactions")
function parseTotalCarburant(rows: unknown[][]): object[] {
  if (!rows.length) return [];
  const headers = (rows[0] as string[]).map(h => String(h ?? '').trim());
  const iDate    = findCol(headers, ['date']);
  const iVeh     = findCol(headers, ['nom personnalise', 'personnalise']);
  const iProduit = findCol(headers, ['designation produit']);
  const iQte     = findCol(headers, ['quantite', 'quantite']);
  const iPrix    = findCol(headers, ['prix unitaire']);
  const iHT      = findCol(headers, ['montant ht']);
  const iTTC     = findCol(headers, ['montant ttc']);
  const iKm      = findCol(headers, ['kilometrage']);
  const iStation = findCol(headers, ['lieu enlevement', 'station']);
  const EXCLUDED = ['accessoire', 'peage', 'lavage', 'boisson', 'cafe', 'lubrifiant'];
  const FUEL_PRODUCTS = ['diesel', 'gazole', 'adblue', 'sans plomb', 'b10', 'excellium', 'sp95', 'sp98'];
  const out: object[] = [];
  for (const row of rows.slice(1)) {
    const produit = normalizeStr(String(row[iProduit] ?? ''));
    if (!produit) continue;
    if (EXCLUDED.some(e => produit.includes(e))) continue;
    if (!FUEL_PRODUCTS.some(f => produit.includes(f))) continue;
    const date   = parseDate(iDate >= 0 ? row[iDate] : null);
    const veh    = String(row[iVeh] ?? '').trim();
    const qte    = parseNum(iQte >= 0 ? row[iQte] : null);
    const prix   = parseNum(iPrix >= 0 ? row[iPrix] : null);
    const ht     = parseNum(iHT >= 0 ? row[iHT] : null);
    const ttc    = parseNum(iTTC >= 0 ? row[iTTC] : null);
    const km     = parseNum(iKm >= 0 ? row[iKm] : null);
    const station = iStation >= 0 ? String(row[iStation] ?? '').trim() : null;
    if (!date || !veh || !qte || !prix) continue;
    let fuelType = 'Gasoil';
    if (produit.includes('adblue')) fuelType = 'AdBlue';
    else if (produit.includes('lubrifiant')) fuelType = 'Lubrifiant';
    else if (produit.includes('sans plomb') || produit.includes('sp')) fuelType = 'SP95';
    out.push({ vehicleId: veh, transactedAt: date, volumeL: qte, unitPriceEur: prix, totalEur: ht ?? ttc ?? +(prix*qte).toFixed(2), fuelType, provider: 'Total', stationName: station ?? null, mileage: km ?? null });
  }
  return out;
}

// Total Mobility
function parseTotalMobility(rows: unknown[][]): object[] {
  if (!rows.length) return [];
  const headers = (rows[0] as string[]).map(h => String(h ?? ''));
  const iDate  = findCol(headers, ['date']);
  const iDesc  = findCol(headers, ['designation', 'produit']);
  const iQte   = findCol(headers, ['quantite', 'qte']);
  const iPrix  = findCol(headers, ['prix unitaire', 'prix unit']);
  const iTotal = findCol(headers, ['montant ht', 'total ht', 'montant']);

  const out: object[] = [];
  for (const row of rows.slice(1)) {
    const date  = parseDate(row[iDate]);
    const desc  = String(row[iDesc] ?? '').trim();
    const qte   = parseNum(row[iQte]);
    const prix  = parseNum(row[iPrix]);
    const total = parseNum(row[iTotal]);
    if (!date || !desc || !qte || !prix) continue;
    if (!row[iDate] || typeof row[iDate] === 'string' && (row[iDate] as string).toLowerCase().includes('data')) continue;
    out.push({ date, description: desc, quantity: qte, unitPriceEur: prix, totalEur: total ?? +(prix * qte).toFixed(2) });
  }
  return out;
}

// Entretiens
function parseEntretiens(rows: unknown[][]): object[] {
  if (!rows.length) return [];
  const headers = (rows[0] as string[]).map(h => String(h ?? ''));
  const iDate  = findCol(headers, ['date']);
  const iImmat = findCol(headers, ['immatriculation', 'plaque', 'immat']);
  const iType  = findCol(headers, ['entretien', 'type', 'designation', 'description']);
  const iPrix  = findCol(headers, ['prix', 'montant', 'cout', 'total']);

  const out: object[] = [];
  for (const row of rows.slice(1)) {
    const date  = parseDate(row[iDate]);
    const immat = String(row[iImmat] ?? '').trim();
    const type  = String(row[iType] ?? '').trim();
    const prix  = parseNum(row[iPrix]);
    if (!date || !immat || !type) continue;
    out.push({ vehicleId: immat, date, type, costEur: prix ?? 0 });
  }
  return out;
}

// Assurances
function parseAssurances(rows: unknown[][]): object[] {
  if (!rows.length) return [];
  const headers = (rows[0] as string[]).map(h => String(h ?? ''));
  const iImmat  = findCol(headers, ['immatriculation', 'plaque', 'vehicule']);
  const iMarque = findCol(headers, ['marque', 'modele']);
  const iPrime  = findCol(headers, ['prime', 'cotisation', 'montant', 'total', 'ttc']);
  const iDebut  = findCol(headers, ['debut', 'effet', 'date debut']);
  const iFin    = findCol(headers, ['fin', 'echeance']);

  const out: object[] = [];
  for (const row of rows.slice(1)) {
    const immat = String(row[iImmat] ?? '').trim();
    if (!immat || immat.length < 5) continue;
    const prime = parseNum(row[iPrime]);
    if (!prime) continue;
    out.push({
      vehicleId: immat,
      marque: iMarque >= 0 ? String(row[iMarque] ?? '') : '',
      annualPremiumEur: prime,
      startDate: iDebut >= 0 ? parseDate(row[iDebut]) : null,
      endDate:   iFin   >= 0 ? parseDate(row[iFin])   : null,
    });
  }
  return out;
}

// Location VL
function parseLocation(rows: unknown[][]): object[] {
  if (!rows.length) return [];
  const headers = (rows[0] as string[]).map(h => String(h ?? ''));
  const iDate   = findCol(headers, ['date']);
  const iLoueur = findCol(headers, ['loueur', 'fournisseur']);
  const iModele = findCol(headers, ['modele', 'vehicule']);
  const iImmat  = findCol(headers, ['immatriculation', 'plaque']);
  const iJrs    = findCol(headers, ['jours', 'jrs', 'duree']);
  const iLoyer  = findCol(headers, ['loyer', 'location', 'montant']);
  const iAssur  = findCol(headers, ['assurance']);

  const out: object[] = [];
  for (const row of rows.slice(1)) {
    const date  = parseDate(row[iDate]);
    const immat = String(row[iImmat] ?? '').trim();
    const loyer = parseNum(row[iLoyer]);
    if (!date || !loyer) continue;
    out.push({
      vehicleId: immat,
      date,
      supplier: iLoueur >= 0 ? String(row[iLoueur] ?? '') : '',
      model:    iModele >= 0 ? String(row[iModele] ?? '') : '',
      days:     iJrs    >= 0 ? parseNum(row[iJrs]) : null,
      rentalEur: loyer,
      insuranceEur: iAssur >= 0 ? parseNum(row[iAssur]) : null,
    });
  }
  return out;
}

// Infractions
function parseInfractions(rows: unknown[][]): object[] {
  if (!rows.length) return [];
  const headers = (rows[0] as string[]).map(h => String(h ?? ''));
  const iDate    = findCol(headers, ['date']);
  const iType    = findCol(headers, ['infraction', 'type', 'designation']);
  const iDriver  = findCol(headers, ['chauffeur', 'conducteur', 'driver']);
  const iMontant = findCol(headers, ['montant', 'amende', 'total']);
  const iImpute  = findCol(headers, ['imputation', 'impute', 'societe']);

  const out: object[] = [];
  for (const row of rows.slice(1)) {
    const date    = parseDate(row[iDate]);
    const montant = parseNum(row[iMontant]);
    if (!date || !montant) continue;
    out.push({
      date,
      type:       iType   >= 0 ? String(row[iType]   ?? '') : '',
      driver:     iDriver >= 0 ? String(row[iDriver]  ?? '') : '',
      amountEur:  montant,
      imputation: iImpute >= 0 ? String(row[iImpute]  ?? '') : '',
    });
  }
  return out;
}

// Amortissement
function parseAmortissement(rows: unknown[][]): object[] {
  if (!rows.length) return [];
  const headers = (rows[0] as string[]).map(h => String(h ?? ''));
  const iVeh    = findCol(headers, ['vehicule', 'camion']);
  const iAchat  = findCol(headers, ['prix achat', 'valeur', 'cout']);
  const iDate   = findCol(headers, ['date achat', 'date']);
  const iValNet = findCol(headers, ['valeur nette', 'vnet', 'net']);

  const seen = new Set<string>();
  const out: object[] = [];
  for (const row of rows.slice(1)) {
    const veh = String(row[iVeh] ?? '').trim();
    if (!veh || seen.has(veh)) continue;
    seen.add(veh);
    const achat  = parseNum(row[iAchat]);
    const valNet = iValNet >= 0 ? parseNum(row[iValNet]) : null;
    const dateAchat = iDate >= 0 ? parseDate(row[iDate]) : null;
    if (!achat) continue;
    out.push({ vehicleId: veh, purchaseDate: dateAchat, purchasePriceEur: achat, netValueEur: valNet });
  }
  return out;
}

// --- Sheet mapping -------------------------------------------------------------

const SHEET_CONFIG: { keywords: string[]; label: string; endpoint: string; parser: (r: unknown[][]) => object[] }[] = [
  { keywords: ['thank you', 'tankyou', 'tank you', 'carburant'],  label: 'Carburant (Tankyou)',   endpoint: '/import/fuel',           parser: parseThankyou },
  { keywords: ['toutes-les-transactions', 'toutes les transactions', 'transactions total'], label: 'Carburant (Total)', endpoint: '/import/fuel', parser: parseTotalCarburant },
  { keywords: ['total mobility'],            label: 'Total Mobility',         endpoint: '/import/total-mobility', parser: parseTotalMobility },
  { keywords: ['entretien', 'maintenance', 'divers'], label: 'Entretiens',             endpoint: '/import/maintenance',    parser: parseEntretiens },
  { keywords: ['assurance'],                          label: 'Assurances',             endpoint: '/import/insurance',      parser: parseAssurances },
  { keywords: ['location vl', 'location'],            label: 'Location VL',            endpoint: '/import/rental',         parser: parseLocation },
  { keywords: ['infraction', 'amende'],               label: 'Infractions',            endpoint: '/import/infractions',    parser: parseInfractions },
  { keywords: ['amortissement'],                      label: 'Amortissement',          endpoint: '/import/depreciation',   parser: parseAmortissement },
];

function matchSheet(name: string) {
  const n = normalizeStr(name);
  return SHEET_CONFIG.find(c => c.keywords.some(k => n.includes(normalizeStr(k))));
}

// --- Component ----------------------------------------------------------------

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName]     = useState<string>('');
  const [sheets, setSheets]         = useState<SheetResult[]>([]);
  const [running, setRunning]       = useState(false);
  const [done, setDone]             = useState(false);
  const [lastImport, setLastImport] = useState<string | null>(null);

  const { data: lastImports, refetch: refetchLastImports } = useQuery<
    { provider: string; lastDate: string; count: number }[]
  >({
    queryKey: ['last-imports'],
    queryFn: () => fuelApi.lastImports(),
    staleTime: 60_000,
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setDone(false);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target!.result as ArrayBuffer);
      const isCsv = file.name.toLowerCase().endsWith('.csv');
      const wb = isCsv
        ? XLSX.read(data, { type: 'array', FS: ';', cellDates: true })
        : XLSX.read(data, { type: 'array', cellDates: true });

      const fileBaseName = file.name.replace(/\.[^.]+$/, '').toLowerCase();
      const detected: SheetResult[] = wb.SheetNames.map(name => {
        const config = matchSheet(name) || matchSheet(fileBaseName);
        return { name, status: config ? 'pending' : 'skipped', message: config ? config.label : 'Non reconnu Ã¢ÂÂ ignore' };
      });
      setSheets(detected);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!fileRef.current?.files?.[0]) return;
    setRunning(true);
    setDone(false);

    const file   = fileRef.current.files[0];
    const buffer = await file.arrayBuffer();
    const data   = new Uint8Array(buffer);
    const isCsv  = file.name.toLowerCase().endsWith('.csv');
    const wb     = isCsv
      ? XLSX.read(data, { type: 'array', FS: ';', cellDates: true })
      : XLSX.read(data, { type: 'array', cellDates: true });
    const fileBaseName = file.name.replace(/\.[^.]+$/, '').toLowerCase();

    for (const sheet of sheets) {
      if (sheet.status === 'skipped') continue;
      const config = matchSheet(sheet.name) || matchSheet(fileBaseName);
      if (!config) continue;

      setSheets(prev => prev.map(s => s.name === sheet.name ? { ...s, status: 'processing' } : s));

      try {
        const ws   = wb.Sheets[sheet.name];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
        const records = config.parser(rows as unknown[][]);

        if (records.length === 0) {
          setSheets(prev => prev.map(s => s.name === sheet.name ? { ...s, status: 'done', result: { source: sheet.name, inserted: 0, skipped: 0, errors: ['Aucune ligne valide detectee'] } } : s));
          continue;
        }

        const res = await api.post(config.endpoint, { records });
        setSheets(prev => prev.map(s => s.name === sheet.name ? { ...s, status: 'done', result: res.data } : s));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setSheets(prev => prev.map(s => s.name === sheet.name ? { ...s, status: 'error', message: msg } : s));
      }
    }

    setRunning(false);
    setDone(true);
    setLastImport(new Date().toLocaleString('fr-FR'));
    void refetchLastImports();
  };

  const pendingCount = sheets.filter(s => s.status === 'pending').length;
  const totalInserted = sheets.reduce((acc, s) => acc + (s.result?.inserted ?? 0), 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import mensuel</h1>
        <p className="text-gray-500 mt-1">Uploadez votre fichier Excel de charges flotte pour mettre a jour toutes les donnees.</p>
        {lastImport && <p className="text-xs text-green-600 mt-1">Dernier import : {lastImport}</p>}
      </div>

      {/* Derniers imports par fournisseur */}
      {lastImports && lastImports.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Derniers imports par fournisseur</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {lastImports.map(imp => (
              <div key={imp.provider} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">&#9981;</span>
                  <span className="font-medium text-gray-800 text-sm capitalize">{imp.provider}</span>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">
                    {new Date(imp.lastDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                  <span className="ml-3 text-gray-400">{imp.count} transactions</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload zone */}
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-blue-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors mb-6"
      >
        <div className="text-4xl mb-3">&#128194;</div>
        {fileName
          ? <p className="font-semibold text-blue-700">{fileName}</p>
          : <p className="text-gray-500">Cliquez pour selectionner votre fichier <strong>.xlsx</strong></p>
        }
        <p className="text-xs text-gray-400 mt-1">Charges_VL_v4.xlsx - Thank you - Total Mobility - Entretiens - Assurances - Location - Infractions - Amortissement</p>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      </div>

      {/* Sheet detection */}
      {sheets.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Feuilles detectees</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {sheets.map(s => (
              <div key={s.name} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {s.status === 'pending'    ? '&#9203;' :
                     s.status === 'processing' ? '&#9881;' :
                     s.status === 'done'       ? 'Ã¢ÂÂ' :
                     s.status === 'error'      ? '&#10060;' : '&#9898;'}
                  </span>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{s.name}</p>
                    {s.message && <p className="text-xs text-gray-400">{s.message}</p>}
                  </div>
                </div>
                <div className="text-right text-xs">
                  {s.result && (
                    <>
                      <span className="text-green-600 font-semibold">{s.result.inserted} inseres</span>
                      {s.result.skipped > 0 && <span className="text-gray-400 ml-2">{s.result.skipped} ignores</span>}
                    </>
                  )}
                  {s.status === 'processing' && <span className="text-blue-500 animate-pulse">En cours...</span>}
                  {s.status === 'error' && <span className="text-red-500">{s.message}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {pendingCount > 0 && (
        <button
          onClick={handleImport}
          disabled={running}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {running ? 'Import en cours...' : `Importer (${pendingCount} feuille${pendingCount > 1 ? 's' : ''})`}
        </button>
      )}

      {/* Summary */}
      {done && totalInserted > 0 && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-green-700 font-semibold text-lg">Import termine Ã¢ÂÂ {totalInserted} enregistrements inseres</p>
          <p className="text-green-500 text-sm mt-1">Les donnees sont disponibles dans tous les onglets</p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-gray-50 rounded-xl p-5 text-sm text-gray-600">
        <p className="font-semibold text-gray-700 mb-2">Comment utiliser</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Exportez votre fichier de charges flotte (Charges_VL_vX.xlsx)</li>
          <li>Uploadez-le ici Ã¢ÂÂ les feuilles sont detectees automatiquement</li>
          <li>Cliquez sur "Importer" Ã¢ÂÂ les donnees remplacent les precedentes</li>
          <li>Verifiez les onglets Carburant, Entretien, etc.</li>
        </ol>
      </div>
    </div>
  );
}
