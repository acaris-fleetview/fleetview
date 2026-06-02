import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function findCol(headers: string[], keywords: string[]): number {
  return headers.findIndex(h => h && keywords.some(k => h.toLowerCase().includes(k.toLowerCase())));
}
function parseDate(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  const s = String(val);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  const n = Number(val);
  if (!isNaN(n) && n > 40000) return new Date((n - 25569) * 86400 * 1000).toISOString().split('T')[0];
  return null;
}
function parseNum(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? null : n;
}

// ─── Parsers ──────────────────────────────────────────────────────────────────
function parseThankyou(rows: unknown[][]): object[] {
  if (!rows.length) return [];
  const h = (rows[0] as string[]).map(x => String(x ?? ''));
  const iPlaque = findCol(h, ['immatriculation','plaque','vehicle']);
  const iDate   = findCol(h, ['livraison','facturation','date']);
  const iPrix   = findCol(h, ['prix unitaire','unit','prix/litre','litre']);
  const iVol    = findCol(h, ['quantité','quantite','volume','qt']);
  const iTotal  = findCol(h, ['total ht','montant ht','total']);
  const iProduit= findCol(h, ['produit','service','désignation']);
  const out: object[] = [];
  for (const row of rows.slice(1)) {
    if (String(row[iProduit]??'').toLowerCase().includes('frais')) continue;
    const plaque = String(row[iPlaque]??'').trim();
    const date   = parseDate(row[iDate]);
    const prix   = parseNum(row[iPrix]);
    const vol    = parseNum(row[iVol]);
    const total  = parseNum(row[iTotal]);
    if (!plaque||!date||!prix||!vol) continue;
    if (prix>5||prix<0.5||vol<1) continue;
    out.push({ vehicleId:plaque, transactedAt:date, volumeL:vol, unitPriceEur:prix, totalEur:total??+(prix*vol).toFixed(2), fuelType:'Gasoil' });
  }
  return out;
}
function parseTotalMobility(rows: unknown[][]): object[] {
  if (!rows.length) return [];
  const h = (rows[0] as string[]).map(x => String(x??''));
  const iDate=findCol(h,['date']); const iDesc=findCol(h,['désignation','designation','produit']);
  const iQte=findCol(h,['quantité','quantite','qté']); const iPrix=findCol(h,['prix unitaire','prix unit']);
  const iTotal=findCol(h,['montant ht','total ht','montant']);
  const out: object[] = [];
  for (const row of rows.slice(1)) {
    const date=parseDate(row[iDate]); const desc=String(row[iDesc]??'').trim();
    const qte=parseNum(row[iQte]); const prix=parseNum(row[iPrix]); const total=parseNum(row[iTotal]);
    if (!date||!desc||!qte||!prix) continue;
    if (typeof row[iDate]==='string'&&row[iDate].toLowerCase().includes('data')) continue;
    out.push({ date, description:desc, quantity:qte, unitPriceEur:prix, totalEur:total??+(prix*qte).toFixed(2) });
  }
  return out;
}
function parseEntretiens(rows: unknown[][]): object[] {
  if (!rows.length) return [];
  const h=(rows[0] as string[]).map(x=>String(x??''));
  const iDate=findCol(h,['date']); const iImmat=findCol(h,['immatriculation','plaque','immat']);
  const iType=findCol(h,['entretien','type','désignation','description']); const iPrix=findCol(h,['prix','montant','coût','cout','total']);
  const out: object[] = [];
  for (const row of rows.slice(1)) {
    const date=parseDate(row[iDate]); const immat=String(row[iImmat]??'').trim(); const type=String(row[iType]??'').trim();
    if (!date||!immat||!type) continue;
    out.push({ vehicleId:immat, date, type, costEur:parseNum(row[iPrix])??0 });
  }
  return out;
}
function parseAssurancesSheet(rows: unknown[][]): object[] {
  if (!rows.length) return [];
  const h=(rows[0] as string[]).map(x=>String(x??''));
  const iImmat=findCol(h,['immatriculation','plaque','véhicule','vehicule']); const iMarque=findCol(h,['marque','modèle','modele']);
  const iPrime=findCol(h,['prime','cotisation','montant','total','ttc']); const iDebut=findCol(h,['début','debut','effet','date début']);
  const iFin=findCol(h,['fin','échéance','echeance']);
  const out: object[] = [];
  for (const row of rows.slice(1)) {
    const immat=String(row[iImmat]??'').trim();
    if (!immat||immat.length<5) continue;
    const prime=parseNum(row[iPrime]);
    if (!prime) continue;
    out.push({ vehicleId:immat, marque:iMarque>=0?String(row[iMarque]??''):'', annualPremiumEur:prime,
      startDate:iDebut>=0?parseDate(row[iDebut]):null, endDate:iFin>=0?parseDate(row[iFin]):null });
  }
  return out;
}
function parseLocation(rows: unknown[][]): object[] {
  if (!rows.length) return [];
  const h=(rows[0] as string[]).map(x=>String(x??''));
  const iDate=findCol(h,['date']); const iLoueur=findCol(h,['loueur','fournisseur']);
  const iModele=findCol(h,['modele','modèle','véhicule']); const iImmat=findCol(h,['immatriculation','plaque']);
  const iJrs=findCol(h,['jours','jrs','durée']); const iLoyer=findCol(h,['loyer','location','montant']); const iAssur=findCol(h,['assurance']);
  const out: object[] = [];
  for (const row of rows.slice(1)) {
    const date=parseDate(row[iDate]); const loyer=parseNum(row[iLoyer]);
    if (!date||!loyer) continue;
    out.push({ vehicleId:String(row[iImmat]??'').trim(), date, supplier:iLoueur>=0?String(row[iLoueur]??''):'',
      model:iModele>=0?String(row[iModele]??''):'', days:iJrs>=0?parseNum(row[iJrs]):null,
      rentalEur:loyer, insuranceEur:iAssur>=0?parseNum(row[iAssur]):null });
  }
  return out;
}
function parseInfractions(rows: unknown[][]): object[] {
  if (!rows.length) return [];
  const h=(rows[0] as string[]).map(x=>String(x??''));
  const iDate=findCol(h,['date']); const iType=findCol(h,['infraction','type','désignation']);
  const iDriver=findCol(h,['chauffeur','conducteur']); const iMontant=findCol(h,['montant','amende','total']); const iImpute=findCol(h,['imputation','impute','société']);
  const out: object[] = [];
  for (const row of rows.slice(1)) {
    const date=parseDate(row[iDate]); const montant=parseNum(row[iMontant]);
    if (!date||!montant) continue;
    out.push({ date, type:iType>=0?String(row[iType]??''):'', driver:iDriver>=0?String(row[iDriver]??''):'',
      amountEur:montant, imputation:iImpute>=0?String(row[iImpute]??''):'' });
  }
  return out;
}
function parseAmortissement(rows: unknown[][]): object[] {
  if (!rows.length) return [];
  const h=(rows[0] as string[]).map(x=>String(x??''));
  const iVeh=findCol(h,['vehicule','véhicule','camion']); const iAchat=findCol(h,['prix achat','valeur','coût','cout']);
  const iDate=findCol(h,['date achat','date']); const iValNet=findCol(h,['valeur nette','vnet','net']);
  const seen=new Set<string>(); const out: object[] = [];
  for (const row of rows.slice(1)) {
    const veh=String(row[iVeh]??'').trim();
    if (!veh||seen.has(veh)) continue;
    seen.add(veh);
    const achat=parseNum(row[iAchat]);
    if (!achat) continue;
    out.push({ vehicleId:veh, purchaseDate:iDate>=0?parseDate(row[iDate]):null, purchasePriceEur:achat,
      netValueEur:iValNet>=0?parseNum(row[iValNet]):null });
  }
  return out;
}

