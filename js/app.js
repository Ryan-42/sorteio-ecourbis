/* ============================================================
   SORTEIO COPA · ECOURBIS  —  app.js
   Vanilla JS. Sem framework. Estado persistido em localStorage.
   Sorteio com crypto.getRandomValues (auditável).
   ============================================================ */
(() => {
'use strict';

const $  = (s, e = document) => e.querySelector(s);
const $$ = (s, e = document) => [...e.querySelectorAll(s)];
const CHAVE      = 'ecourbis_sorteio_v2';
const CHAVE_HIST = 'ecourbis_historico_v1';
const CHAVE_V1_LEGADA = 'ecourbis_sorteio_v1';   // schema antigo (tipo bola/camisa/moto) — não migrado automaticamente

/* ---------- Estado ---------- */
let dadosCorruptos = false;
let estado = carregar() || { participantes:[], brindes:[], ganhadores:[] };
let ganhadorPendente = null;   // {participante, brinde} — sorteio individual
let lotePendente     = null;   // {participantes, brinde} — sorteio em lote
let sorteando        = false;
let _toastTimer      = null;

/* ---------- Preferências de sessão ---------- */
let somAtivo          = true;
let velocidadeSorteio = 1.0;   // multiplicador de delay da animação
let _audioCtx         = null;

/* ícone genérico do brinde: prêmio final ganha o troféu, o resto ganha o presente */
function iconeBrinde(b){ return b && b.final ? '#ic-trofeu' : '#ic-presente'; }

/* ============================================================
   PERSISTÊNCIA
   ============================================================ */
function carregar(){
  try {
    const raw = localStorage.getItem(CHAVE);
    if (!raw) return null;
    const dados = JSON.parse(raw);
    if (!Array.isArray(dados?.participantes) || !Array.isArray(dados?.brindes) || !Array.isArray(dados?.ganhadores))
      throw new Error('estrutura inválida');
    return dados;
  } catch {
    dadosCorruptos = true;
    localStorage.removeItem(CHAVE);
    return null;
  }
}

function salvar(){
  localStorage.setItem(CHAVE, JSON.stringify(estado));
  const ind = document.getElementById('salvo-indicator');
  if (!ind) return;
  ind.textContent = '✓ Salvo';
  ind.classList.add('visivel');
  clearTimeout(ind._timer);
  ind._timer = setTimeout(() => ind.classList.remove('visivel'), 1800);
}

/* ============================================================
   TOAST
   ============================================================ */
function mostrarToast(msg, tipo = '', ms = 2800){
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast' + (tipo ? ' toast-' + tipo : '');
  t.hidden = false;
  requestAnimationFrame(() => t.classList.add('visivel'));
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    t.classList.remove('visivel');
    setTimeout(() => { t.hidden = true; }, 300);
  }, ms);
}

/* ============================================================
   ÁUDIO — Web Audio API (sem arquivo externo)
   ============================================================ */
function getAudioCtx(){
  if (!_audioCtx){
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { return null; }
  }
  return _audioCtx;
}

function tocarTick(){
  if (!somAtivo) return;
  const ctx = getAudioCtx(); if (!ctx) return;
  try {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 480 + inteiroSeguro(300);
    o.type = 'square';
    g.gain.setValueAtTime(0.07, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.055);
    o.start(); o.stop(ctx.currentTime + 0.055);
  } catch {}
}

/* toca ticks em intervalo fixo durante a animação da roleta — independe de DOM/nomes */
function tocarTicksDurante(duracaoMs){
  if (!somAtivo) return;
  const intervalo = 130;
  let elapsed = 0;
  const passo = () => {
    if (elapsed >= duracaoMs - intervalo * 0.5) return;
    tocarTick();
    elapsed += intervalo;
    setTimeout(passo, intervalo);
  };
  passo();
}

