const SCRIPT_URL="https://script.google.com/macros/s/AKfycbz7eV7srjlz1YzDuWpgs1arI5-5UIBs3-HpHh6ZI3dQM1V4x3kEbTszVuQCbRrTde8POQ/exec";
const PROXY="https://corsproxy.io/?";
let ACQUEREURS=[],HISTORIQUE=[],nextHistoId=1,selectedType='appel';
let modalAcqId=null,modalBienDesc='',modalSentiment='';

function setSyncStatus(s,l){document.getElementById('sync-dot').className='sync-dot'+(s!=='ok'?' '+s:'');document.getElementById('sync-label').textContent=l}
async function apiFetch(url){try{const r=await fetch(url,{redirect:'follow'});const j=await r.json();if(j.success!==undefined)return j}catch(e){}try{const r=await fetch(PROXY+encodeURIComponent(url));const j=await r.json();if(j.success!==undefined)return j}catch(e){}return null}
async function apiPost(body){try{await fetch(SCRIPT_URL,{method:'POST',body:JSON.stringify(body),redirect:'follow'});return true}catch(e){}try{await fetch(PROXY+encodeURIComponent(SCRIPT_URL),{method:'POST',body:JSON.stringify(body)});return true}catch(e){}return false}

function showToast(msg){const t=document.getElementById('toast');document.getElementById('toast-msg').textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000)}

async function charger(){
  setSyncStatus('loading','Synchronisation...');
  const[jacq,jhisto]=await Promise.all([apiFetch(SCRIPT_URL),apiPost({action:'get_historique'})]);
  if(jacq&&jacq.success){ACQUEREURS=(jacq.data||[]).map((r,i)=>parseRow(r,i));setSyncStatus('ok',ACQUEREURS.length+' acquéreur'+(ACQUEREURS.length!==1?'s':'')+' ✓')}
  else setSyncStatus('error','Hors ligne');
  if(jhisto&&jhisto.success&&jhisto.data){HISTORIQUE=jhisto.data.map((h,i)=>({id:i+1,date:h.date,acqId:null,nom:h.nom,prenom:h.prenom,type:h.type||'note',titre:h.titre,note:h.note}));nextHistoId=HISTORIQUE.length+1;HISTORIQUE.forEach(h=>{const a=ACQUEREURS.find(x=>x.nom===h.nom&&x.prenom===h.prenom);if(a)h.acqId=a.id})}
  renderDashboard();
  if(document.getElementById('v-acquereurs').classList.contains('active'))renderAcquereurs();
}

function parseRow(row,i){
  const nom=row['NOM']||'',prenom=row['PRÉNOM']||'';
  const budget=parseFloat((row['BUDGET (HAI)']||'0').toString().replace(/[\s€]/g,'').replace(',','.'))||0;
  const surface=parseFloat(row['SURFACE MIN (m²)']||0)||0;
  const pieces=parseInt(row['NB PIÈCES']||0)||0,chambres=parseInt(row['NB CHAMBRES']||0)||0;
  const secteurs=(row['SECTEURS RECHERCHÉS']||'').toString().split(/[,;]+/).map(s=>s.trim()).filter(Boolean);
  const presse=row['PRESSÉ']||'Non',financement=row['TYPE FINANCEMENT']||'Crédit',statut=row['STATUT']||'Actif';
  const visites=parseInt(row['NB VISITES EFFECTUÉES']||0)||0;
  let score=0;if(statut==='Actif')score+=2;if(presse==='Oui')score+=2;else if(presse==='Moyennement')score+=1;if(financement==='Comptant')score+=3;else if(financement==='Prêt relais')score+=2;else score+=1;if(visites>=5)score+=1;
  return{id:i+1,nom,prenom,tel:row['TÉLÉPHONE']||'',mail:row['MAIL']||'',profession:row['PROFESSION']||'',contact:row['WHATSAPP / MAIL']||'WhatsApp',source:row['SOURCE']||'',budget,surface_min:surface,pieces,chambres,secteurs,epoque:row['ÉPOQUE']||'Indifférent',ascenseur_oblig:row['ASCENSEUR OBLIGATOIRE']||'Non',etage_gene:parseInt(row['ÉTAGE GÊNANT (sans asc)']||0)||0,rdc_refuse:row['RDC / 1er REFUSÉ']||'Non',wc_oblig:row['WC SÉPARÉ OBLIGATOIRE']||'Non',travaux:row['TRAVAUX ACCEPTÉS']||'Oui',expo:row['EXPOSITION']||'Indifférent',courrue:row['COUR / RUE']||'Indifférent',cave:row['CAVE SOUHAITÉE']||'Non',parking:row['PARKING SOUHAITÉ']||'Non',financement,statut,presse,visites,dernierContact:row['DERNIER CONTACT']||new Date().toISOString().split('T')[0],score:Math.min(score,8),infos:row['INFORMATIONS COMPLÉMENTAIRES']||'',apport:parseFloat(row['APPORT (€)']||0)||0};
}