// Parser assurances fichier dédié (MMA ou autre assureur)
function parseAssurancesFile(rows: unknown[][]): object[] {
  if (!rows.length) return [];
  // Trouver la ligne d'en-tête (première ligne non vide avec du texte)
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const nonEmpty = (rows[i] as unknown[]).filter(c => c !== null && c !== undefined && String(c).trim() !== '');
    if (nonEmpty.length >= 2) { headerRowIdx = i; break; }
  }
  const h = (rows[headerRowIdx] as string[]).map(x => String(x??''));
  const iImmat  = findCol(h, ['immatriculation','plaque','véhicule','vehicule','registration']);
  const iMarque = findCol(h, ['marque','modèle','modele','brand']);
  const iPrime  = findCol(h, ['prime','cotisation','montant','ttc','annuel','total']);
  const iDebut  = findCol(h, ['début','debut','effet','start','date début','valid from']);
  const iFin    = findCol(h, ['fin','échéance','echeance','expiry','end','valid to']);
  const iGarantie = findCol(h, ['garantie','couverture','formule','type']);

  const out: object[] = [];
  for (const row of rows.slice(headerRowIdx + 1)) {
    const immat = iImmat >= 0 ? String(row[iImmat]??'').trim() : '';
    const prime = parseNum(row[iPrime]);
    if (!prime && !immat) continue;
    out.push({
      vehicleId:   immat || 'FLOTTE',
      marque:      iMarque >= 0 ? String(row[iMarque]??'') : '',
      annualPremiumEur: prime ?? 0,
      startDate:   iDebut >= 0 ? parseDate(row[iDebut]) : null,
      endDate:     iFin >= 0   ? parseDate(row[iFin])   : null,
      garantie:    iGarantie >= 0 ? String(row[iGarantie]??'') : '',
    });
  }
  return out;
}