function tocarBeepContagem(n){
  if (!somAtivo) return;
  const ctx = getAudioCtx(); if (!ctx) return;
  try {
    const freq = [0, 880, 660, 440][n] ?? 440;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = freq; o.type = 'sine';
    g.gain.setValueAtTime(0.45, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    o.start(); o.stop(ctx.currentTime + 0.45);
  } catch {}
}

function tocarFanfarra(ehFinal){
  if (!somAtivo) return;
  const ctx = getAudioCtx(); if (!ctx) return;
  try {
    const seq = ehFinal
      ? [261.63, 329.63, 392, 523.25, 659.25, 784]
      : [392, 523.25, 659.25];
    const dt = ehFinal ? 0.13 : 0.11;
    seq.forEach((freq, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = freq;
      o.type = ehFinal ? 'sawtooth' : 'triangle';
      const t0 = ctx.currentTime + i * dt;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(ehFinal ? 0.32 : 0.22, t0 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.48);
      o.start(t0); o.stop(t0 + 0.5);
    });
  } catch {}
}

/* ============================================================
   HELPERS DE ESTADO
   ============================================================ */
function idsGanhadores(){ return new Set(estado.ganhadores.map(g => g.participante.id)); }
function elegiveis(){ const fora = idsGanhadores(); return estado.participantes.filter(p => !fora.has(p.id)); }

/* ============================================================
   RNG criptográfico — sorteio justo e defensável
   Custo é O(1) por sorteio (não depende do tamanho da lista),
   então funciona igual com 50 ou 50.000 participantes.
   ============================================================ */
function inteiroSeguro(max){
  if (max <= 0) return 0;
  const limite = Math.floor(0xFFFFFFFF / max) * max;
  const buf = new Uint32Array(1);
  let v;
  do { crypto.getRandomValues(buf); v = buf[0]; } while (v >= limite);
  return v % max;
}
function escolher(lista){ return lista[inteiroSeguro(lista.length)]; }

/* ============================================================
   NAVEGAÇÃO
   ============================================================ */
function irPara(tela){
  $$('.tela').forEach(t => t.classList.remove('ativa'));
  $('#tela-' + tela).classList.add('ativa');
  $$('.passo').forEach(p => p.classList.toggle('atual', p.dataset.tela === tela));
  if (tela === 'sorteio')    prepararSorteio();
  if (tela === 'ganhadores') renderGanhadores();
  window.scrollTo({ top:0, behavior:'smooth' });
}
$$('.passo').forEach(p => p.addEventListener('click', () => irPara(p.dataset.tela)));
$$('[data-ir]').forEach(b => b.addEventListener('click', () => irPara(b.dataset.ir)));

/* ============================================================
   TELA 1 · IMPORTAÇÃO DE PLANILHA
   ============================================================ */
const dropzone = $('#dropzone');
const inputArq = $('#arquivo');

dropzone.addEventListener('click', () => inputArq.click());
dropzone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputArq.click(); } });
['dragenter','dragover'].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.add('arrastando'); }));
['dragleave','drop'].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.remove('arrastando'); }));
dropzone.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) lerArquivo(f); });
inputArq.addEventListener('change', e => { const f = e.target.files[0]; if (f) lerArquivo(f); });

function acharColuna(chaves, alvos){
  const norm = s => s.toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
  for (const k of chaves){ const nk = norm(k); if (alvos.some(a => nk === a || nk.includes(a))) return k; }
  return null;
}

function lerArquivo(file){
  const status = $('#import-status');
  status.hidden = false; status.className = 'import-status'; status.textContent = 'Lendo ' + file.name + '…';

  if (file.size === 0) return mostrarErro('Arquivo vazio. Verifique se foi exportado corretamente.');

  const reader = new FileReader();
  reader.onerror = () => mostrarErro('Não foi possível ler o arquivo. Tente copiar para outra pasta.');
  reader.onload = e => {
    try {
      const wb = XLSX.read(e.target.result, { type:'array' });
      const aba = wb.Sheets[wb.SheetNames[0]];
      const linhas = XLSX.utils.sheet_to_json(aba, { defval:'' });
      if (!linhas.length) return mostrarErro('A planilha está vazia. Verifique se a aba correta contém dados.');

      const chaves = Object.keys(linhas[0]);
      const cNome = acharColuna(chaves, ['nome']);
      const cMat  = acharColuna(chaves, ['matricula','matrícula','registro','re']);
      const cFunc = acharColuna(chaves, ['funcao','função','cargo','setor']);

      if (!cNome){
        const cols = chaves.slice(0,6).map(c => `"${c}"`).join(', ');
        return mostrarErro(`Coluna "Nome" não encontrada. Detectadas: ${cols}. Confira o cabeçalho ou baixe o modelo.`);
      }

      const vistos = new Set();
      const part = [];
      let duplicados = 0;
      linhas.forEach((l, i) => {
        const nome = (l[cNome] ?? '').toString().trim();
        if (!nome) return;
        const mat  = cMat  ? (l[cMat]  ?? '').toString().trim() : '';
        const func = cFunc ? (l[cFunc] ?? '').toString().trim() : '';
        const id = (mat || nome + '#' + i).toLowerCase();
        if (vistos.has(id)){ duplicados++; return; }
        vistos.add(id);
        part.push({ id, nome, matricula:mat, funcao:func });
      });

      if (!part.length) return mostrarErro('Nenhum nome válido encontrado nas linhas abaixo do cabeçalho.');

      estado.participantes = part;
      estado.ganhadores = [];
      salvar();
      mostrarResumo();
      const aviso = duplicados > 0 ? ` (${duplicados} duplicado${duplicados>1?'s':''} ignorado${duplicados>1?'s':''})` : '';
      status.className = 'import-status ok';
      status.textContent = `✓ ${part.length} participantes carregados de ${file.name}${aviso}`;
    } catch (err){
      console.error(err);
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('password') || msg.includes('encrypt') || msg.includes('protected'))
        mostrarErro('Arquivo protegido por senha. Remova a proteção no Excel antes de importar.');
      else if (msg.includes('zip') || msg.includes('cfb') || msg.includes('signature'))
        mostrarErro('Arquivo corrompido. Salve novamente no Excel como .xlsx e tente de novo.');
      else
        mostrarErro('Arquivo inválido. Use .xlsx ou .csv exportado do Excel.');
    }
  };
  reader.readAsArrayBuffer(file);
}

