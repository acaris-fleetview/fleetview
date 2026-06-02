import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../services/api';

interface ImportResult { source: string; inserted: number; skipped: number; errors: string[]; }
interface SheetResult {
  name: string;
  label: string;
  icon: string;
  status: 'pending' | 'processing' | 'done' | 'error' | 'skipped';
  result?: ImportResult;
  message?: string;
}

function findCol(headers: string[], keywords: string[]): number {
  return headers.findIndex(h => h && keywords.some(k => h.toLowerCase().includes(k.toLowerCase())));
}
function parseDate(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  const s = String(val);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0,10);
  const n = Number(val);
  if (!isNaN(n) && n > 40000) return new Date((n-25569)*86400*1000).toISOString().split('T')[0];
  return null;
}
function parseNum(val: unknown): number | null {
  if (val===null||val===undefined||val==='') return null;
  const n = parseFloat(String(val).replace(',','.'));
  return isNaN(n) ? null : n;
}

function parseThankyou(rows: unknown[][]): object[] {
  if (!rows.length) return [];
  const h = (rows[0] as string[]).map(x=>String(x??''));
  const iPlaque=findCol(h,['immatriculation','plaque','vehicle']);
  const iDate=findCol(h,['livraison','facturation','date']);
  const iPrix=findCol(h,['prix unitaire','unit','prix/litre','litre']);
  const iVol=findCol(h,['quantité','quantite','volume','qt']);
  const iTotal=findCol(h,['total ht','montant ht','total']);
  const iProduit=findCol(h,['produit','service','désignation']);
  const out: object[] = [];
  for (const row of rows.slice(1)) {
    if (String(row[iProduit]??'').toLowerCase().includes('frais')) continue;
    const plaque=String(row[iPlaque]??'').trim(), date=parseDate(row[iDate]);
    const prix=parseNum(row[iPrix]), vol=parseNum(row[iVol]), total=parseNum(row[iTotal]);
    if (!plaque||!date||!prix||!vol||prix>5||prix<0.5||vol<1) continue;
    out.push({ vehicleId:plaque, transactedAt:date, volumeL:vol, unitPriceEur:prix, totalEur:total??+(prix*vol).toFixed(2), fuelType:'Gasoil' });
  }
  return out;
}
function parseTotalMobility(rows: unknown[][]): object[] {
  if (!rows.length) return [];
  const h=(rows[0] as string[]).map(x=>String(x??''));
  const iDate=findCol(h,['date']),iDesc=findCol(h,['désignation','designation','produit']);
  const iQte=findCol(h,['quantité','quantite','qté']),iPrix=findCol(h,['prix unitaire','prix unit']);
  const iTotal=findCol(h,['montant ht','total ht','montant']);
  const out: object[] = [];
  for (const row of rows.slice(1)) {
    const date=parseDate(row[iDate]),desc=String(row[iDesc]??'').trim();
    const qte=parseNum(row[iQte]),prix=parseNum(row[iPrix]),total=parseNum(row[iTotal]);
    if (!date||!desc||!qte||!prix) continue;
    if (typeof row[iDate]==='string'&&row[iDate].toLowerCase().includes('data')) continue;
    out.push({ date, description:desc, quantity:qte, unitPriceEur:prix, totalEur:total??+(prix*qte).toFixed(2) });
  }
  return out;
}
function parseEntretiens(rows: unknown[][]): object[] {
  if (!rows.length) return [];
  const h=(rows[0] as string[]).map(x=>String(x??''));
  const iDate=findCol(h,['date']),iImmat=findCol(h,['immatriculation','plaque','immat']);
  const iType=findCol(h,['entretien','type','désignation','description']),iPrix=findCol(h,['prix','montant','coût','cout','total']);
  const out: object[] = [];
  for (const row of rows.slice(1)) {
    const date=parseDate(row[iDate]),immat=String(row[iImmat]??'').trim(),type=String(row[iType]??'').trim();
    if (!date||!immat||!type) continue;
    out.push({ vehicleId:immat, date, type, costEur:parseNum(row[iPrix])??0 });
  }
  return out;
}
function parseAssurances(rows: unknown[][]): object[] {
  if (!rows.length) return [];
  let hi = 0;
  for (let i=0;i<Math.min(rows.length,10);i++) {
    if ((rows[i] as unknown[]).filter(c=>c!==null&&String(c).trim()!=='').length>=2){hi=i;break;}
  }
  const h=(rows[hi] as string[]).map(x=>String(x??''));
  const iImmat=findCol(h,['immatriculation','plaque','véhicule','vehicule']);
  const iMarque=findCol(h,['marque','modèle','modele']);
  const iPrime=findCol(h,['prime','cotisation','montant','ttc','annuel','total']);
  const iDebut=findCol(h,['début','debut','effet','date début']);
  const iFin=findCol(h,['fin','échéance','echeance']);
  const out: object[] = [];
  for (const row of rows.slice(hi+1)) {
    const immat=iImmat>=0?String(row[iImmat]??'').trim():'';
    const prime=parseNum(row[iPrime]);
    if (!prime) continue;
    out.push({ vehicleId:immat||'FLOTTE', marque:iMarque>=0?String(row[iMarque]??''):'',
      annualPremiumEur:prime, startDate:iDebut>=0?parseDate(row[iDebut]):null, endDate:iFin>=0?parseDate(row[iFin]):null });
  }
  return out;
}
function parseLocation(rows: unknown[][]): object[] {
  if (!rows.length) return [];
  const h=(rows[0] as string[]).map(x=>String(x??''));
  const iDate=findCol(h,['date']),iLoueur=findCol(h,['loueur','fournisseur']);
  const iModele=findCol(h,['modele','modèle','véhicule']),iImmat=findCol(h,['immatriculation','plaque']);
  const iJrs=findCol(h,['jours','jrs','durée']),iLoyer=findCol(h,['loyer','location','montant']),iAssur=findCol(h,['assurance']);
  const out: object[] = [];
  for (const row of rows.slice(1)) {
    const date=parseDate(row[iDate]),loyer=parseNum(row[iLoyer]);
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
  const iDate=findCol(h,['date']),iType=findCol(h,['infraction','type','désignation']);
  const iDriver=findCol(h,['chauffeur','conducteur']),iMontant=findCol(h,['montant','amende','total']);
  const iImpute=findCol(h,['imputation','impute','société']);
  const out: object[] = [];
  for (const row of rows.slice(1)) {
    const date=parseDate(row[iDate]),montant=parseNum(row[iMontant]);
    if (!date||!montant) continue;
    out.push({ date, type:iType>=0?String(row[iType]??''):'', driver:iDriver>=0?String(row[iDriver]??''):'',
      amountEur:montant, imputation:iImpute>=0?String(row[iImpute]??''):'' });
  }
  return out;
}
function parseAmortissement(rows: unknown[][]): object[] {
  if (!rows.length) return [];
  const h=(rows[0] as string[]).map(x=>String(x??''));
  const iVeh=findCol(h,['vehicule','véhicule','camion']),iAchat=findCol(h,['prix achat','valeur','coût','cout']);
  const iDate=findCol(h,['date achat','date']),iValNet=findCol(h,['valeur nette','vnet','net']);
  const seen=new Set<string>();const out: object[]=[];
  for (const row of rows.slice(1)) {
    const veh=String(row[iVeh]??'').trim();
    if (!veh||seen.has(veh)) continue;
    seen.add(veh);
    const achat=parseNum(row[iAchat]);
    if (!achat) continue;
    out.push({ vehicleId:veh, purchaseDate:iDate>=0?parseDate(row[iDate]):null,
      purchasePriceEur:achat, netValueEur:iValNet>=0?parseNum(row[iValNet]):null });
  }
  return out;
}

const SHEET_CONFIG: { keywords:string[]; label:string; icon:string; destination:string; endpoint:string; parser:(r:unknown[][])=>object[] }[] = [
  { keywords:['thank you','tankyou','carburant'],  label:'Carburant',      icon:'⛽', destination:'Onglet Carburant',    endpoint:'/import/fuel',           parser:parseThankyou },
  { keywords:['total mobility','total'],           label:'Total Mobility', icon:'🛢️', destination:'Onglet Carburant',    endpoint:'/import/total-mobility',  parser:parseTotalMobility },
  { keywords:['entretien','maintenance','divers'],  label:'Entretiens',     icon:'🔧', destination:'Onglet Entretien',    endpoint:'/import/maintenance',     parser:parseEntretiens },
  { keywords:['assurance'],                        label:'Assurances',     icon:'🛡️', destination:'Onglet Assurances',   endpoint:'/import/insurance',       parser:parseAssurances },
  { keywords:['location vl','location'],           label:'Location VL',    icon:'🚐', destination:'Onglet Flotte',       endpoint:'/import/rental',          parser:parseLocation },
  { keywords:['infraction','amende'],              label:'Infractions',    icon:'⚠️', destination:'Onglet Alertes',      endpoint:'/import/infractions',     parser:parseInfractions },
  { keywords:['amortissement'],                    label:'Amortissement',  icon:'📉', destination:'Onglet Flotte',       endpoint:'/import/depreciation',    parser:parseAmortissement },
];
function matchSheet(name:string) {
  const n=name.toLowerCase();
  return SHEET_CONFIG.find(c=>c.keywords.some(k=>n.includes(k)));
}

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName]     = useState('');
  const [sheets, setSheets]         = useState<SheetResult[]>([]);
  const [running, setRunning]       = useState(false);
  const [done, setDone]             = useState(false);
  const [lastImport, setLastImport] = useState<string|null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setFileName(file.name); setDone(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(new Uint8Array(ev.target!.result as ArrayBuffer), { type:'array', cellDates:true });
      setSheets(wb.SheetNames.map(name => {
        const config = matchSheet(name);
        return config
          ? { name, label:config.label, icon:config.icon, status:'pending', message:`→ ${config.destination}` }
          : { name, label:name, icon:'⚪', status:'skipped', message:'Non reconnu — ignoré' };
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
      if (sheet.status==='skipped') continue;
      const config = matchSheet(sheet.name); if (!config) continue;
      setSheets(prev=>prev.map(s=>s.name===sheet.name?{...s,status:'processing'}:s));
      try {
        const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheet.name], { header:1, defval:null });
        const records = config.parser(rows as unknown[][]);
        if (!records.length) {
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

  const pendingCount = sheets.filter(s=>s.status==='pending').length;
  const totalInserted = sheets.reduce((acc,s)=>acc+(s.result?.inserted??0),0);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import mensuel</h1>
        <p className="text-gray-500 mt-1">Uploadez votre fichier Excel — les données sont automatiquement redirigées vers les bons onglets.</p>
        {lastImport && <p className="text-xs text-green-600 mt-1">✓ Dernier import : {lastImport}</p>}
      </div>

      {/* Zone de dépôt */}
      <div onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-blue-300 rounded-2xl p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all mb-6">
        <div className="text-5xl mb-4">📂</div>
        {fileName
          ? <p className="font-semibold text-blue-700 text-lg">{fileName}</p>
          : <>
              <p className="text-gray-600 font-medium">Cliquez ou déposez votre fichier ici</p>
              <p className="text-gray-400 text-sm mt-2">Charges_VL_vX.xlsx · Fichier assureur · Tout format Excel</p>
            </>}
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      </div>

      {/* Feuilles détectées */}
      {sheets.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">
              {pendingCount > 0 ? `${pendingCount} feuille${pendingCount>1?'s':''} prête${pendingCount>1?'s':''} à importer` : 'Feuilles détectées'}
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {sheets.map(s => (
              <div key={s.name} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl w-8 text-center">
                    {s.status==='processing' ? '⚙️' : s.status==='done' ? '✅' : s.status==='error' ? '❌' : s.icon}
                  </span>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{s.label}</p>
                    <p className="text-xs text-gray-400">{s.message}</p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  {s.status==='pending'    && <span className="text-gray-400">En attente</span>}
                  {s.status==='processing' && <span className="text-blue-500 animate-pulse">Import…</span>}
                  {s.status==='skipped'    && <span className="text-gray-300">—</span>}
                  {s.status==='done' && s.result && (
                    <span className="text-green-600 font-semibold">{s.result.inserted} lignes</span>
                  )}
                  {s.status==='error' && <span className="text-red-500 text-xs">{s.message}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bouton import */}
      {pendingCount > 0 && (
        <button onClick={handleImport} disabled={running}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
          {running ? '⚙️ Import en cours…' : `🚀 Importer maintenant`}
        </button>
      )}

      {/* Résumé final */}
      {done && totalInserted > 0 && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
          <p className="text-green-700 font-bold text-xl">✅ {totalInserted} enregistrements importés</p>
          <p className="text-green-500 text-sm mt-1">Les données sont disponibles dans tous les onglets</p>
        </div>
      )}

      {/* Guide */}
      {sheets.length === 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {SHEET_CONFIG.map(c => (
            <div key={c.label} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <span className="text-xl">{c.icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-700">{c.label}</p>
                <p className="text-xs text-gray-400">{c.destination}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