// ─── Sheet config ──────────────────────────────────────────────────────────────
const SHEET_CONFIG: { keywords: string[]; label: string; endpoint: string; parser: (r: unknown[][]) => object[] }[] = [
  { keywords: ['thank you','tankyou','carburant'],   label: 'Carburant (Tankyou)',  endpoint: '/import/fuel',           parser: parseThankyou },
  { keywords: ['total mobility','total'],            label: 'Total Mobility',        endpoint: '/import/total-mobility', parser: parseTotalMobility },
  { keywords: ['entretien','maintenance','divers'],  label: 'Entretiens',            endpoint: '/import/maintenance',    parser: parseEntretiens },
  { keywords: ['assurance'],                         label: 'Assurances',            endpoint: '/import/insurance',      parser: parseAssurancesSheet },
  { keywords: ['location vl','location'],            label: 'Location VL',           endpoint: '/import/rental',         parser: parseLocation },
  { keywords: ['infraction','amende'],               label: 'Infractions',           endpoint: '/import/infractions',    parser: parseInfractions },
  { keywords: ['amortissement'],                     label: 'Amortissement',         endpoint: '/import/depreciation',   parser: parseAmortissement },
];
function matchSheet(name: string) {
  const n = name.toLowerCase();
  return SHEET_CONFIG.find(c => c.keywords.some(k => n.includes(k)));
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ImportPage() {
  // --- Import charges principal ---
  const fileRef  = useRef<HTMLInputElement>(null);
  const [fileName, setFileName]   = useState('');
  const [sheets, setSheets]       = useState<SheetResult[]>([]);
  const [running, setRunning]     = useState(false);
  const [done, setDone]           = useState(false);
  const [lastImport, setLastImport] = useState<string|null>(null);

  // --- Import assurances séparé ---
  const assurFileRef = useRef<HTMLInputElement>(null);
  const [assurFileName, setAssurFileName]     = useState('');
  const [assurStatus, setAssurStatus]         = useState<'idle'|'ready'|'processing'|'done'|'error'>('idle');
  const [assurResult, setAssurResult]         = useState<ImportResult|null>(null);
  const [assurLastImport, setAssurLastImport] = useState<string|null>(null);

  // ── Charges principal ──
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setFileName(file.name); setDone(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type:'array', cellDates:true });
      setSheets(wb.SheetNames.map(name => {
        const config = matchSheet(name);
        return { name, status: config ? 'pending' : 'skipped', message: config ? config.label : 'Non reconnu — ignoré' };
      }));
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!fileRef.current?.files?.[0]) return;
    setRunning(true); setDone(false);
    const file = fileRef.current.files[0];
    const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type:'array', cellDates:true });
    for (const sheet of sheets) {
      if (sheet.status === 'skipped') continue;
      const config = matchSheet(sheet.name); if (!config) continue;
      setSheets(prev => prev.map(s => s.name===sheet.name ? {...s,status:'processing'} : s));
      try {
        const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheet.name], { header:1, defval:null });
        const records = config.parser(rows as unknown[][]);
        if (records.length===0) {
          setSheets(prev=>prev.map(s=>s.name===sheet.name?{...s,status:'done',result:{source:sheet.name,inserted:0,skipped:0,errors:['Aucune ligne valide']}}:s));
          continue;
        }
        const res = await api.post(config.endpoint, { records });
        setSheets(prev=>prev.map(s=>s.name===sheet.name?{...s,status:'done',result:res.data}:s));
      } catch(err:unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setSheets(prev=>prev.map(s=>s.name===sheet.name?{...s,status:'error',message:msg}:s));
      }
    }
    setRunning(false); setDone(true);
    setLastImport(new Date().toLocaleString('fr-FR'));
  };

  // ── Assurances séparées ──
  const handleAssurFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setAssurFileName(file.name); setAssurStatus('ready'); setAssurResult(null);
  };

  const handleAssurImport = async () => {
    if (!assurFileRef.current?.files?.[0]) return;
    setAssurStatus('processing');
    try {
      const file = assurFileRef.current.files[0];
      const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type:'array', cellDates:true });
      // Prendre la première feuille non vide
      let records: object[] = [];
      for (const sheetName of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header:1, defval:null }) as unknown[][];
        records = parseAssurancesFile(rows);
        if (records.length > 0) break;
      }
      if (records.length === 0) {
        setAssurStatus('error');
        setAssurResult({ source:'insurance', inserted:0, skipped:0, errors:['Aucune ligne valide détectée — vérifiez le format du fichier'] });
        return;
      }
      const res = await api.post('/import/insurance', { records });
      setAssurResult(res.data);
      setAssurStatus('done');
      setAssurLastImport(new Date().toLocaleString('fr-FR'));
    } catch(err:unknown) {
      setAssurStatus('error');
      setAssurResult({ source:'insurance', inserted:0, skipped:0, errors:[err instanceof Error ? err.message : String(err)] });
    }
  };

  const pendingCount = sheets.filter(s => s.status==='pending').length;
  const totalInserted = sheets.reduce((acc,s) => acc+(s.result?.inserted??0), 0);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* ── SECTION 1 : Charges flotte ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import mensuel</h1>
        <p className="text-gray-500 mt-1">Uploadez votre fichier Excel de charges flotte pour mettre à jour toutes les données.</p>
        {lastImport && <p className="text-xs text-green-600 mt-1">Dernier import : {lastImport}</p>}
      </div>

      <div onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-blue-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
        <div className="text-4xl mb-3">📂</div>
        {fileName
          ? <p className="font-semibold text-blue-700">{fileName}</p>
          : <p className="text-gray-500">Cliquez pour sélectionner <strong>Charges_VL_vX.xlsx</strong></p>}
        <p className="text-xs text-gray-400 mt-1">Thank you · Total Mobility · Entretiens · Assurances · Location · Infractions · Amortissement</p>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
      </div>

      {sheets.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-800">Feuilles détectées</h2></div>
          <div className="divide-y divide-gray-50">
            {sheets.map(s => (
              <div key={s.name} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {s.status==='pending'?'⏳':s.status==='processing'?'⚙️':s.status==='done'?'✅':s.status==='error'?'❌':'⚪'}
                  </span>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{s.name}</p>
                    {s.message && <p className="text-xs text-gray-400">{s.message}</p>}
                  </div>
                </div>
                <div className="text-right text-xs">
                  {s.result && <><span className="text-green-600 font-semibold">{s.result.inserted} insérés</span>{s.result.skipped>0&&<span className="text-gray-400 ml-2">{s.result.skipped} ignorés</span>}</>}
                  {s.status==='processing'&&<span className="text-blue-500 animate-pulse">En cours…</span>}
                  {s.status==='error'&&<span className="text-red-500">{s.message}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingCount > 0 && (
        <button onClick={handleImport} disabled={running}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {running ? '⚙️ Import en cours…' : `🚀 Importer (${pendingCount} feuille${pendingCount>1?'s':''})`}
        </button>
      )}
      {done && totalInserted > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-green-700 font-semibold text-lg">✅ Import terminé — {totalInserted} enregistrements insérés</p>
        </div>
      )}

      {/* ── SECTION 2 : Assurances fichier séparé ── */}
      <div className="border-t border-gray-200 pt-8">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">🛡️ Import assurances</h2>
          <p className="text-gray-500 text-sm mt-1">Uploadez le fichier reçu de votre assureur (MMA, AXA, etc.) — Excel ou CSV.</p>
          {assurLastImport && <p className="text-xs text-green-600 mt-1">Dernier import : {assurLastImport}</p>}
        </div>

        <div onClick={() => assurFileRef.current?.click()}
          className="border-2 border-dashed border-purple-300 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors">
          <div className="text-4xl mb-3">🛡️</div>
          {assurFileName
            ? <p className="font-semibold text-purple-700">{assurFileName}</p>
            : <p className="text-gray-500">Cliquez pour sélectionner le fichier assurances</p>}
          <p className="text-xs text-gray-400 mt-1">Devis MMA · Tableau primes · Export assureur · .xlsx ou .csv</p>
          <input ref={assurFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleAssurFile} />
        </div>

        {assurStatus === 'ready' && (
          <button onClick={handleAssurImport}
            className="mt-4 w-full py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors">
            🚀 Importer les assurances
          </button>
        )}
        {assurStatus === 'processing' && (
          <div className="mt-4 text-center text-purple-500 animate-pulse">⚙️ Import en cours…</div>
        )}
        {assurStatus === 'done' && assurResult && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-green-700 font-semibold">✅ {assurResult.inserted} contrats importés</p>
            {assurResult.skipped > 0 && <p className="text-gray-500 text-sm">{assurResult.skipped} lignes ignorées</p>}
          </div>
        )}
        {assurStatus === 'error' && assurResult && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-700 font-semibold">❌ Erreur d'import</p>
            {assurResult.errors.map((e,i) => <p key={i} className="text-red-500 text-sm mt-1">{e}</p>)}
          </div>
        )}
      </div>

      {/* ── Instructions ── */}
      <div className="bg-gray-50 rounded-xl p-5 text-sm text-gray-600">
        <p className="font-semibold text-gray-700 mb-2">📋 Comment utiliser</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Exportez votre fichier de charges flotte (Charges_VL_vX.xlsx)</li>
          <li>Uploadez-le dans la section du haut — feuilles détectées automatiquement</li>
          <li>Uploadez séparément le fichier assureur dans la section du bas</li>
          <li>Cliquez "Importer" pour chaque section</li>
        </ol>
      </div>
    </div>
  );
}