function ini(a){return((a.prenom||'?')[0]+(a.nom||'?')[0]).toUpperCase()}
function prixFmt(n){return n.toLocaleString('fr-FR')+' €'}
function joursDepuis(d){if(!d)return 0;return Math.floor((Date.now()-new Date(d))/(1000*60*60*24))}
function sc(s){return s>=7?'green':s>=4?'amber':'red'}
function sl(s){return s>=7?'Priorité haute':s>=4?'Priorité moyenne':'Priorité basse'}
function typeLabel(t){return{appel:'Appel',visite:'Visite',message:'Message',proposition:'Proposition',note:'Note'}[t]||t}

function ouvrirModal(acqId,bienDesc){
  modalAcqId=acqId;modalBienDesc=bienDesc;modalSentiment='';
  const a=ACQUEREURS.find(x=>x.id===acqId);
  document.getElementById('modal-acq-info').innerHTML='<div class="avatar" style="width:36px;height:36px;font-size:12px;flex-shrink:0">'+ini(a)+'</div><div><div class="modal-acq-name">'+a.prenom+' '+a.nom+'</div><div class="modal-acq-meta">'+prixFmt(a.budget)+' · '+a.financement+'</div></div>';
  document.getElementById('modal-bien-info').innerHTML='<i class="ti ti-home" style="font-size:14px;margin-right:6px"></i><strong>Bien proposé :</strong> '+(bienDesc||'Non renseigné');
  document.getElementById('modal-comment').value='';
  ['interesse','reflexion','pasinteresse'].forEach(s=>document.getElementById('s-'+s).className='sentiment-btn');
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal(){document.getElementById('modal-overlay').classList.remove('open')}
function fermerModal(e){if(e.target===document.getElementById('modal-overlay'))closeModal()}

function selectSentiment(s){
  modalSentiment=s;
  ['interesse','reflexion','pasinteresse'].forEach(id=>document.getElementById('s-'+id).className='sentiment-btn');
  document.getElementById('s-'+s).className='sentiment-btn selected '+s;
}

async function validerProposition(){
  const a=ACQUEREURS.find(x=>x.id===modalAcqId);
  if(!a)return;
  const comment=document.getElementById('modal-comment').value.trim();
  const sentimentLabel={interesse:'Intéressé 😊',reflexion:'En réflexion 🤔',pasinteresse:'Pas intéressé 👎'}[modalSentiment]||'';
  const titre='Proposition — '+(modalBienDesc||'bien');
  const note=(sentimentLabel?'Ressenti : '+sentimentLabel+(comment?' — ':'')+comment:comment)||'Aucun commentaire';
  const today=new Date().toISOString().split('T')[0];
  const h={id:nextHistoId++,date:today,acqId:modalAcqId,nom:a.nom,prenom:a.prenom,type:'proposition',titre,note};
  HISTORIQUE.unshift(h);
  a.dernierContact=today;
  closeModal();
  showToast('Proposition enregistrée pour '+a.prenom+' '+a.nom+' ✓');
  await Promise.all([
    apiPost({action:'add_historique',row:[today,a.nom,a.prenom,'proposition',titre,note]}),
    apiPost({action:'update_contact',nom:a.nom,prenom:a.prenom,dernierContact:today})
  ]);
}

function goTo(v){
  document.querySelectorAll('.view').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
  document.getElementById('v-'+v).classList.add('active');
  const idx={dashboard:0,search:1,acquereurs:2,ajout:3};
  if(idx[v]!==undefined)document.querySelectorAll('.nav-item')[idx[v]]?.classList.add('active');
  if(v==='dashboard')renderDashboard();
  if(v==='acquereurs')renderAcquereurs();
}

function ouvrirFiche(id){
  renderFiche(id);
  document.querySelectorAll('.view').forEach(el=>el.classList.remove('active'));
  document.getElementById('v-fiche').classList.add('active');
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.nav-item')[2]?.classList.add('active');
}

function renderDashboard(){
  const actifs=ACQUEREURS.filter(a=>a.statut==='Actif');
  const chauds=actifs.filter(a=>a.score>=7);
  const moyens=actifs.filter(a=>a.score>=4&&a.score<7);
  const bm=actifs.length?Math.round(actifs.reduce((s,a)=>s+a.budget,0)/actifs.length):0;
  const alertes=ACQUEREURS.filter(a=>a.statut==='Actif'&&joursDepuis(a.dernierContact)>30);
  document.getElementById('dash-content').innerHTML='<div class="kpi-row"><div class="kpi accent"><div class="kpi-label">Acquéreurs actifs</div><div class="kpi-val">'+actifs.length+'</div><div class="kpi-sub">sur '+ACQUEREURS.length+' au total</div></div><div class="kpi green"><div class="kpi-label">Priorité haute</div><div class="kpi-val">'+chauds.length+'</div><div class="kpi-sub">score ≥ 7/8</div></div><div class="kpi amber"><div class="kpi-label">Priorité moyenne</div><div class="kpi-val">'+moyens.length+'</div><div class="kpi-sub">score 4–6/8</div></div><div class="kpi purple"><div class="kpi-label">Budget moyen</div><div class="kpi-val" style="font-size:20px">'+prixFmt(bm)+'</div><div class="kpi-sub">actifs</div></div></div><div class="two-col"><div class="card"><div class="card-hd"><div class="card-title"><i class="ti ti-flame"></i> Priorité haute</div></div><div class="card-bd">'+chauds.slice(0,5).map(a=>'<div class="row" onclick="ouvrirFiche('+a.id+')"><div class="row-left"><div class="avatar">'+ini(a)+'</div><div><div class="row-name">'+a.prenom+' '+a.nom+'</div><div class="row-meta">'+prixFmt(a.budget)+' · '+a.financement+'</div></div></div><div class="row-right"><span class="pill '+sc(a.score)+'">'+a.score+'/8</span>'+(a.presse==='Oui'?'<span class="pill navy">Pressé</span>':'')+'</div></div>').join('')+'</div></div><div class="card"><div class="card-hd"><div class="card-title"><i class="ti ti-bell"></i> À relancer</div><span class="pill '+(alertes.length?'amber':'gray')+'">'+alertes.length+'</span></div><div class="card-bd">'+alertes.map(a=>'<div class="alert-row" onclick="ouvrirFiche('+a.id+')"><div class="alert-icon"><i class="ti ti-clock"></i></div><div><div class="alert-name">'+a.prenom+' '+a.nom+'</div><div class="alert-days">'+joursDepuis(a.dernierContact)+' jours sans contact</div></div></div>').join('')+'</div></div></div><div class="card"><div class="card-hd"><div class="card-title"><i class="ti ti-clock"></i> Activité récente</div></div><div class="card-bd">'+HISTORIQUE.slice(0,5).map(h=>{const a=ACQUEREURS.find(x=>x.id===h.acqId);return'<div class="histo-row"><div class="histo-dot '+h.type+'"></div><div class="histo-body"><div class="histo-who">'+(a?a.prenom+' '+a.nom:(h.prenom+' '+h.nom))+' <span class="type-chip '+h.type+'">'+typeLabel(h.type)+'</span></div><div class="histo-what">'+h.titre+'</div></div><div class="histo-date">'+(h.date?new Date(h.date).toLocaleDateString('fr-FR'):'')+' </div></div>';}).join('')+'</div></div>';
}

function renderAcquereurs(){
  const q=(document.getElementById('search-acq')?.value||'').toLowerCase();
  const sorted=[...ACQUEREURS].sort((a,b)=>b.score-a.score);
  const filtered=q?sorted.filter(a=>(a.nom+' '+a.prenom+' '+a.secteurs.join(' ')+' '+a.budget).toLowerCase().includes(q)):sorted;
  const el=document.getElementById('acq-count');
  if(el)el.textContent=filtered.length+' acquéreur'+(filtered.length!==1?'s':'')+(q?' trouvé'+(filtered.length!==1?'s':''):'');
  document.getElementById('acq-list').innerHTML=filtered.map(a=>'<div class="row" onclick="ouvrirFiche('+a.id+')"><div class="row-left"><div class="avatar md">'+ini(a)+'</div><div><div class="row-name">'+a.prenom+' '+a.nom+'</div><div class="row-meta">'+prixFmt(a.budget)+' · '+a.secteurs.join(', ')+' · '+a.pieces+'P/'+a.surface_min+'m²'+(a.source?' · '+a.source:'')+'</div></div></div><div class="row-right"><span class="pill '+(a.statut==='Actif'?sc(a.score):'gray')+'">'+(a.statut==='Actif'?a.score+'/8':a.statut)+'</span>'+(joursDepuis(a.dernierContact)>30?'<span class="pill amber" style="font-size:10px">À relancer</span>':'')+'<i class="ti ti-chevron-right" style="font-size:14px;color:#AEAEB2"></i></div></div>').join('')||'<div style="padding:32px;text-align:center;font-size:13px;color:#6E6E73">'+(q?'Aucun résultat pour "'+q+'"':'Aucun acquéreur.')+'</div>';
}

function filterAcquereurs(){renderAcquereurs()}

function renderFiche(id){
  const a=ACQUEREURS.find(x=>x.id===id);
  if(!a)return;
  const histo=HISTORIQUE.filter(h=>h.acqId===id).sort((x,y)=>new Date(y.date)-new Date(x.date));
  document.getElementById('fiche-content').innerHTML='<div class="fiche-hero"><div style="display:flex;align-items:center;gap:16px"><div class="avatar-hero">'+ini(a)+'</div><div><div class="fiche-name">'+a.prenom+' '+a.nom+'</div><div style="margin-top:5px"><span class="pill '+sc(a.score)+'" style="font-size:11px">'+sl(a.score)+' · '+a.score+'/8</span>'+(a.presse==='Oui'?'<span class="pill navy" style="font-size:11px;margin-left:5px">Pressé</span>':'')+'</div><div class="fiche-meta" style="margin-top:7px">'+( a.profession||'—')+' · '+a.contact+' · '+a.statut+'</div><div class="fiche-meta">'+a.tel+' · '+a.mail+'</div>'+(a.source?'<div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:4px"><i class="ti ti-antenna" style="font-size:12px"></i> '+a.source+'</div>':'')+'</div></div><div style="text-align:right"><div class="fiche-budget">'+prixFmt(a.budget)+'</div><div class="fiche-criteria">'+a.pieces+'P · '+a.surface_min+'m² · '+a.secteurs.join(', ')+'</div><div class="fiche-criteria">'+a.financement+(a.apport?' · Apport '+prixFmt(a.apport):'')+'</div></div></div>'+(a.infos?'<div style="background:#EEF2FF;border:0.5px solid #C7D2FE;border-radius:10px;padding:12px 16px;font-size:13px;color:#3730A3;margin-bottom:16px;display:flex;gap:8px"><i class="ti ti-notes" style="font-size:15px;flex-shrink:0;margin-top:1px"></i>'+a.infos+'</div>':'')+'<div class="contact-box"><div style="font-size:13px;font-weight:500;color:#1D1D1F;margin-bottom:12px">Enregistrer un contact</div><div class="type-tabs"><button class="type-tab active appel" id="tb-appel" onclick="selectType(\'appel\')"><i class="ti ti-phone"></i> Appel</button><button class="type-tab" id="tb-visite" onclick="selectType(\'visite\')"><i class="ti ti-door"></i> Visite</button><button class="type-tab" id="tb-message" onclick="selectType(\'message\')"><i class="ti ti-message"></i> Message</button><button class="type-tab" id="tb-proposition" onclick="selectType(\'proposition\')"><i class="ti ti-home"></i> Proposition bien</button><button class="type-tab" id="tb-note" onclick="selectType(\'note\')"><i class="ti ti-notes"></i> Note</button></div><div class="field"><label>Titre</label><input type="text" id="contact-titre" placeholder="ex: Appel de suivi"></div><div class="field" style="margin-bottom:14px"><label>Note</label><textarea id="contact-note" placeholder="Retours du client..."></textarea></div><button class="btn-green" onclick="enregistrerContact('+id+')"><i class="ti ti-check"></i> Enregistrer <span class="saved-chip">💾 Sheets</span></button></div><div class="card"><div class="card-hd"><div class="card-title"><i class="ti ti-clock"></i> Historique</div><span class="pill gray">'+histo.length+' entrée'+(histo.length!==1?'s':'')+'</span></div><div class="card-bd">'+(histo.length?histo.map(h=>'<div class="histo-row"><div class="histo-dot '+h.type+'"></div><div class="histo-body"><div class="histo-who"><span class="type-chip '+h.type+'">'+typeLabel(h.type)+'</span> <span style="font-size:13px;font-weight:500">'+h.titre+'</span></div>'+(h.note?'<div class="histo-what">'+h.note+'</div>':'')+'</div><div class="histo-date">'+(h.date?new Date(h.date).toLocaleDateString('fr-FR'):'')+' </div></div>').join(''):'<div style="padding:16px 18px;font-size:13px;color:#6E6E73">Aucun contact enregistré.</div>')+'</div></div>';
  selectedType='appel';
}

function selectType(t){
  selectedType=t;
  ['appel','visite','message','proposition','note'].forEach(type=>{
    const btn=document.getElementById('tb-'+type);
    if(!btn)return;
    btn.className='type-tab'+(type===t?' active '+t:'');
  });
}

async function enregistrerContact(acqId){
  const titre=document.getElementById('contact-titre').value.trim();
  const note=document.getElementById('contact-note').value.trim();
  if(!titre){alert('Renseignez un titre.');return}
  const a=ACQUEREURS.find(x=>x.id===acqId);
  const today=new Date().toISOString().split('T')[0];
  const h={id:nextHistoId++,date:today,acqId,nom:a?a.nom:'',prenom:a?a.prenom:'',type:selectedType,titre,note};
  HISTORIQUE.unshift(h);
  if(a){
    a.dernierContact=today;
    if(selectedType==='visite')a.visites=(a.visites||0)+1;
    let s=0;if(a.statut==='Actif')s+=2;if(a.presse==='Oui')s+=2;else if(a.presse==='Moyennement')s+=1;if(a.financement==='Comptant')s+=3;else if(a.financement==='Prêt relais')s+=2;else s+=1;if(a.visites>=5)s+=1;a.score=Math.min(s,8);
    await Promise.all([apiPost({action:'add_historique',row:[today,a.nom,a.prenom,selectedType,titre,note]}),apiPost({action:'update_contact',nom:a.nom,prenom:a.prenom,dernierContact:today})]);
    showToast('Contact enregistré ✓');
  }
  renderFiche(acqId);
}

function matchSect(sects,bien){if(!bien)return true;const parts=bien.toLowerCase().split(/[,\s]+/).map(s=>s.trim().replace(/[eèème]/g,''));return sects.some(s=>parts.some(p=>p&&s.toLowerCase().replace(/[eèème]/g,'').includes(p)))}

function lancer(){
  const b={secteur:document.getElementById('s-secteur').value.trim(),prix:parseFloat(document.getElementById('s-prix').value)||0,surface:parseFloat(document.getElementById('s-surface').value)||0,pieces:parseInt(document.getElementById('s-pieces').value)||0,etage:document.getElementById('s-etage').value!==''?parseInt(document.getElementById('s-etage').value):null,epoque:document.getElementById('s-epoque').value,ascenseur:document.getElementById('s-asc').value,wc:document.getElementById('s-wc').value,travaux:document.getElementById('s-trav').value,expo:document.getElementById('s-expo').value,courrue:document.getElementById('s-cour').value,cave:document.getElementById('s-cave').value,parking:document.getElementById('s-park').value};
  const TOL=1.07,res=[];
  for(const a of ACQUEREURS){
    if(a.statut==='Abandonné')continue;
    let bloque=false;
    if(b.prix>0&&b.prix>a.budget*TOL)bloque=true;
    if(b.surface>0&&a.surface_min>0&&b.surface<a.surface_min/TOL)bloque=true;
    if(a.ascenseur_oblig==='Oui'&&b.ascenseur==='Non')bloque=true;
    if(b.etage!==null&&b.ascenseur==='Non'&&a.etage_gene>0&&b.etage>=a.etage_gene)bloque=true;
    if(a.rdc_refuse==='Oui'&&b.etage!==null&&b.etage<=1)bloque=true;
    if(a.wc_oblig==='Oui'&&b.wc==='Non')bloque=true;
    if(b.travaux==='Gros travaux'&&a.travaux!=='Oui')bloque=true;
    if(b.travaux==='Petits travaux'&&a.travaux==='Non')bloque=true;
    if(bloque)continue;
    let ok=[],warn=[],ms=0;
    if(b.prix>0){b.prix<=a.budget?(ok.push('Budget OK'),ms+=2):warn.push('Budget +'+Math.round((b.prix-a.budget)/a.budget*100)+'% (tolérance)')}
    if(b.surface>0&&a.surface_min>0){b.surface>=a.surface_min?(ok.push('Surface OK'),ms+=1):warn.push('Surface légèrement sous le min')}
    if(b.pieces>0&&a.pieces>0){b.pieces>=a.pieces?(ok.push('Nb pièces OK'),ms+=1):warn.push('1 pièce de moins')}
    if(b.secteur){matchSect(a.secteurs,b.secteur)?(ok.push('Secteur OK'),ms+=2):warn.push('Secteur hors critères')}
    if(b.epoque&&a.epoque!=='Indifférent'){b.epoque===a.epoque?(ok.push('Époque OK'),ms+=1):warn.push('Époque différente')}
    if(b.expo&&a.expo!=='Indifférent'){b.expo===a.expo?(ok.push('Exposition OK'),ms+=1):warn.push('Expo différente')}
    if(b.courrue&&a.courrue!=='Indifférent'){b.courrue===a.courrue?(ok.push('Calme/Rue OK'),ms+=1):warn.push('Préfère la cour')}
    if(b.cave==='Oui'&&a.cave==='Oui'){ok.push('Cave OK');ms+=1}
    if(b.parking==='Oui'&&a.parking==='Oui'){ok.push('Parking OK');ms+=1}
    res.push({a,ok,warn,ms});
  }
  res.sort((x,y)=>y.a.score!==x.a.score?y.a.score-x.a.score:y.ms-x.ms);
  renderResults(res,b);
}

function renderResults(res,b){
  const z=document.getElementById('s-results');
  if(!res.length){z.innerHTML='<div class="empty"><i class="ti ti-zoom-cancel"></i><div class="empty-t">Aucun acquéreur compatible</div><div class="empty-s">Aucun profil ne passe les critères bloquants.</div></div>';return}
  const bd=(b.pieces?b.pieces+'P ':'')+' '+(b.surface?b.surface+'m² ':'')+( b.secteur?b.secteur+' ':'')+( b.prix?'— '+prixFmt(b.prix):'');
  let h='<div class="results-bar"><span class="results-count"><strong>'+res.length+'</strong> acquéreur'+(res.length>1?'s':'')+' compatible'+(res.length>1?'s':'')+'</span></div>';
  for(const{a,ok,warn,ms}of res){
    const pc=sc(a.score);
    const bv=b.prix>0&&b.prix>a.budget?'<span class="rc-kpi-val warn">'+prixFmt(a.budget)+'</span>':'<span class="rc-kpi-val">'+prixFmt(a.budget)+'</span>';
    h+='<div class="result-card '+pc+'"><div class="rc-head"><div class="rc-id"><div class="avatar">'+ini(a)+'</div><div><div class="rc-name">'+a.prenom+' '+a.nom+'</div><div class="rc-meta">'+a.tel+' · '+a.financement+(a.presse==='Oui'?' · <span style="color:#085041">Pressé</span>':'')+'</div></div></div><div style="display:flex;gap:6px;align-items:center"><span class="pill navy">'+ms+' critères</span><span class="pill '+pc+'">'+sl(a.score)+' · '+a.score+'/8</span></div></div><div class="rc-body"><div class="rc-kpis"><div class="rc-kpi"><div class="rc-kpi-label">Budget max</div>'+bv+'</div><div class="rc-kpi"><div class="rc-kpi-label">Surface min</div><div class="rc-kpi-val">'+a.surface_min+' m²</div></div><div class="rc-kpi"><div class="rc-kpi-label">Pièces</div><div class="rc-kpi-val">'+a.pieces+'P · '+a.chambres+'ch</div></div><div class="rc-kpi"><div class="rc-kpi-label">Secteurs</div><div class="rc-kpi-val" style="font-size:11px">'+a.secteurs.join(', ')+'</div></div></div><div class="tags">'+ok.map(t=>'<span class="tag ok"><i class="ti ti-check"></i>'+t+'</span>').join('')+warn.map(t=>'<span class="tag warn"><i class="ti ti-alert-triangle"></i>'+t+'</span>').join('')+'</div><div class="rc-foot"><button class="btn-sm orange" onclick="ouvrirModal('+a.id+',\''+bd.trim()+'\')"><i class="ti ti-home-check"></i> Enregistrer la proposition</button><button class="btn-sm green" onclick="ouvrirFiche('+a.id+')"><i class="ti ti-user"></i> Voir la fiche</button><button class="btn-sm ghost"><i class="ti ti-phone"></i> '+a.tel+'</button></div></div></div>';
  }
  z.innerHTML=h;
}

async function ajouterAcquereur(){
  const nom=document.getElementById('f-nom').value.trim(),prenom=document.getElementById('f-prenom').value.trim();
  if(!nom||!prenom){alert('Nom et prénom obligatoires.');return}
  const sects=document.getElementById('f-secteurs').value.split(',').map(s=>s.trim()).filter(Boolean);
  const presse=document.getElementById('f-presse').value,financement=document.getElementById('f-fin').value,statut=document.getElementById('f-statut').value;
  let score=0;if(statut==='Actif')score+=2;if(presse==='Oui')score+=2;else if(presse==='Moyennement')score+=1;if(financement==='Comptant')score+=3;else if(financement==='Prêt relais')score+=2;else score+=1;
  const a={id:ACQUEREURS.length+1,nom,prenom,tel:document.getElementById('f-tel').value,mail:document.getElementById('f-mail').value,profession:document.getElementById('f-prof').value,source:document.getElementById('f-source').value,contact:document.getElementById('f-contact').value,budget:parseFloat(document.getElementById('f-budget').value)||0,surface_min:parseFloat(document.getElementById('f-surface').value)||0,pieces:parseInt(document.getElementById('f-pieces').value)||0,chambres:parseInt(document.getElementById('f-chambres').value)||0,secteurs:sects,epoque:document.getElementById('f-epoque').value,ascenseur_oblig:document.getElementById('f-asc').value,etage_gene:parseInt(document.getElementById('f-etage-gene').value)||0,rdc_refuse:document.getElementById('f-rdc').value,wc_oblig:document.getElementById('f-wc').value,travaux:document.getElementById('f-travaux').value,expo:document.getElementById('f-expo').value,courrue:document.getElementById('f-courrue').value,cave:document.getElementById('f-cave').value,parking:document.getElementById('f-park').value,financement,apport:parseFloat(document.getElementById('f-apport').value)||0,proprio:document.getElementById('f-proprio').value,presse,statut,visites:0,dateEntree:new Date().toISOString().split('T')[0],dernierContact:new Date().toISOString().split('T')[0],infos:document.getElementById('f-infos').value,score:Math.min(score,8)};
  ACQUEREURS.push(a);
  const row=[a.nom,a.prenom,a.tel,a.mail,a.surface_min,a.secteurs.join(', '),a.epoque,a.pieces,a.chambres,a.wc_oblig,a.ascenseur_oblig,a.etage_gene,a.profession,a.presse,a.contact,0,'',a.rdc_refuse,a.infos,a.budget,a.financement,a.apport,'','Non','Non',a.statut,a.source,a.dateEntree,a.dernierContact];
  const ok=await apiPost({action:'add',row});
  document.getElementById('form-success').style.display='flex';
  document.getElementById('form-success').innerHTML='<div class="success-msg"><i class="ti ti-check"></i> '+prenom+' '+nom+' ajouté'+(ok?' et sauvegardé dans Google Sheets ✓':' (hors ligne)')+'. Score : '+a.score+'/8 — <span style="cursor:pointer;text-decoration:underline;margin-left:4px" onclick="ouvrirFiche('+a.id+')">Voir la fiche →</span></div>';
  showToast(prenom+' '+nom+' ajouté ✓');
  resetForm();
}

function resetForm(){['f-nom','f-prenom','f-tel','f-mail','f-prof','f-secteurs','f-budget','f-surface','f-pieces','f-chambres','f-etage-gene','f-apport','f-infos'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''})}

charger();