function mostrarErro(msg){
  const s = $('#import-status'); s.hidden = false; s.className = 'import-status erro'; s.textContent = '✕ ' + msg;
  $('#import-resumo').hidden = true;
}

function mostrarResumo(){
  $('#qtd-part').textContent = estado.participantes.length;
  const tb = $('#preview tbody'); tb.innerHTML = '';
  estado.participantes.slice(0,5).forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${esc(p.nome)}</td><td>${esc(p.matricula||'—')}</td><td>${esc(p.funcao||'—')}</td>`;
    tb.appendChild(tr);
  });
  const resto = estado.participantes.length - 5;
  $('#preview-mais').textContent = resto > 0 ? `+ ${resto} outros participantes` : '';
  $('#import-resumo').hidden = false;
}

/* ============================================================
   TELA 2 · BRINDES (genérico — qualquer item, com flag de prêmio final)
   ============================================================ */
$('#add-brinde').addEventListener('click', () => {
  const campoNome = $('#brinde-nome');
  const nome = campoNome.value.trim();
  if (!nome){ mostrarToast('Digite o nome do brinde.', 'erro', 2200); campoNome.focus(); return; }
  const qtd   = Math.max(1, parseInt($('#brinde-qtd').value, 10) || 1);
  const final = $('#brinde-final')?.checked || false;
  estado.brindes.push({ id:'b' + Date.now(), nome, qtd, sorteados:0, final });
  salvar();
  campoNome.value = '';
  $('#brinde-qtd').value = 1;
  if ($('#brinde-final')) $('#brinde-final').checked = false;
  renderBrindes();
});

function renderBrindes(){
  const ul = $('#lista-brindes'); ul.innerHTML = '';
  estado.brindes.forEach(b => {
    const li = document.createElement('li');
    li.className = 'brinde-item' + (b.final ? ' final' : '');
    const restam = b.qtd - b.sorteados;
    li.innerHTML = `
      <span class="bi-icone"><svg><use href="${iconeBrinde(b)}"/></svg></span>
      <span class="bi-meio"><span class="bi-nome">${esc(b.nome)}</span>${b.final ? '<br><span class="bi-tipo">⭐ Prêmio final</span>' : ''}</span>
      <span class="bi-qtd">${restam}<small>de ${b.qtd}</small></span>
      <button class="bi-remover" aria-label="Remover ${esc(b.nome)}"><svg><use href="#ic-lixo"/></svg></button>`;
    li.querySelector('.bi-remover').addEventListener('click', () => {
      estado.brindes = estado.brindes.filter(x => x.id !== b.id); salvar(); renderBrindes();
    });
    ul.appendChild(li);
  });
  const temBrinde = estado.brindes.length > 0;
  $('#brindes-vazio').hidden = temBrinde;
  $('#ir-sorteio').disabled = !temBrinde || !estado.participantes.length;
}

/* ============================================================
   TELA 3 · SORTEIO
   ============================================================ */
const jumbo      = $('#jumbotron');
const jNome      = $('#jumbo-nome');
const jMeta      = $('#jumbo-meta');
const jRotulo    = $('#jumbo-rotulo');
const jBrinde    = $('#jumbo-brinde');
const btnSortear = $('#btn-sortear');
const seletor    = $('#seletor-brinde');

/* ---- Modo Apresentação ---- */
function toggleApresentacao(){
  const ativando = document.body.classList.toggle('modo-apresentacao');
  if (ativando) document.documentElement.requestFullscreen?.().catch(() => {});
  else          document.exitFullscreen?.().catch(() => {});
  const btn = document.getElementById('btn-apresentacao');
  if (btn) btn.setAttribute('aria-pressed', ativando);
}
document.getElementById('btn-apresentacao')?.addEventListener('click', toggleApresentacao);
document.getElementById('btn-sair-apresentacao')?.addEventListener('click', toggleApresentacao);
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) document.body.classList.remove('modo-apresentacao');
});

/* ---- Som ---- */
function toggleSom(){
  somAtivo = !somAtivo;
  const btn = document.getElementById('btn-som');
  if (btn){ btn.textContent = somAtivo ? '🔊' : '🔇'; btn.setAttribute('aria-pressed', !somAtivo); }
  mostrarToast(somAtivo ? 'Som ativado' : 'Som silenciado', '', 1400);
}
document.getElementById('btn-som')?.addEventListener('click', toggleSom);

/* ---- Velocidade / Tensão ---- */
const LABELS_VEL = {0.5:'⚡ Rápido', 0.75:'Rápido', 1:'Normal', 1.5:'Tenso', 2:'Muito Tenso', 2.5:'Suspense', 3:'Máximo'};
document.getElementById('slider-velocidade')?.addEventListener('input', e => {
  velocidadeSorteio = parseFloat(e.target.value);
  const el = document.getElementById('velocidade-label');
  if (el) el.textContent = LABELS_VEL[velocidadeSorteio] ?? velocidadeSorteio + '×';
});

/* ---- Lote (quantidade) ---- */
function loteQtd(){
  const el = document.getElementById('lote-qtd');
  return el ? Math.max(1, parseInt(el.value) || 1) : 1;
}
document.getElementById('lote-qtd')?.addEventListener('input', atualizarContexto);

/* ---- Sorteio ---- */
function prepararSorteio(){
  seletor.innerHTML = '';
  const disp = estado.brindes.filter(b => b.qtd - b.sorteados > 0);
  if (!disp.length){
    seletor.innerHTML = '<option>Nenhum brinde disponível</option>';
  } else {
    disp.forEach(b => {
      const o = document.createElement('option');
      o.value = b.id;
      const restantes = b.qtd - b.sorteados;
      o.textContent = `${b.final ? '⭐ ' : ''}${b.nome} (${restantes} restante${restantes>1?'s':''})`;
      seletor.appendChild(o);
    });
  }
  atualizarContexto();
  resetJumbo();
}
seletor.addEventListener('change', atualizarContexto);

function brindeAtual(){ return estado.brindes.find(b => b.id === seletor.value); }

function atualizarContexto(){
  const total  = estado.participantes.length;
  const ganhou = idsGanhadores().size;
  const eleg   = elegiveis().length;

  $('#qtd-elegiveis').textContent = eleg;
  const elTotal  = document.getElementById('qtd-total');
  const elGanhou = document.getElementById('qtd-ganhou');
  if (elTotal)  elTotal.textContent  = total;
  if (elGanhou) elGanhou.textContent = ganhou;

  const b = brindeAtual();
  const ehFinal = !!(b && b.final);
  btnSortear.classList.toggle('final', ehFinal);

  /* lote: desativar para prêmio final; limitar ao disponível */
  const loteInput = document.getElementById('lote-qtd');
  if (loteInput){
    if (ehFinal){ loteInput.value = 1; loteInput.disabled = true; }
    else {
      loteInput.disabled = false;
      const maxLote = Math.min(eleg, b ? b.qtd - b.sorteados : eleg);
      loteInput.max = maxLote;
      if (parseInt(loteInput.value) > maxLote) loteInput.value = Math.max(1, maxLote);
    }
  }

  /* texto do botão */
  const n = loteQtd();
  if (ehFinal)    btnSortear.textContent = 'Sortear Prêmio Final';
  else if (n > 1) btnSortear.textContent = `Sortear ${n} × ${b ? b.nome : ''}`.trim();
  else            btnSortear.textContent = 'Sortear';

  const semPool = eleg === 0 || !b;
  btnSortear.disabled = semPool;
  if (eleg === 0) jRotulo.textContent = 'Todos os participantes já foram premiados';
}

function resetJumbo(){
  jumbo.className = 'jumbotron';
  jNome.style.animation = '';
  jNome.style.display = '';
  jNome.textContent = '— — —';
  jMeta.textContent = '';
  jRotulo.textContent = 'Pronto para sortear';
  jBrinde.hidden = true;
  $('#acoes-ganhador').hidden = true;
  btnSortear.hidden = false;
  ganhadorPendente = null;
  lotePendente = null;
  const btnConfirmar = $('#btn-confirmar');
  if (btnConfirmar) btnConfirmar.textContent = 'Confirmar ganhador';
  const jLista = document.getElementById('jumbo-lista');
  if (jLista){ jLista.hidden = true; jLista.innerHTML = ''; }
}

btnSortear.addEventListener('click', iniciarSorteio);
$('#btn-resortear').addEventListener('click', () => { resetJumbo(); atualizarContexto(); });
$('#btn-confirmar').addEventListener('click', confirmarGanhador);

/* atalho Espaço: dispara sorteio na tela de palco */
document.addEventListener('keydown', e => {
  if (e.key !== ' ' || e.target.matches('input,select,textarea,button')) return;
  const telaAtiva = $('.tela.ativa');
  if (telaAtiva?.id === 'tela-sorteio' && !btnSortear.hidden && !btnSortear.disabled && !sorteando){
    e.preventDefault(); iniciarSorteio();
  }
});

/* ---- iniciarSorteio: ramifica entre individual e lote ---- */
function iniciarSorteio(){
  if (sorteando) return;
  const pool = elegiveis();
  const b    = brindeAtual();
  if (!pool.length || !b) return;

  const n = loteQtd();
  if (n > 1) iniciarSorteioLote(pool, b, n);
  else       iniciarSorteioSimples(pool, b);
}

/* ============================================================
   Duração da animação — fixa (não depende do tamanho da lista de
   participantes). A roleta é puramente visual: não cicla nomes
   reais, então não tem como "travar" exibindo um nome parado.
   ============================================================ */
function duracaoSorteio(ehFinal, lote){
  const base = lote ? 1700 : (ehFinal ? 2600 : 1900);
  return Math.max(400, Math.round(base * velocidadeSorteio));
}

/* ---- SORTEIO INDIVIDUAL ---- */
function iniciarSorteioSimples(pool, b){
  sorteando = true;
  btnSortear.disabled = true;
  jBrinde.hidden = true;
  jMeta.textContent = '';

  const ganhador = escolher(pool);           // decisão tomada antes da animação
  const ehFinal  = !!b.final;
  const semMov   = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  const embaralhar = () => {
    jRotulo.textContent = 'Sorteando…';
    jNome.style.animation = '';
    jNome.style.display = 'none';            // a roleta assume a exibição visual
    jMeta.textContent = '';
    const jLista = document.getElementById('jumbo-lista');
    if (jLista) jLista.hidden = true;
    jumbo.className = 'jumbotron embaralhando' + (ehFinal ? ' final' : '');
    const duracao = duracaoSorteio(ehFinal, false);
    tocarTicksDurante(duracao);
    setTimeout(() => revelarSimples(ganhador, b, ehFinal), duracao);
  };

  if (ehFinal && !semMov){
    jRotulo.textContent = 'Prêmio final';
    let n = 3;
    const passo = () => {
      if (n >= 1){
        jumbo.className = 'jumbotron contagem final-build';
        jNome.style.display = '';
        jNome.textContent = String(n);
        jNome.style.animation = 'none'; void jNome.offsetWidth; jNome.style.animation = '';
        tocarBeepContagem(n);
        n--;
        setTimeout(passo, 850 * velocidadeSorteio);
      } else {
        embaralhar();
      }
    };
    passo();
  } else {
    embaralhar();
  }
}

function revelarSimples(p, b, ehFinal){
  jNome.style.display = '';
  jNome.style.animation = '';
  jumbo.className = 'jumbotron vencedor' + (ehFinal ? ' final' : '');
  jRotulo.textContent = ehFinal ? '🏆 Ganhador do Prêmio Final' : 'Ganhador';
  jNome.textContent = p.nome;
  jMeta.textContent = [p.matricula && 'mat. ' + p.matricula, p.funcao].filter(Boolean).join(' · ');
  jBrinde.hidden = false;
  jBrinde.querySelector('use').setAttribute('href', iconeBrinde(b));
  jBrinde.querySelector('span').textContent = b.nome;
  btnSortear.hidden = true;
  $('#acoes-ganhador').hidden = false;
  ganhadorPendente = { participante:p, brinde:b };
  sorteando = false;
  tocarFanfarra(ehFinal);
  dispararConfete(ehFinal);
}

/* ---- SORTEIO EM LOTE ---- */
function iniciarSorteioLote(pool, b, n){
  sorteando = true;
  btnSortear.disabled = true;
  jBrinde.hidden = true;
  jMeta.textContent = '';

  /* escolhe n vencedores sem reposição usando crypto RNG — O(n) no tamanho do lote, não da lista total */
  const copia = [...pool];
  const vencedores = [];
  for (let i = 0; i < n && copia.length > 0; i++){
    const idx = inteiroSeguro(copia.length);
    vencedores.push(copia.splice(idx, 1)[0]);
  }

  jRotulo.textContent = `Sorteando ${n} ganhadores…`;
  jNome.style.display = 'none';
  const jLista = document.getElementById('jumbo-lista');
  if (jLista) jLista.hidden = true;
  jumbo.className = 'jumbotron embaralhando';

  const duracao = duracaoSorteio(false, true);
  tocarTicksDurante(duracao);
  setTimeout(() => revelarLote(vencedores, b), duracao);
}

function revelarLote(vencedores, b){
  jumbo.className = 'jumbotron vencedor';
  jNome.style.display = 'none';
  jMeta.textContent = '';

  const jLista = document.getElementById('jumbo-lista');
  if (jLista){
    jLista.innerHTML = '';
    vencedores.forEach((p, i) => {
      const div = document.createElement('div');
      div.className = 'lote-item';
      div.style.animationDelay = `${i * 0.07}s`;
      const meta = [p.matricula && 'mat. ' + p.matricula, p.funcao].filter(Boolean).join(' · ');
      div.innerHTML = `<span class="lote-num">${i+1}</span><span class="lote-nome">${esc(p.nome)}</span>${meta ? `<span class="lote-meta">${esc(meta)}</span>` : ''}`;
      jLista.appendChild(div);
    });
    jLista.hidden = false;
  }

  const plural = vencedores.length > 1;
  jRotulo.textContent = `${vencedores.length} Ganhador${plural ? 'es' : ''} · ${esc(b.nome)}`;
  jBrinde.hidden = false;
  jBrinde.querySelector('use').setAttribute('href', iconeBrinde(b));
  jBrinde.querySelector('span').textContent = `${b.nome} × ${vencedores.length}`;

  const btnConfirmar = $('#btn-confirmar');
  if (btnConfirmar) btnConfirmar.textContent = plural ? `Confirmar todos (${vencedores.length})` : 'Confirmar ganhador';

  btnSortear.hidden = true;
  $('#acoes-ganhador').hidden = false;

  lotePendente = { participantes: vencedores, brinde: b };
  ganhadorPendente = null;
  sorteando = false;
  tocarFanfarra(false);
  dispararConfete(false);
}

function confirmarGanhador(){
  if (lotePendente){ confirmarLote(); return; }
  if (!ganhadorPendente) return;
  const { participante, brinde } = ganhadorPendente;
  const acao = () => {
    estado.ganhadores.push({ participante, brinde:{ nome:brinde.nome, final:!!brinde.final }, ts:Date.now() });
    const b = estado.brindes.find(x => x.id === brinde.id);
    if (b) b.sorteados++;
    salvar();
    prepararSorteio();
  };
  if (brinde.final){
    confirmar(`Confirmar <b>${esc(participante.nome)}</b> como ganhador do prêmio final <b>${esc(brinde.nome)}</b>? Esta ação entra no registro oficial.`, acao);
  } else { acao(); }
}

function confirmarLote(){
  if (!lotePendente) return;
  const { participantes, brinde } = lotePendente;
  const ts = Date.now();
  participantes.forEach(p => {
    estado.ganhadores.push({ participante:p, brinde:{ nome:brinde.nome, final:!!brinde.final }, ts });
  });
  const b = estado.brindes.find(x => x.id === brinde.id);
  if (b) b.sorteados += participantes.length;
  lotePendente = null;
  salvar();
  prepararSorteio();
}

/* ============================================================
   CONFETE
   ============================================================ */
const canvas = $('#confete');
const ctx    = canvas.getContext('2d');
let particulas  = [];
let animConfete = null;

function dispararConfete(ehFinal){
  if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  canvas.classList.add('ativo');
  canvas.width = innerWidth; canvas.height = innerHeight;
  const cores = ehFinal
    ? ['#F5C451','#e0a92e','#ffffff','#9ECEB0']
    : ['#4FB286','#9ECEB0','#2151A3','#EAF1FB','#F5C451'];
  const n = ehFinal ? 220 : 140;
  particulas = Array.from({length:n}, () => ({
    x:Math.random()*canvas.width,
    y:-20 - Math.random()*canvas.height*0.4,
    r:4 + Math.random()*6,
    cor:cores[Math.floor(Math.random()*cores.length)],
    vy:2 + Math.random()*4,
    vx:-1.5 + Math.random()*3,
    rot:Math.random()*6.28,
    vr:-0.2 + Math.random()*0.4,
    vida:1
  }));
  cancelAnimationFrame(animConfete);
  loopConfete();
}

function loopConfete(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  let vivos = 0;
  particulas.forEach(p => {
    p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.rot += p.vr;
    if (p.y > canvas.height + 20) p.vida = 0;
    if (p.vida > 0){
      vivos++;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.cor; ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*1.6);
      ctx.restore();
    }
  });
  if (vivos > 0) animConfete = requestAnimationFrame(loopConfete);
  else { ctx.clearRect(0,0,canvas.width,canvas.height); canvas.classList.remove('ativo'); }
}
addEventListener('resize', () => {
  if (canvas.classList.contains('ativo')){ canvas.width = innerWidth; canvas.height = innerHeight; }
});

/* ============================================================
   TELA 4 · GANHADORES + EXPORT
   ============================================================ */
function renderGanhadores(){
  const busca = $('#busca-ganhador');
  if (busca) busca.value = '';

  const temGanhador = estado.ganhadores.length > 0;
  $('#ganhadores-vazio').hidden = temGanhador;
  $('#ganhadores-wrap').hidden = !temGanhador;
  $('#desfazer-ultimo').disabled = !temGanhador;

  const tb = $('#tbody-ganhadores'); tb.innerHTML = '';
  estado.ganhadores.forEach((g, i) => {
    const tr = document.createElement('tr');
    if (g.brinde.final) tr.className = 'final';
    const hora = new Date(g.ts).toLocaleString('pt-BR');
    tr.innerHTML = `
      <td class="tg-num">${i+1}</td>
      <td>${esc(g.participante.nome)}</td>
      <td>${esc(g.participante.matricula||'—')}</td>
      <td>${esc(g.participante.funcao||'—')}</td>
      <td>${esc(g.brinde.nome)}</td>
      <td>${hora}</td>`;
    tb.appendChild(tr);
  });
}

/* busca em tempo real */
document.getElementById('busca-ganhador')?.addEventListener('input', e => {
  const q = e.target.value.toLowerCase().trim();
  $$('#tbody-ganhadores tr').forEach(tr => {
    tr.hidden = q.length > 0 && !tr.textContent.toLowerCase().includes(q);
  });
});

/* exportar CSV */
$('#export-csv').addEventListener('click', () => {
  const linhas = [['#','Nome','Matrícula','Função','Brinde','Prêmio Final','Data e hora']];
  estado.ganhadores.forEach((g,i) => linhas.push([
    i+1, g.participante.nome, g.participante.matricula||'', g.participante.funcao||'',
    g.brinde.nome, g.brinde.final ? 'Sim' : 'Não', new Date(g.ts).toLocaleString('pt-BR')
  ]));
  const csv = linhas.map(l => l.map(c => `"${String(c).replace(/"/g,'""')}"`).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type:'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'ganhadores-sorteio-ecourbis.csv'; a.click();
  URL.revokeObjectURL(a.href);
  mostrarToast('CSV exportado!', 'ok');
});

