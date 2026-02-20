export const APP_JS = `
'use strict';

// ── STATE ───────────────────────────────────────────────────
let currentUser = null;
let canEdit = false;
let DATA = { hs:{core:[],loose:[],fringe:[]}, ms:{core:[],loose:[],fringe:[]} };
let currentStudentKey = null;
let editState = { mode:'add', sk:'hs', section:'core', index:-1 };
let connectedVal = false;
let interactionKey = null;
let toastTimer = null;

// ── GRADIENTS (yellow palette) ──────────────────────────────
const GRADIENTS = [
  'linear-gradient(135deg,#f5c842,#f0a800)',
  'linear-gradient(135deg,#fbbf24,#f59e0b)',
  'linear-gradient(135deg,#fcd34d,#fbbf24)',
  'linear-gradient(135deg,#f0a800,#d97706)',
  'linear-gradient(135deg,#fde68a,#f5c842)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#f5c842,#fbbf24)',
  'linear-gradient(135deg,#fbbf24,#f0a800)',
];

// ── HELPERS ─────────────────────────────────────────────────
function initials(n) {
  return (n||'?').trim().split(/\\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();
}
function driveThumb(url) {
  const m = (url||'').match(/\\/d\\/([a-zA-Z0-9_-]+)/);
  return m ? 'https://drive.google.com/thumbnail?id='+m[1]+'&sz=w200-h200-c' : null;
}
function formatDate(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'});
}
function calcAge(bd) {
  if (!bd) return null;
  const d = new Date(bd);
  if (isNaN(d)) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() - d.getMonth() < 0 || (now.getMonth()===d.getMonth() && now.getDate()<d.getDate())) age--;
  return age > 0 && age < 30 ? age : null;
}
function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff/60000);
  if (m<2) return 'just now';
  if (m<60) return m+'m ago';
  const h = Math.floor(m/60);
  if (h<24) return h+'h ago';
  const days = Math.floor(h/24);
  if (days<7) return days+'d ago';
  const wk = Math.floor(days/7);
  if (wk<5) return wk+'w ago';
  return Math.floor(days/30)+'mo ago';
}

// ── SCREEN MANAGEMENT ────────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-'+name);
  if (el) { el.classList.add('active'); window.scrollTo(0,0); }
}

// ── MAIN NAV PANELS ──────────────────────────────────────────
function switchMainNav(name, btn) {
  document.querySelectorAll('.nav-panel').forEach(p => p.style.display='none');
  const p = document.getElementById('nav-'+name);
  if (p) p.style.display='';
  document.querySelectorAll('.nav-pill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (name==='activity') loadActivityFeed();
}

// ── GATE ─────────────────────────────────────────────────────
async function initGate() {
  // Check for an existing server-side session (passcode or leader)
  try {
    const res = await fetch('/api/me');
    const data = await res.json();
    if (data.user) { currentUser = data.user; canEdit = ['approved','admin','leader'].includes(currentUser.role); initApp(); return; }
  } catch(_) {}
  showScreen('gate');
  showLanes();
}

function showLanes() {
  const lf = document.getElementById('gate-leader-form');
  const pf = document.getElementById('gate-passcode-form');
  const la = document.getElementById('gate-lanes');
  if (lf) lf.style.display = 'none';
  if (pf) pf.style.display = 'none';
  if (la) la.style.display = 'flex';
}

function showPasscodeForm() {
  document.getElementById('gate-lanes').style.display = 'none';
  const pf = document.getElementById('gate-passcode-form');
  pf.style.display = 'flex';
  document.getElementById('gate-input').focus();
  document.getElementById('gate-input').onkeydown = e => { if (e.key==='Enter') checkPasscode(); };
}

function showLeaderForm() {
  document.getElementById('gate-lanes').style.display = 'none';
  const lf = document.getElementById('gate-leader-form');
  lf.style.display = 'flex';
  document.getElementById('gate-leader-email').focus();
  document.getElementById('gate-leader-password').onkeydown = e => { if (e.key==='Enter') doGateLeaderLogin(); };
}

async function checkPasscode() {
  const val = document.getElementById('gate-input').value;
  const btn = document.getElementById('gate-btn');
  const err = document.getElementById('gate-error');
  btn.disabled=true; err.textContent='';
  try {
    const res = await fetch('/api/auth/passcode', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({passcode:val}),
    });
    const data = await res.json();
    if (data.ok) {
      currentUser = null; canEdit = false; // will be set by refreshCurrentUser in initApp
      initApp();
      showToast(data.message || 'View-only access enabled', 'ok');
    } else {
      err.textContent = 'Wrong passcode. Try again.';
      document.getElementById('gate-input').value = '';
      document.getElementById('gate-input').focus();
    }
  } catch(_) { err.textContent = 'Network error. Please try again.'; }
  btn.disabled=false;
}

async function doGateLeaderLogin() {
  const email = (document.getElementById('gate-leader-email')||{}).value?.trim()||'';
  const password = (document.getElementById('gate-leader-password')||{}).value||'';
  const btn = document.getElementById('gate-leader-btn');
  const err = document.getElementById('gate-leader-error');
  if (!email||!password) { err.textContent='Please fill in all fields.'; return; }
  btn.disabled=true; btn.textContent='Signing in…'; err.textContent='';
  try {
    const res = await fetch('/api/auth/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({email,password}),
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user; canEdit = ['approved','admin','leader'].includes(currentUser.role);
      initApp();
      showToast('Welcome back, '+currentUser.name+'!', 'ok');
    } else {
      err.textContent = data.error || 'Login failed.';
    }
  } catch(_) { err.textContent = 'Network error. Please try again.'; }
  btn.disabled=false; btn.textContent='Sign In →';
}

function showNeedAccess() {
  showToast('Contact your team admin or leader to request access.');
}

// ── INIT ─────────────────────────────────────────────────────
async function initApp() {
  showScreen('app');
  await refreshCurrentUser();
  await loadRoster();
}

async function refreshCurrentUser() {
  try {
    const res = await fetch('/api/me');
    const data = await res.json();
    currentUser = data.user;
    canEdit = currentUser && ['approved','admin','leader'].includes(currentUser.role);
  } catch(e) { currentUser=null; canEdit=false; }
  updateNav();
}

function updateNav() {
  const buildRight = () => {
    if (!currentUser) {
      return '<button class="nav-btn" onclick="openAuthModal(\\'signup\\')">Sign Up</button>' +
             '<button class="nav-btn primary" onclick="openAuthModal(\\'login\\')">Log In</button>';
    }
    const adminBtn = currentUser.role==='admin'
      ? '<button class="nav-btn" onclick="loadAdminPanel()">Admin</button>' : '';
    return adminBtn + '<button class="nav-avatar" onclick="openProfileModal()" title="'+currentUser.name+'">'+initials(currentUser.name)+'</button>';
  };
  ['nav-right','student-nav-right'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = buildRight();
  });
  const rb = document.getElementById('readonly-banner');
  if (rb) {
    if (!currentUser) {
      rb.style.display='flex';
      rb.querySelector('p').innerHTML='You\\'re viewing in <strong>read-only mode</strong>. Log in to edit.';
      rb.querySelector('button').style.display=''; rb.querySelector('button').textContent='Log In';
      rb.querySelector('button').onclick=()=>openAuthModal('login');
    } else if (currentUser.role==='viewer') {
      rb.style.display='flex';
      let msg = 'View-only mode.';
      if (currentUser.expiresAt) {
        const t = new Date(currentUser.expiresAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true});
        msg = 'View-only · Session expires at '+t+'.';
      }
      rb.querySelector('p').innerHTML=msg;
      rb.querySelector('button').style.display=''; rb.querySelector('button').textContent='Leader Login';
      rb.querySelector('button').onclick=()=>openAuthModal('login');
    } else if (currentUser.role==='pending') {
      rb.style.display='flex';
      rb.querySelector('p').innerHTML='<strong>Account pending.</strong> You\\'ll get an email when approved.';
      rb.querySelector('button').style.display='none';
    } else {
      rb.style.display='none';
    }
  }
  document.querySelectorAll('.edit-gated').forEach(el => {
    el.style.display = canEdit ? '' : 'none';
  });
}

// ── ROSTER ───────────────────────────────────────────────────
async function loadRoster() {
  try {
    const res = await fetch('/api/sheet/read');
    const data = await res.json();
    if (data?.hs) DATA = data;
  } catch(e) {}
  renderAll();
}

function renderAll() {
  ['hs','ms'].forEach(sk => {
    renderStats(sk);
    renderGrid(DATA[sk].core,  sk+'-core-grid',  sk,'core');
    renderGrid(DATA[sk].loose, sk+'-loose-grid', sk,'loose');
    renderGrid(DATA[sk].fringe,sk+'-fringe-grid',sk,'fringe');
  });
  document.querySelectorAll('.edit-gated').forEach(el => {
    el.style.display=canEdit?'':'none';
  });
}

function renderStats(sk) {
  const el = document.getElementById(sk+'-stats');
  if (!el) return;
  const d = DATA[sk];
  const c=(d.core||[]).length, l=(d.loose||[]).length, f=(d.fringe||[]).length;
  const conn = [...(d.core||[]),...(d.loose||[])].filter(p=>p.connected).length;
  el.innerHTML =
    stat(c,'Core') + stat(l,'Loosely Connected') + stat(f,'Fringe') + stat(c+l+f,'Total') +
    (sk==='hs' ? stat(conn,'Connected') : '');
}
function stat(n,label) {
  return '<div class="stat"><div class="stat-val">'+n+'</div><div class="stat-label">'+label+'</div></div>';
}

function renderGrid(data, id, sk, section) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML='';
  if (!(data||[]).length) {
    el.innerHTML='<div class="empty"><div class="empty-icon">👥</div><p>No students here yet</p></div>';
    return;
  }
  (data||[]).forEach((p,i) => el.appendChild(makeCard(p,i,sk,section)));
}

function makeCard(person, idx, sk, section) {
  const card = document.createElement('div');
  card.className='card';
  const g = GRADIENTS[idx % GRADIENTS.length];
  const thumb = driveThumb(person.photoUrl);
  const age = calcAge(person.birthday);

  const meta = [
    person.school   ? '🏫 '+person.school : '',
    person.birthday ? '🎂 '+formatDate(person.birthday)+(age?' · '+age+'yo':'') : '',
    person.interest ? '⚡ '+person.interest : '',
  ].filter(Boolean).map(t => '<div class="meta-item"><span>'+t+'</span></div>').join('');

  const connBadge = sk==='hs'
    ? '<span class="badge-status '+(person.connected?'connected':'not-connected')+'">'+(person.connected?'● Connected':'○ Not Connected')+'</span>' : '';

  const goals = person.goals||[];
  const done = goals.filter(g=>g.done).length;
  const goalHtml = goals.length
    ? '<div class="goal-bar-wrap"><div class="goal-bar-label"><span>Goals</span><span>'+done+'/'+goals.length+'</span></div><div class="goal-bar-track"><div class="goal-bar-fill" style="width:'+(goals.length?Math.round(done/goals.length*100):0)+'%"></div></div></div>'
    : (person.primaryGoal ? '<div class="goal-primary">🎯 '+person.primaryGoal.slice(0,40)+'</div>' : '');

  const editBtn = canEdit
    ? '<button class="card-edit-btn" onclick="event.stopPropagation();openEditModal(\\''+sk+'\\',\\''+section+'\\','+idx+')" title="Edit">✏️</button>'
    : '';

  card.innerHTML = editBtn +
    '<div class="card-avatar"><div class="av-fallback" style="background:'+g+'">'+initials(person.name)+'</div>'+
    (thumb ? '<img src="'+thumb+'" alt="" loading="lazy" onload="this.classList.add(\\'loaded\\')" onerror="this.style.display=\\'none\\'">' : '')+
    '</div><div class="card-name-row"><div class="card-name">'+person.name+'</div>'+
    (person.grade ? '<span class="badge-grade">Gr.'+person.grade+'</span>' : '')+'</div>'+
    (meta ? '<div class="card-meta">'+meta+'</div>' : '')+
    connBadge + goalHtml;

  card.addEventListener('click', () => openStudentDetail(sk, section, idx));
  return card;
}

// ── SEARCH ───────────────────────────────────────────────────
function filterRoster(q) {
  q = q.toLowerCase().trim();
  ['hs','ms'].forEach(sk => {
    ['core','loose','fringe'].forEach(sec => {
      const el = document.getElementById(sk+'-'+sec+'-grid');
      if (!el) return;
      el.querySelectorAll('.card').forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = (!q || text.includes(q)) ? '' : 'none';
      });
    });
  });
}

// ── HS/MS TAB ────────────────────────────────────────────────
function switchTab(sk, btn) {
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('tab-'+sk).classList.add('active');
  document.querySelectorAll('.seg-btn').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

// ── AUTH MODAL ───────────────────────────────────────────────
function openAuthModal(tab='login') { switchAuthTab(tab); openModal('auth-modal'); }
function closeAuthModal() { closeModal('auth-modal'); }
function switchAuthTab(tab) {
  document.getElementById('auth-login-form').style.display  = tab==='login'  ? 'flex' : 'none';
  document.getElementById('auth-signup-form').style.display = tab==='signup' ? 'flex' : 'none';
  document.getElementById('tab-login-btn').classList.toggle('active', tab==='login');
  document.getElementById('tab-signup-btn').classList.toggle('active', tab==='signup');
  document.getElementById('auth-modal-title').textContent = tab==='login' ? 'Welcome Back' : 'Join the Team';
  ['login-msg','signup-msg'].forEach(id => { document.getElementById(id).textContent=''; });
}

async function doLogin() {
  const email = v('login-email'), password = v('login-password');
  const msg = document.getElementById('login-msg');
  const btn = document.getElementById('login-submit');
  if (!email||!password) { setMsg(msg,'Please fill in all fields.','error'); return; }
  btn.disabled=true; btn.textContent='Logging in…'; msg.textContent='';
  const res = await fetch('/api/auth/login', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({email,password}),
  });
  const data = await res.json();
  btn.disabled=false; btn.textContent='Log In';
  if (data.success) {
    currentUser=data.user; canEdit=['approved','admin','leader'].includes(currentUser.role);
    closeAuthModal(); updateNav(); renderAll();
    showToast('✓ Welcome back, '+currentUser.name+'!','ok');
  } else setMsg(msg, data.error||'Login failed.','error');
}

async function doSignup() {
  const name=v('signup-name'), email=v('signup-email'), password=v('signup-password');
  const msg=document.getElementById('signup-msg'), btn=document.getElementById('signup-submit');
  if (!name||!email||!password) { setMsg(msg,'Please fill in all fields.','error'); return; }
  btn.disabled=true; btn.textContent='Creating…'; msg.textContent='';
  const res = await fetch('/api/auth/signup', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({name,email,password}),
  });
  const data = await res.json();
  btn.disabled=false; btn.textContent='Create Account';
  if (data.success) {
    setMsg(msg,'✓ '+data.message,'success');
    ['signup-name','signup-email','signup-password'].forEach(id=>{ document.getElementById(id).value=''; });
  } else setMsg(msg,data.error||'Signup failed.','error');
}

async function logout() {
  await fetch('/api/auth/logout',{method:'POST'});
  currentUser=null; canEdit=false;
  showScreen('gate'); showLanes();
  showToast('Logged out');
}

// ── PROFILE MODAL ─────────────────────────────────────────────
function openProfileModal() {
  if (!currentUser) { openAuthModal('login'); return; }
  document.getElementById('profile-av-initials').textContent = initials(currentUser.name);
  document.getElementById('profile-display-name').textContent = currentUser.name;
  document.getElementById('profile-display-email').textContent = currentUser.email;
  sv('profile-name-input', currentUser.name||'');
  sv('profile-since-input', currentUser.leaderSince||'');
  sv('profile-funfact-input', currentUser.funFact||'');
  const img=document.getElementById('profile-av-img');
  const thumb=driveThumb(currentUser.photoUrl);
  if(thumb){img.src=thumb;img.style.display='';img.classList.remove('loaded');}
  else img.style.display='none';
  openModal('profile-modal');
}
function closeProfileModal() { closeModal('profile-modal'); }

async function saveProfile() {
  if (!currentUser) return;
  const name=v('profile-name-input'), leaderSince=v('profile-since-input'), funFact=v('profile-funfact-input');
  const res=await fetch('/api/profile/update',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name,leaderSince,funFact}),
  });
  const data=await res.json();
  if (data.success) {
    Object.assign(currentUser,{name,leaderSince,funFact});
    updateNav(); closeProfileModal(); showToast('✓ Profile updated','ok');
  } else showToast(data.error||'Update failed','error');
}

async function uploadProfilePhoto(input) {
  if (!input.files.length) return;
  showToast('Uploading…');
  const fd=new FormData(); fd.append('file',input.files[0]); fd.append('type','leader');
  const res=await fetch('/api/upload-photo',{method:'POST',body:fd});
  const data=await res.json();
  if (data.url) {
    await fetch('/api/profile/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({photoUrl:data.url})});
    currentUser.photoUrl=data.url;
    const thumb=driveThumb(data.url);
    if(thumb){const img=document.getElementById('profile-av-img');img.src=thumb;img.style.display='';img.onload=()=>img.classList.add('loaded');}
    updateNav(); showToast('✓ Photo updated','ok');
  } else showToast(data.error||'Upload failed','error');
}

// ── EDIT STUDENT MODAL ────────────────────────────────────────
function openEditModal(sk, section, index) {
  if (!canEdit) return;
  const p = DATA[sk][section][index];
  editState={mode:'edit',sk,section,index};
  document.getElementById('edit-modal-title').textContent='Edit Student';
  document.getElementById('edit-modal-sub').textContent=(sk==='hs'?'High School':'Middle School')+' · '+{core:'Core',loose:'Loosely Connected',fringe:'Fringe'}[section];
  sv('ef-name',p.name||''); sv('ef-grade',p.grade||''); sv('ef-school',p.school||'');
  sv('ef-birthday',p.birthday||''); sv('ef-interest',p.interest||''); sv('ef-notes',p.notes||'');
  sv('ef-photoUrl',p.photoUrl||''); sv('ef-primary-goal',p.primaryGoal||'');
  setConnected(p.connected||false);
  updateEditPhotoPreview();
  document.getElementById('ef-connected-field').style.display=sk==='hs'?'block':'none';
  document.getElementById('ef-delete-btn').style.display='inline-block';
  document.getElementById('ef-save-btn').textContent='Save Changes';
  openModal('edit-modal');
}

function openAddModal(sk, section) {
  if (!canEdit) return;
  editState={mode:'add',sk,section,index:-1};
  document.getElementById('edit-modal-title').textContent='Add Student';
  document.getElementById('edit-modal-sub').textContent=(sk==='hs'?'High School':'Middle School')+' · '+{core:'Core',loose:'Loosely Connected',fringe:'Fringe'}[section];
  ['ef-name','ef-grade','ef-school','ef-birthday','ef-interest','ef-notes','ef-photoUrl','ef-primary-goal'].forEach(id=>sv(id,''));
  setConnected(false); updateEditPhotoPreview();
  document.getElementById('ef-connected-field').style.display=sk==='hs'?'block':'none';
  document.getElementById('ef-delete-btn').style.display='none';
  document.getElementById('ef-save-btn').textContent='Add Student';
  openModal('edit-modal');
  document.getElementById('ef-name').focus();
}

function closeEditModal() { closeModal('edit-modal'); }
function setConnected(val) {
  connectedVal=val;
  const el=document.getElementById('ef-connected-toggle');
  el.classList.toggle('on',val);
  el.querySelector('.toggle-label').textContent=val?'Connected':'Not Connected';
}
function toggleConnected() { setConnected(!connectedVal); }
function updateEditPhotoPreview() {
  const url=v('ef-photoUrl'), name=v('ef-name')||'?';
  document.getElementById('edit-pv-fallback').textContent=initials(name);
  const img=document.getElementById('edit-pv-img');
  const thumb=driveThumb(url);
  if(thumb){img.style.display='';img.classList.remove('loaded');img.src=thumb;}
  else img.style.display='none';
}

async function uploadStudentPhoto(input) {
  if (!input.files.length) return;
  showToast('Uploading…');
  const fd=new FormData(); fd.append('file',input.files[0]); fd.append('type','student');
  const res=await fetch('/api/upload-photo',{method:'POST',body:fd});
  const data=await res.json();
  if (data.url) { sv('ef-photoUrl',data.url); updateEditPhotoPreview(); showToast('✓ Uploaded','ok'); }
  else showToast(data.error||'Upload failed','error');
}

async function saveEdit() {
  const name=v('ef-name');
  if (!name) { showToast('Name is required','error'); return; }
  const btn=document.getElementById('ef-save-btn');
  btn.disabled=true; btn.textContent='Saving…';
  const fields={
    name, grade:v('ef-grade'), school:v('ef-school'), birthday:v('ef-birthday'),
    interest:v('ef-interest'), notes:v('ef-notes'), photoUrl:v('ef-photoUrl'),
    primaryGoal:v('ef-primary-goal'), connected:connectedVal,
  };
  const {mode,sk,section,index}=editState;
  if (mode==='edit') {
    Object.assign(DATA[sk][section][index], fields);
    const params=new URLSearchParams({action:'update',payload:JSON.stringify({sheet:sk,rowIndex:DATA[sk][section][index].rowIndex,fields})});
    const res=await fetch('/api/sheet/write?'+params);
    const data=await res.json();
    showToast(data.error ? 'Saved locally' : '✓ Saved', data.error?'error':'ok');
  } else {
    DATA[sk][section].push({...fields});
    const params=new URLSearchParams({action:'add',payload:JSON.stringify({sheet:sk,section,person:fields})});
    const res=await fetch('/api/sheet/write?'+params);
    const data=await res.json();
    if (data.newRowIndex!==undefined) DATA[sk][section][DATA[sk][section].length-1].rowIndex=data.newRowIndex;
    showToast(data.error?'Added locally':'✓ Student added',data.error?'error':'ok');
  }
  renderAll(); closeEditModal(); btn.disabled=false;
}

async function confirmDelete() {
  const {sk,section,index}=editState;
  const name=DATA[sk][section][index].name;
  if (!confirm('Remove '+name+' from the roster?')) return;
  const person=DATA[sk][section].splice(index,1)[0];
  const params=new URLSearchParams({action:'delete',payload:JSON.stringify({sheet:sk,rowIndex:person.rowIndex})});
  await fetch('/api/sheet/write?'+params);
  renderAll(); closeEditModal(); showToast('Removed '+name,'ok');
}

// ── STUDENT DETAIL ────────────────────────────────────────────
async function openStudentDetail(sk, section, index) {
  currentStudentKey={sk,section,index};
  showScreen('student');
  await renderStudentDetail(sk,section,index);
}

function goBack() { showScreen('app'); }

async function renderStudentDetail(sk, section, index) {
  const person=DATA[sk][section][index];
  const el=document.getElementById('student-content');
  const g=GRADIENTS[index%GRADIENTS.length];
  const thumb=driveThumb(person.photoUrl);
  const age=calcAge(person.birthday);

  const chips=[
    person.grade   ? '📚 Grade '+person.grade : '',
    person.school  ? '🏫 '+person.school : '',
    person.birthday? '🎂 '+formatDate(person.birthday)+(age?' · '+age+'yo':'') : '',
    person.interest? '⚡ '+person.interest : '',
    sk==='hs' ? (person.connected?'✅ Connected':'○ Not Connected') : '',
  ].filter(Boolean).map(c=>'<div class="chip">'+c+'</div>').join('');

  const editBtn = canEdit
    ? '<button class="nav-btn primary edit-gated" onclick="openEditModal(\\''+sk+'\\',\\''+section+'\\','+index+')">Edit</button>'
    : '';
  const logBtn = canEdit
    ? '<button class="nav-btn" onclick="openInteractionModal(\\''+sk+'\\',\\''+section+'\\','+index+',\\''+person.name+'\\')">+ Log Hangout</button>'
    : '';

  el.innerHTML =
    '<div class="student-hero">'+
      '<div class="student-avatar-lg"><div class="av-fallback" style="background:'+g+'">'+initials(person.name)+'</div>'+
      (thumb?'<img src="'+thumb+'" alt="" onload="this.classList.add(\\'loaded\\')" onerror="this.style.display=\\'none\\'">':'')+
      '</div>'+
      '<div class="student-info">'+
        '<div class="student-name">'+person.name+'</div>'+
        '<div class="student-chips">'+chips+'</div>'+
        '<div class="student-actions">'+editBtn+logBtn+'</div>'+
      '</div>'+
    '</div>'+
    '<div class="student-grid">'+
      '<div class="panel" id="goals-panel">'+
        '<div class="panel-title">🎯 Goals <span id="goal-count"></span></div>'+
        '<div id="goals-list"><div class="loader"><div class="loader-ring"></div></div></div>'+
        (canEdit?'<div class="add-goal-row"><input class="add-goal-input" id="new-goal-input" placeholder="Add a new goal…"><button class="add-goal-btn" onclick="addGoal()">+</button></div>':'')+
        (person.primaryGoal?'<div style="margin-top:12px;padding:9px 11px;background:var(--accent-glow);border:1px solid var(--accent-border);border-radius:8px;font-size:12px;color:var(--accent)">⭐ Primary: '+person.primaryGoal+'</div>':'')+
      '</div>'+
      '<div class="panel">'+
        '<div class="panel-title">📝 Notes</div>'+
        '<div style="font-size:13px;color:var(--text2);line-height:1.6">'+(person.notes||'<span style="color:var(--muted)">No notes yet.</span>')+'</div>'+
      '</div>'+
      '<div class="panel full">'+
        '<div class="panel-title">🤝 Hangout Log <span id="int-count"></span></div>'+
        '<div id="interactions-list"><div class="loader"><div class="loader-ring"></div></div></div>'+
      '</div>'+
    '</div>';

  // Load goals
  const goals=person.goals||[];
  renderGoalsList(goals,sk,section,index);

  // Load interactions
  try {
    const res=await fetch('/api/student/interactions?sk='+sk+'&section='+section+'&index='+index);
    const d=await res.json();
    renderInteractionsList(d.interactions||[]);
  } catch(e) { document.getElementById('interactions-list').innerHTML='<div class="empty"><p>Could not load.</p></div>'; }
}

function renderGoalsList(goals,sk,section,index) {
  const el=document.getElementById('goals-list');
  if (!el) return;
  const gc=document.getElementById('goal-count');
  if (gc) gc.textContent=goals.length ? goals.filter(g=>g.done).length+'/'+goals.length+' done' : '';
  if (!goals.length) { el.innerHTML='<div class="empty"><p>No goals yet.</p></div>'; return; }
  el.innerHTML=goals.map((g,gi)=>
    '<div class="goal-item">'+
      '<div class="goal-check '+(g.done?'done':'')+'" onclick="toggleGoal('+gi+')" title="Toggle"></div>'+
      '<div class="goal-text '+(g.done?'done':'')+'">'+g.text+'</div>'+
      (g.primary?'<span class="primary-tag">Primary</span>':'')+
      (canEdit?'<button class="goal-del" onclick="deleteGoal('+gi+')" title="Remove">✕</button>':'')+
    '</div>'
  ).join('');
}

function renderInteractionsList(interactions) {
  const el=document.getElementById('interactions-list');
  if (!el) return;
  const ic=document.getElementById('int-count');
  if (ic) ic.textContent=interactions.length ? interactions.length+' logged' : '';
  if (!interactions.length) { el.innerHTML='<div class="empty"><p>No hangouts logged yet.</p></div>'; return; }
  el.innerHTML=[...interactions].reverse().map(int=>
    '<div class="int-item">'+
      '<div class="int-header">'+
        '<div class="int-av">'+initials(int.leader)+'</div>'+
        '<div><div class="int-who">'+int.leader+'</div><div class="int-when">'+formatDate(int.date)+' · '+timeAgo(int.createdAt)+'</div></div>'+
      '</div>'+
      '<div class="int-body">'+int.summary+'</div>'+
    '</div>'
  ).join('');
}

// ── GOALS CRUD ────────────────────────────────────────────────
async function addGoal() {
  const input=document.getElementById('new-goal-input');
  const text=input.value.trim();
  if (!text||!currentStudentKey) return;
  const {sk,section,index}=currentStudentKey;
  const person=DATA[sk][section][index];
  if (!person.goals) person.goals=[];
  person.goals.push({text,done:false,primary:person.goals.length===0,createdAt:new Date().toISOString()});
  input.value='';
  await syncGoals(sk,section,index);
  renderGoalsList(person.goals,sk,section,index);
  renderAll();
  showToast('✓ Goal added','ok');
}
async function toggleGoal(gi) {
  if (!canEdit||!currentStudentKey) return;
  const {sk,section,index}=currentStudentKey;
  DATA[sk][section][index].goals[gi].done=!DATA[sk][section][index].goals[gi].done;
  await syncGoals(sk,section,index);
  renderGoalsList(DATA[sk][section][index].goals,sk,section,index);
  renderAll();
}
async function deleteGoal(gi) {
  if (!canEdit||!currentStudentKey) return;
  const {sk,section,index}=currentStudentKey;
  DATA[sk][section][index].goals.splice(gi,1);
  await syncGoals(sk,section,index);
  renderGoalsList(DATA[sk][section][index].goals,sk,section,index);
  showToast('Goal removed');
}
async function syncGoals(sk,section,index) {
  const person=DATA[sk][section][index];
  const params=new URLSearchParams({action:'update',payload:JSON.stringify({sheet:sk,rowIndex:person.rowIndex,fields:{goals:JSON.stringify(person.goals)}})});
  await fetch('/api/sheet/write?'+params);
}

// ── INTERACTION MODAL ─────────────────────────────────────────
function openInteractionModal(sk,section,index,studentName) {
  interactionKey={sk,section,index,studentName};
  document.getElementById('int-modal-sub').textContent='with '+studentName;
  sv('int-leader',currentUser?currentUser.name:'');
  sv('int-date',new Date().toISOString().slice(0,10));
  sv('int-summary','');
  openModal('interaction-modal');
}
function closeInteractionModal() { closeModal('interaction-modal'); }

async function saveInteraction() {
  const leader=v('int-leader'), date=v('int-date'), summary=v('int-summary');
  if (!leader||!summary) { showToast('Leader name and summary required','error'); return; }
  const {sk,section,index,studentName}=interactionKey;
  const person=DATA[sk][section][index];
  const interaction={leader,date,summary,createdAt:new Date().toISOString(),leaderEmail:currentUser?currentUser.email:''};
  const res=await fetch('/api/student/interactions',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({sk,section,index,rowIndex:person.rowIndex,studentName,interaction}),
  });
  const data=await res.json();
  if (data.success) {
    closeInteractionModal();
    showToast('✓ Hangout logged!','ok');
    if (currentStudentKey) renderStudentDetail(currentStudentKey.sk,currentStudentKey.section,currentStudentKey.index);
  } else showToast(data.error||'Failed','error');
}

// ── ACTIVITY FEED ─────────────────────────────────────────────
async function loadActivityFeed() {
  const el=document.getElementById('activity-feed');
  el.innerHTML='<div class="loader"><div class="loader-ring"></div></div>';
  try {
    const res=await fetch('/api/activity/recent');
    const data=await res.json();
    const items=data.items||[];
    if (!items.length) { el.innerHTML='<div class="empty"><div class="empty-icon">🌱</div><p>No activity yet. Log some hangouts!</p></div>'; return; }
    el.innerHTML=items.map(item=>{
      const student=findStudent(item.studentName);
      const sThumb=student?driveThumb(student.photoUrl):null;
      const sg=GRADIENTS[0], lg=GRADIENTS[2];
      return '<div class="act-card" onclick="navigateToStudent(\\''+item.studentName+'\\')">'+
        '<div class="act-header">'+
          '<div class="act-avatars">'+
            '<div class="act-av"><div class="av-fallback" style="background:'+sg+'">'+initials(item.studentName)+'</div>'+
            (sThumb?'<img src="'+sThumb+'" onload="this.classList.add(\\'loaded\\')" onerror="this.style.display=\\'none\\'">':'')+
            '</div>'+
            '<div class="act-av"><div class="av-fallback" style="background:'+lg+'">'+initials(item.leader)+'</div></div>'+
          '</div>'+
          '<div class="act-info">'+
            '<div class="act-names"><span>'+item.studentName+'</span> × '+item.leader+'</div>'+
            '<div class="act-time">'+formatDate(item.date)+' · '+timeAgo(item.createdAt)+'</div>'+
          '</div>'+
        '</div>'+
        '<div class="act-summary">'+item.summary.slice(0,200)+(item.summary.length>200?'…':'')+'</div>'+
      '</div>';
    }).join('');
  } catch(e) { el.innerHTML='<div class="empty"><p>Could not load activity.</p></div>'; }
}

function findStudent(name) {
  for (const sk of ['hs','ms']) for (const sec of ['core','loose','fringe']) {
    const s=(DATA[sk][sec]||[]).find(p=>p.name===name);
    if (s) return s;
  }
  return null;
}
function findStudentKey(name) {
  for (const sk of ['hs','ms']) for (const sec of ['core','loose','fringe']) {
    const idx=(DATA[sk][sec]||[]).findIndex(p=>p.name===name);
    if (idx>=0) return {sk,section:sec,index:idx};
  }
  return null;
}
function navigateToStudent(name) {
  const k=findStudentKey(name);
  if (k) openStudentDetail(k.sk,k.section,k.index);
}

// ── BRAIN DUMP ────────────────────────────────────────────────
async function processBrainDump() {
  const text=document.getElementById('dump-text').value.trim();
  if (!text) { showToast('Write something first!','error'); return; }
  const btn=document.getElementById('dump-btn');
  btn.disabled=true; btn.textContent='✨ Processing…';
  const roster=getAllStudentNames();
  const res=await fetch('/api/brain-dump',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,roster})});
  const data=await res.json();
  btn.disabled=false; btn.textContent='✨ Process & Assign';
  const el=document.getElementById('dump-result');
  if (!data.parsed||!data.parsed.length) {
    el.innerHTML='<div class="dump-result"><p style="color:var(--muted)">Couldn\\'t match any students. Try being more specific!</p></div>';
    return;
  }
  window._dumpParsed=data.parsed;
  el.innerHTML='<div class="dump-result"><div class="dump-result-title">✓ Found '+data.parsed.length+' mention'+
    (data.parsed.length!==1?'s':'')+
    '</div>'+
    data.parsed.map((p,i)=>
      '<div class="dump-match">'+
        '<div class="dump-match-name">'+p.name+' <span style="font-size:11px;color:'+(p.matched?'var(--connected)':'var(--warning)')+'">'+(p.matched?'✓ in roster':'⚠ not found')+'</span></div>'+
        '<div class="dump-match-sum">'+p.summary.slice(0,300)+'</div>'+
        (p.matched&&canEdit?'<div class="dump-match-actions"><button class="add-btn" onclick="applyDump('+i+')">Log as Hangout</button></div>':'')+
      '</div>'
    ).join('')+
  '</div>';
}
function getAllStudentNames() {
  const names=[];
  for (const sk of ['hs','ms']) for (const sec of ['core','loose','fringe']) (DATA[sk][sec]||[]).forEach(p=>names.push(p.name));
  return names;
}
async function applyDump(i) {
  const p=window._dumpParsed[i];
  const k=findStudentKey(p.name);
  if (!k) { showToast('Student not found','error'); return; }
  const person=DATA[k.sk][k.section][k.index];
  const interaction={leader:currentUser?currentUser.name:'Unknown',date:new Date().toISOString().slice(0,10),summary:p.summary,createdAt:new Date().toISOString(),leaderEmail:currentUser?currentUser.email:''};
  const res=await fetch('/api/student/interactions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sk:k.sk,section:k.section,index:k.index,rowIndex:person.rowIndex,studentName:p.name,interaction})});
  const data=await res.json();
  if (data.success) showToast('✓ Logged for '+p.name,'ok');
  else showToast('Failed: '+(data.error||''),'error');
}

// ── ADMIN ─────────────────────────────────────────────────────
async function loadAdminPanel() {
  showScreen('admin');
  await Promise.all([loadAdminOverview(),loadAdminUsers(),loadAdminMetrics()]);
}
function switchAdminTab(name,btn) {
  document.querySelectorAll('.admin-sec').forEach(s=>s.classList.remove('active'));
  document.getElementById('admin-'+name).classList.add('active');
  document.querySelectorAll('.admin-tab').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
}
async function loadAdminOverview() {
  const total=['hs','ms'].reduce((a,sk)=>a+(DATA[sk].core||[]).length+(DATA[sk].loose||[]).length+(DATA[sk].fringe||[]).length,0);
  const conn=['hs','ms'].reduce((a,sk)=>a+[...(DATA[sk].core||[]),...(DATA[sk].loose||[])].filter(p=>p.connected).length,0);
  let ints=0;
  try{const r=await fetch('/api/activity/stats');const d=await r.json();ints=d.totalInteractions||0;}catch(e){}
  document.getElementById('admin-stats-grid').innerHTML=
    kpi(total,'Total Students')+kpi(conn,'Connected HS')+kpi(ints,'Hangouts Logged')+
    kpi((DATA.hs.core||[]).length,'HS Core')+kpi((DATA.ms.core||[]).length,'MS Core');
}
function kpi(n,label) { return '<div class="kpi"><div class="kpi-val">'+n+'</div><div class="kpi-label">'+label+'</div></div>'; }
async function loadAdminUsers() {
  const res=await fetch('/api/admin/users');
  const data=await res.json();
  const users=data.users||[];
  const el=document.getElementById('admin-users-table');
  if (!users.length) { el.innerHTML='<div class="empty"><p>No users.</p></div>'; return; }
  el.innerHTML='<table class="user-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead><tbody>'+
    users.map(u=>'<tr><td>'+u.name+'</td><td style="color:var(--muted)">'+u.email+'</td><td><span class="role-badge '+u.role+'">'+u.role+'</span></td>'+
      '<td style="color:var(--muted);font-family:\\'JetBrains Mono\\',monospace;font-size:11px">'+(u.createdAt?new Date(u.createdAt).toLocaleDateString():'—')+'</td>'+
      '<td><div class="btn-row">'+
        (u.role==='pending'  ?'<button class="role-btn approve" onclick="updateUser(\\''+u.email+'\\',\\'approved\\')">Approve</button>':'')+
        (u.role==='approved' ?'<button class="role-btn mk-leader" onclick="updateUser(\\''+u.email+'\\',\\'leader\\')">→ Leader</button>':'')+
        (u.role==='leader'   ?'<button class="role-btn revoke" onclick="updateUser(\\''+u.email+'\\',\\'approved\\')">Remove Leader</button>':'')+
        (u.role!=='admin'    ?'<button class="role-btn mk-admin" onclick="updateUser(\\''+u.email+'\\',\\'admin\\')">→ Admin</button>':'')+
        (u.role!=='pending'  ?'<button class="role-btn revoke" onclick="updateUser(\\''+u.email+'\\',\\'pending\\')">Revoke</button>':'')+
      '</div></td></tr>'
    ).join('')+'</tbody></table>';
}
async function loadAdminMetrics() {
  const el=document.getElementById('admin-metrics-content');
  try {
    const r=await fetch('/api/activity/stats'); const d=await r.json();
    el.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:4px">'+
      '<div class="panel"><div class="panel-title">🏆 Most Active Leaders</div>'+
      (d.topLeaders||[]).map(l=>'<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px"><span>'+l.name+'</span><span style="color:var(--accent)">'+l.count+' hangouts</span></div>').join('')+
      (!(d.topLeaders||[]).length?'<p style="color:var(--muted);font-size:13px">No data yet</p>':'')+
      '</div>'+
      '<div class="panel"><div class="panel-title">❤️ Most Visited</div>'+
      (d.topStudents||[]).map(s=>'<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px"><span>'+s.name+'</span><span style="color:var(--accent)">'+s.count+' visits</span></div>').join('')+
      (!(d.topStudents||[]).length?'<p style="color:var(--muted);font-size:13px">No data yet</p>':'')+
      '</div></div>'+
      '<div class="panel" style="margin-top:16px"><div class="panel-title">📊 Overview</div>'+
      '<div class="stats" style="margin-top:12px">'+
        stat(d.totalInteractions||0,'Total Interactions')+stat(d.uniqueLeaders||0,'Active Leaders')+
        stat(d.uniqueStudents||0,'Students Visited')+stat(d.thisMonth||0,'This Month')+
      '</div></div>';
  } catch(e) { el.innerHTML='<div class="empty"><p>Could not load.</p></div>'; }
}
async function updateUser(email,role) {
  const res=await fetch('/api/admin/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,role})});
  const data=await res.json();
  if (data.success) { showToast('✓ Updated','ok'); loadAdminUsers(); }
  else showToast(data.error||'Failed','error');
}

// ── TOAST ─────────────────────────────────────────────────────
function showToast(msg, type='') {
  const el=document.getElementById('toast');
  el.textContent=msg;
  el.className='toast'+(type?' '+type:'');
  void el.offsetHeight;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),3000);
}

// ── MODAL HELPERS ─────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function v(id) { return (document.getElementById(id)||{}).value?.trim()||''; }
function sv(id,val) { const el=document.getElementById(id); if(el) el.value=val; }
function setMsg(el,msg,type) { el.textContent=msg; el.className='auth-msg '+(type||''); }

// ── BOOT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Wire up modal close-on-backdrop
  ['auth-modal','edit-modal','profile-modal','interaction-modal'].forEach(id => {
    const el=document.getElementById(id);
    if(el) el.addEventListener('click',e=>{if(e.target===el)closeModal(id);});
  });
  // Wire up ef-name input preview
  const efName=document.getElementById('ef-name');
  if(efName) efName.addEventListener('input',updateEditPhotoPreview);

  initGate();
});
`;