/* exportar XLSX */
$('#export-xlsx').addEventListener('click', () => {
  const dados = [['#','Nome','Matrícula','Função','Brinde','Prêmio Final','Data e hora']];
  estado.ganhadores.forEach((g,i) => dados.push([
    i+1, g.participante.nome, g.participante.matricula||'', g.participante.funcao||'',
    g.brinde.nome, g.brinde.final ? 'Sim' : 'Não', new Date(g.ts).toLocaleString('pt-BR')
  ]));
  const ws = XLSX.utils.aoa_to_sheet(dados);
  ws['!cols'] = [{wch:4},{wch:32},{wch:14},{wch:22},{wch:22},{wch:12},{wch:22}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ganhadores');
  XLSX.writeFile(wb, 'ganhadores-sorteio-ecourbis.xlsx');
  mostrarToast('Arquivo XLSX gerado!', 'ok');
});

/* desfazer último */
$('#desfazer-ultimo').addEventListener('click', () => {
  if (!estado.ganhadores.length) return;
  const ultimo = estado.ganhadores[estado.ganhadores.length - 1];
  confirmar(
    `Desfazer o sorteio de <b>${esc(ultimo.participante.nome)}</b>? O participante voltará ao pool de elegíveis.`,
    () => {
      estado.ganhadores.pop();
      const b = estado.brindes.find(x => x.nome === ultimo.brinde.nome && !!x.final === !!ultimo.brinde.final);
      if (b && b.sorteados > 0) b.sorteados--;
      salvar();
      renderGanhadores();
      mostrarToast('Último sorteio desfeito.', 'ok');
    }
  );
});

/* reiniciar → salva no histórico antes de limpar */
$('#limpar-tudo').addEventListener('click', () => {
  const temGanhadores = estado.ganhadores.length > 0;
  const msgExtra = temGanhadores ? ' O evento atual será salvo no histórico.' : '';
  confirmar(
    `Reiniciar o sorteio? Os <b>ganhadores serão apagados</b> e todos voltam ao pool. A lista de participantes e brindes é mantida.${msgExtra}`,
    () => {
      if (temGanhadores) salvarHistoricoAtual();
      estado.ganhadores = [];
      estado.brindes.forEach(b => b.sorteados = 0);
      salvar();
      renderGanhadores();
      if (temGanhadores) mostrarToast('Evento salvo no histórico.', 'ok');
    }
  );
});

/* ============================================================
   HISTÓRICO DE EVENTOS
   ============================================================ */
function carregarHistorico(){
  try { return JSON.parse(localStorage.getItem(CHAVE_HIST)) || []; }
  catch { return []; }
}

function salvarHistoricoAtual(){
  if (!estado.ganhadores.length) return;
  const historico = carregarHistorico();
  const porBrinde = {};
  estado.ganhadores.forEach(g => { porBrinde[g.brinde.nome] = (porBrinde[g.brinde.nome] || 0) + 1; });
  historico.push({
    id: Date.now(),
    ts: Date.now(),
    nome: `Evento de ${new Date().toLocaleDateString('pt-BR')}`,
    ganhadores: [...estado.ganhadores],
    resumo: { total: estado.ganhadores.length, porBrinde }
  });
  localStorage.setItem(CHAVE_HIST, JSON.stringify(historico));
}

function exportarHistoricoCSV(ev){
  const linhas = [['#','Nome','Matrícula','Função','Brinde','Prêmio Final','Data e hora']];
  ev.ganhadores.forEach((g,i) => linhas.push([
    i+1, g.participante.nome, g.participante.matricula||'', g.participante.funcao||'',
    g.brinde.nome, g.brinde.final ? 'Sim' : 'Não', new Date(g.ts).toLocaleString('pt-BR')
  ]));
  const csv = linhas.map(l => l.map(c => `"${String(c).replace(/"/g,'""')}"`).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type:'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `historico-${ev.nome.replace(/\//g,'-').replace(/[^a-zA-Z0-9-]/g,'_')}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function renderHistorico(){
  const historico = carregarHistorico();
  const lista = document.getElementById('historico-lista');
  if (!lista) return;

  if (!historico.length){
    lista.innerHTML = '<p class="vazio">Nenhum evento anterior. Ao reiniciar o sorteio, o evento é salvo aqui automaticamente.</p>';
    return;
  }

  lista.innerHTML = '';
  [...historico].reverse().forEach(ev => {
    const div = document.createElement('div');
    div.className = 'hist-item';
    const data = new Date(ev.ts).toLocaleString('pt-BR');
    const porBrinde = ev.resumo.porBrinde || ev.resumo.tipos || {};
    const resumoBrindes = Object.entries(porBrinde).map(([nome, n]) => `${n} × ${nome}`).join(', ');
    div.innerHTML = `
      <div class="hist-cabeca">
        <span class="hist-nome">${esc(ev.nome)}</span>
        <span class="hist-data">${data}</span>
        <span class="hist-badge">${ev.resumo.total} prêmio${ev.resumo.total !== 1 ? 's' : ''}</span>
        <button class="hist-toggle" aria-expanded="false" aria-label="Expandir detalhes">▼</button>
      </div>
      <div class="hist-detalhe" hidden>
        <p class="hist-tipos">${esc(resumoBrindes)}</p>
        <ol class="hist-lista-nomes">
          ${ev.ganhadores.map(g => `<li><b>${esc(g.participante.nome)}</b> — ${esc(g.brinde.nome)}</li>`).join('')}
        </ol>
        <button class="btn-fantasma btn-sm hist-export-btn">⬇ Exportar CSV deste evento</button>
      </div>`;

    div.querySelector('.hist-toggle').addEventListener('click', e => {
      const btn = e.currentTarget;
      const detalhe = div.querySelector('.hist-detalhe');
      const exp = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', !exp);
      btn.textContent = exp ? '▼' : '▲';
      detalhe.hidden = exp;
    });

    div.querySelector('.hist-export-btn').addEventListener('click', () => exportarHistoricoCSV(ev));
    lista.appendChild(div);
  });
}

const histDlg = document.getElementById('historico-dlg');
document.getElementById('btn-historico')?.addEventListener('click', () => { renderHistorico(); histDlg?.showModal(); });
document.getElementById('historico-fechar')?.addEventListener('click', () => histDlg?.close());
histDlg?.addEventListener('click', e => { if (e.target === histDlg) histDlg.close(); });

/* ============================================================
   DIÁLOGO DE CONFIRMAÇÃO
   ============================================================ */
const dlg = $('#confirmador');
let acaoConfirmar = null;
function confirmar(msgHTML, acao){
  $('#confirmador-msg').innerHTML = msgHTML;
  acaoConfirmar = acao;
  dlg.showModal();
}
$('#confirmador-sim').addEventListener('click', () => { dlg.close(); if (acaoConfirmar) acaoConfirmar(); acaoConfirmar = null; });
$('#confirmador-nao').addEventListener('click', () => { dlg.close(); acaoConfirmar = null; });

/* ---------- util ---------- */
function esc(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
function init(){
  if (dadosCorruptos) {
    mostrarToast('Dados salvos inválidos removidos. Começando do zero.', 'aviso', 4500);
  } else if (!estado.participantes.length && localStorage.getItem(CHAVE_V1_LEGADA)) {
    mostrarToast('Dados de uma versão antiga do sorteio foram encontrados, mas não são compatíveis. Reimporte a planilha de participantes.', 'aviso', 6000);
  }
  if (estado.participantes.length) mostrarResumo();
  renderBrindes();
  irPara('importar');
}
init();

})();
