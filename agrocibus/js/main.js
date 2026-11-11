/* AgroCibus — Cibus®
   Quiz → WhatsApp, calculadora, vídeos sob demanda e animações de rolagem.
   Sem dependências. */
(() => {
  'use strict';

  // ---------------------------------------------------------------
  // Configuração
  // ---------------------------------------------------------------
  const WHATSAPP = '5548991571228'; // (48) 99157-1228 — número do site atual

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const movimentoReduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const economiaDeDados = navigator.connection && navigator.connection.saveData;

  const cArea = $('#calc-area'), cPreco = $('#calc-preco'), cSacas = $('#calc-sacas');
  const fmt = (n, casas = 0) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  const dinheiro = (n) => 'R$ ' + fmt(Math.round(n));
  let sacasExatas = null; // valor medido de uma fazenda, quando o visitante toca na marca da régua

  // ---------------------------------------------------------------
  // Medição: empurra eventos para o dataLayer / pixel, se existirem
  // ---------------------------------------------------------------
  function medir(evento, dados = {}) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: evento, ...dados });
      if (typeof window.fbq === 'function') {
        if (evento === 'whatsapp_clique') window.fbq('track', 'Contact', dados);
        if (evento === 'quiz_concluido') window.fbq('track', 'Lead', dados);
      }
    } catch (_) { /* medição nunca pode quebrar a página */ }
  }

  function linkWhatsApp(texto) {
    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
  }

  // ---------------------------------------------------------------
  // Dados do quiz
  // ---------------------------------------------------------------
  const CULTURAS = {
    soja:       { nome: 'Soja',       frase: 'soja',            linha: 'leg',  fases: 'grao' },
    milho:      { nome: 'Milho',      frase: 'milho',           linha: 'gram', fases: 'milho' },
    arroz:      { nome: 'Arroz',      frase: 'arroz',           linha: 'gram', fases: 'arroz' },
    trigo:      { nome: 'Trigo',      frase: 'trigo',           linha: 'gram', fases: 'trigo' },
    feijao:     { nome: 'Feijão',     frase: 'feijão',          linha: 'leg',  fases: 'grao' },
    pastagem:   { nome: 'Pastagem',   frase: 'pastagem',        linha: 'gram', fases: 'pasto' },
    cafe:       { nome: 'Café',       frase: 'café',            linha: 'flex', fases: 'cafe' },
    hortifruti: { nome: 'Hortifruti', frase: 'hortifruti',      linha: 'flex', fases: 'horti' },
    algodao:    { nome: 'Algodão',    frase: 'algodão',         linha: 'flex', fases: 'algodao' },
    cana:       { nome: 'Cana',       frase: 'cana-de-açúcar',  linha: 'cana', fases: 'cana' },
    outra:      { nome: 'Outra',      frase: 'outra cultura',   linha: null,   fases: 'geral' },
  };

  // [rótulo do botão, trecho que entra na mensagem, urgente?]
  const SENTIU = ['A lavoura sentiu (seca, herbicida ou frio)', 'A lavoura sentiu e preciso que ela retome', true];
  const FASES = {
    grao:    [['Ainda vou plantar', 'Ainda vou plantar'], ['Vegetativo, antes de florir', 'A lavoura está no vegetativo'], ['Florindo', 'A lavoura está florindo'], ['Enchendo grão', 'A lavoura está enchendo grão'], SENTIU],
    milho:   [['Ainda vou plantar', 'Ainda vou plantar'], ['Até 8 folhas', 'O milho está com até 8 folhas'], ['Pendoando', 'O milho está pendoando'], ['Enchendo grão', 'O milho está enchendo grão'], SENTIU],
    arroz:   [['Ainda vou semear', 'Ainda vou semear'], ['Perfilhando', 'O arroz está perfilhando'], ['Entrou a água', 'A água já entrou na lavoura'], ['Emborrachando ou florindo', 'O arroz está emborrachando ou florindo'], ['Sentiu herbicida ou frio', 'O arroz sentiu herbicida ou frio e preciso que ele retome', true]],
    trigo:   [['Ainda vou semear', 'Ainda vou semear'], ['Perfilhando', 'O trigo está perfilhando'], ['Alongando ou emborrachando', 'O trigo está alongando ou emborrachando'], ['Espigando', 'O trigo está espigando'], ['Pegou geada', 'O trigo pegou geada e preciso que ele retome', true]],
    pasto:   [['Vou implantar', 'Vou implantar a pastagem'], ['Acabou de ser pastejada', 'A área acabou de ser pastejada'], ['Rebrotando', 'O pasto está rebrotando'], ['Saída do inverno ou da seca', 'O pasto está saindo do inverno ou da seca']],
    cafe:    [['Pré-florada', 'O café está na pré-florada'], ['Florada e chumbinho', 'O café está na florada e chumbinho'], ['Granação', 'O café está na granação'], ['Pós-colheita', 'O café está no pós-colheita']],
    horti:   [['Transplante ou plantio', 'A cultura está no transplante ou plantio'], ['Crescimento', 'A cultura está em crescimento'], ['Florada e pegamento', 'A cultura está na florada e pegamento'], ['Enchimento de fruto', 'A cultura está no enchimento de fruto']],
    algodao: [['Ainda vou plantar', 'Ainda vou plantar'], ['Vegetativo', 'O algodão está no vegetativo'], ['Botões e flores', 'O algodão está com botões e flores'], ['Maçãs formadas', 'O algodão está com maçãs formadas'], SENTIU],
    cana:    [['Plantio', 'A cana está no plantio'], ['Brotação de soqueira', 'A soqueira está brotando'], ['Crescimento', 'O canavial está em crescimento'], ['Pré-colheita', 'O canavial está em pré-colheita']],
    geral:   [['Ainda vou plantar', 'Ainda vou plantar'], ['Começo do ciclo', 'A lavoura está no começo do ciclo'], ['Florada', 'A lavoura está na florada'], ['Enchimento ou produção', 'A lavoura está no enchimento'], SENTIU],
  };

  const FOCOS = [
    ['Quero colher mais', 'quero colher mais'],
    ['Segurar seca ou frio', 'preparar a lavoura para seca ou frio'],
    ['Retomar depois do herbicida', 'ajudar a lavoura a retomar depois do herbicida'],
    ['Florada e pegamento', 'melhorar florada e pegamento'],
    ['Quero ver se compensa', 'quero entender se compensa na minha área'],
  ];
  const FOCOS_PASTO = [
    ['Rebrota mais rápida', 'quero rebrota mais rápida'],
    ['Segurar mais gado na área', 'quero aumentar a lotação'],
    ['Atravessar a seca ou o inverno', 'preparar o pasto para a seca ou o inverno'],
    ['Quero ver se compensa', 'quero entender se compensa na minha área'],
  ];

  const AREAS = [
    ['Até 20 hectares', 'até 20 ha'],
    ['De 20 a 100 hectares', '20 a 100 ha'],
    ['De 100 a 500 hectares', '100 a 500 ha'],
    ['Mais de 500 hectares', 'mais de 500 ha'],
  ];

  const LINHAS = {
    leg:  { nome: 'Leg',  culturas: 'Soja, feijão, girassol e amendoim', prova: 'Na Fazenda Santa Isabel (RS), a soja com Cibus® Leg fechou em 62,68 sc/ha contra 53,39 da área sem o produto, na safra 22/23.' },
    gram: { nome: 'Gram', culturas: 'Milho, arroz, trigo e pastagens', prova: 'A dose e o momento mudam conforme a cultura e a fase. A equipe passa a recomendação para o seu caso.' },
    flex: { nome: 'Flex', culturas: 'Café, hortifruti e algodão', prova: 'A recomendação considera a cultura, a fase e o seu sistema de produção.' },
    cana: { nome: 'Cana', culturas: 'Cana-de-açúcar', prova: 'A recomendação considera se é cana-planta ou soca e a época de corte.' },
  };

  // ---------------------------------------------------------------
  // Quiz
  // ---------------------------------------------------------------
  const quiz = $('#quiz');
  const elTitulo = $('#quiz-titulo');
  const elPasso = $('#quiz-passo');
  const elOpcoes = $('#quiz-opcoes');
  const elBarra = $('#quiz-barra');
  const btVoltar = $('[data-quiz-voltar]');

  const estado = { passo: 0, cultura: null, fase: null, foco: null, area: null, cidade: '', origem: '' };

  function abrirQuiz({ cultura = null, origem = '' } = {}) {
    Object.assign(estado, { passo: 0, cultura: null, fase: null, urgente: false, foco: null, area: null, cidade: '', origem });
    if (cultura && CULTURAS[cultura]) { estado.cultura = cultura; estado.passo = 1; }
    desenhar();
    if (typeof quiz.showModal === 'function') quiz.showModal(); else quiz.setAttribute('open', '');
    document.documentElement.style.overflow = 'hidden';
    medir('quiz_inicio', { origem, cultura: cultura || '' });
  }

  function fecharQuiz() {
    if (quiz.open && typeof quiz.close === 'function') quiz.close(); else quiz.removeAttribute('open');
    document.documentElement.style.overflow = '';
  }

  function botao(rotulo, aoClicar, { i = 0, urgente = false, escolhida = false } = {}) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'opcao' + (urgente ? ' opcao--urgente' : '') + (escolhida ? ' escolhida' : '');
    b.style.setProperty('--i', i);
    b.textContent = rotulo;
    b.addEventListener('click', () => { b.classList.add('escolhida'); setTimeout(aoClicar, 160); });
    return b;
  }

  function desenhar() {
    const p = estado.passo;
    elOpcoes.replaceChildren();
    elOpcoes.className = 'quiz__opcoes';
    btVoltar.hidden = p === 0;
    elBarra.style.width = `${Math.min(100, (p + 1) * 25)}%`;
    elPasso.textContent = p < 4 ? `${p + 1} de 4` : 'Pronto';

    if (p === 0) {
      elTitulo.textContent = 'Qual é a sua cultura?';
      elOpcoes.classList.add('em-grade');
      Object.entries(CULTURAS).forEach(([chave, c], i) => {
        elOpcoes.append(botao(c.nome, () => { estado.cultura = chave; avancar(); }, { i, escolhida: estado.cultura === chave }));
      });
    } else if (p === 1) {
      const c = CULTURAS[estado.cultura];
      elTitulo.textContent = estado.cultura === 'pastagem' ? 'Como está o pasto hoje?' : 'Em que fase está a lavoura?';
      FASES[c.fases].forEach(([rotulo, frase, urgente], i) => {
        elOpcoes.append(botao(rotulo, () => { estado.fase = frase; estado.urgente = !!urgente; avancar(); }, { i, urgente, escolhida: estado.fase === frase }));
      });
    } else if (p === 2) {
      elTitulo.textContent = 'O que você mais quer resolver?';
      (estado.cultura === 'pastagem' ? FOCOS_PASTO : FOCOS).forEach(([rotulo, frase], i) => {
        elOpcoes.append(botao(rotulo, () => { estado.foco = frase; avancar(); }, { i, escolhida: estado.foco === frase }));
      });
    } else if (p === 3) {
      elTitulo.textContent = 'Qual é o tamanho da área?';
      AREAS.forEach(([rotulo, frase], i) => {
        elOpcoes.append(botao(rotulo, () => { estado.area = frase; avancar(); }, { i, escolhida: estado.area === frase }));
      });
    } else {
      desenharResultado();
    }
    // foco no título para leitores de tela e teclado
    requestAnimationFrame(() => elTitulo.focus({ preventScroll: true }));
  }

  function avancar() {
    estado.passo += 1;
    // Lavoura que sentiu já disse o que quer resolver: pula a pergunta de objetivo.
    if (estado.passo === 2 && estado.urgente) { estado.foco = null; estado.passo = 3; }
    medir('quiz_passo', { passo: estado.passo, cultura: estado.cultura });
    desenhar();
  }

  function mensagemDoQuiz() {
    const c = CULTURAS[estado.cultura];
    const linha = c.linha ? ` (Cibus ${LINHAS[c.linha].nome})` : '';
    const onde = estado.cidade.trim() ? `, em ${estado.cidade.trim()}` : '';
    const planto = estado.cultura === 'pastagem' ? 'Tenho pastagem' : estado.cultura === 'outra' ? 'Planto outra cultura' : `Planto ${c.frase}`;
    const objetivo = estado.foco ? `\nMeu objetivo: ${estado.foco}.` : '';
    return `Olá! Vim pelo site da AgroCibus.\n${planto}, ${estado.area}${onde}.\n${estado.fase}.${objetivo}\nQuero a recomendação${linha} e o preço por hectare.`;
  }

  function desenharResultado() {
    const c = CULTURAS[estado.cultura];
    const l = c.linha ? LINHAS[c.linha] : null;
    elTitulo.textContent = estado.urgente ? 'Lavoura que sentiu não espera. Mande agora.' : 'Sua mensagem está pronta.';

    const caixa = document.createElement('div');
    caixa.className = 'resultado';

    const cartao = document.createElement('div');
    cartao.className = 'resultado__linha';
    cartao.innerHTML = l
      ? `<span class="mono">Linha indicada para ${c.frase}</span><b>Cibus® <em>${l.nome}</em></b><p>${l.prova}</p>`
      : `<span class="mono">Sua cultura</span><b>Vamos <em>conversar</em></b><p>Conte qual é a cultura e a equipe indica a linha Cibus® certa para ela.</p>`;

    const rotulo = document.createElement('label');
    rotulo.innerHTML = '<span>Cidade e estado <small>(opcional, ajuda na entrega)</small></span>';
    const campo = document.createElement('input');
    campo.type = 'text'; campo.autocomplete = 'address-level2'; campo.placeholder = 'Ex.: Cachoeira do Sul-RS'; campo.maxLength = 60;
    campo.value = estado.cidade;
    rotulo.append(campo);

    const previa = document.createElement('p');
    previa.className = 'resultado__msg';
    previa.style.whiteSpace = 'pre-line';

    const enviar = document.createElement('a');
    enviar.className = 'btn btn--wa btn--g';
    enviar.target = '_blank'; enviar.rel = 'noopener';
    enviar.innerHTML = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-wa"/></svg><span>Enviar no WhatsApp</span>';

    const nota = document.createElement('p');
    nota.className = 'resultado__nota';
    nota.textContent = 'Abre o seu WhatsApp com a mensagem escrita. É só apertar enviar.';

    const atualizar = () => {
      estado.cidade = campo.value;
      const texto = mensagemDoQuiz();
      previa.textContent = texto;
      enviar.href = linkWhatsApp(texto);
    };
    campo.addEventListener('input', atualizar);
    campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); enviar.click(); } });
    enviar.addEventListener('click', () => {
      medir('quiz_concluido', { cultura: estado.cultura, fase: estado.fase, foco: estado.foco, area: estado.area, origem: estado.origem });
      medir('whatsapp_clique', { origem: 'quiz', cultura: estado.cultura });
    });
    atualizar();

    caixa.append(cartao, rotulo, previa, enviar, nota);
    elOpcoes.append(caixa);
  }

  btVoltar.addEventListener('click', () => {
    if (estado.passo <= 0) return;
    estado.passo -= 1;
    if (estado.passo === 2 && estado.urgente) estado.passo = 1;
    desenhar();
  });
  $('[data-quiz-fechar]').addEventListener('click', fecharQuiz);
  quiz.addEventListener('close', () => { document.documentElement.style.overflow = ''; });
  quiz.addEventListener('click', (e) => { if (e.target === quiz) fecharQuiz(); }); // clique fora da caixa

  $$('[data-cultura]').forEach((b) => b.addEventListener('click', () => abrirQuiz({ cultura: b.dataset.cultura, origem: 'hero' })));
  $$('[data-quiz-abrir]').forEach((b) => b.addEventListener('click', () => {
    const origem = b.dataset.origem || '';
    const mapa = { 'linha-cana': 'cana' };
    abrirQuiz({ cultura: mapa[origem] || null, origem });
  }));

  // ---------------------------------------------------------------
  // Links diretos de WhatsApp
  // ---------------------------------------------------------------
  const MENSAGENS = {
    direto: () => 'Olá! Vim pelo site da AgroCibus e quero saber mais sobre o Cibus para a minha lavoura.',
    relatorio: (el) => `Olá! Vim pelo site da AgroCibus e quero receber o relatório completo da ${el.dataset.relatorio}.`,
    conta: () => {
      const { area, preco, sacas, total } = calcular();
      return `Olá! Vim pelo site da AgroCibus. Fiz a conta para ${fmt(area)} ha, com a saca a R$ ${fmt(preco)}: ${fmt(sacas, sacasExatas ? 2 : 1)} sc/ha a mais dariam ${dinheiro(total)} na safra. Quero o preço do Cibus por hectare para fechar essa conta.`;
    },
  };
  $$('[data-wa]').forEach((a) => {
    const tipo = a.dataset.wa;
    a.target = '_blank'; a.rel = 'noopener';
    const preparar = () => { a.href = linkWhatsApp(MENSAGENS[tipo](a)); };
    preparar();
    a.addEventListener('pointerdown', preparar);
    a.addEventListener('focus', preparar);
    a.addEventListener('click', () => { preparar(); medir('whatsapp_clique', { origem: a.dataset.origem || tipo }); });
  });

  // ---------------------------------------------------------------
  // Calculadora
  // ---------------------------------------------------------------

  function calcular() {
    const area = Math.max(0, parseFloat(cArea.value) || 0);
    const preco = Math.max(0, parseFloat(cPreco.value) || 0);
    const sacas = sacasExatas ?? (parseFloat(cSacas.value) || 0);
    return { area, preco, sacas, totalSacas: area * sacas, total: area * sacas * preco };
  }
  function pintarCalculadora() {
    const { area, sacas, totalSacas, total } = calcular();
    $('#calc-sacas-out').textContent = fmt(sacas, sacasExatas ? 2 : 1);
    $('#calc-valor').textContent = dinheiro(total);
    $('#calc-detalhe').textContent = `${fmt(Math.round(totalSacas))} sacas a mais em ${fmt(area)} hectares`;
    const pct = ((sacas - cSacas.min) / (cSacas.max - cSacas.min)) * 100;
    cSacas.style.setProperty('--pct', `${pct}%`);
  }
  if (cArea) {
    [cArea, cPreco].forEach((el) => el.addEventListener('input', pintarCalculadora));
    cSacas.addEventListener('input', () => { sacasExatas = null; pintarCalculadora(); });
    $$('[data-marca]').forEach((m) => m.addEventListener('click', () => { cSacas.value = m.dataset.marca; sacasExatas = parseFloat(m.dataset.marca); pintarCalculadora(); medir('calculadora_marca', { valor: m.dataset.marca }); }));
    let usou = false;
    cSacas.addEventListener('change', () => { if (!usou) { usou = true; medir('calculadora_uso'); } });
    pintarCalculadora();
  }

  // ---------------------------------------------------------------
  // Abas das linhas
  // ---------------------------------------------------------------
  const abas = $$('.linhas__abas [role="tab"]');
  function escolherAba(aba, focar = false) {
    abas.forEach((a) => {
      const ativa = a === aba;
      a.setAttribute('aria-selected', ativa);
      a.tabIndex = ativa ? 0 : -1;
      $('#' + a.getAttribute('aria-controls')).hidden = !ativa;
    });
    if (focar) aba.focus();
  }
  abas.forEach((aba, i) => {
    aba.addEventListener('click', () => { escolherAba(aba); medir('linha_vista', { linha: aba.dataset.linha }); });
    aba.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') escolherAba(abas[(i + 1) % abas.length], true);
      if (e.key === 'ArrowLeft') escolherAba(abas[(i - 1 + abas.length) % abas.length], true);
    });
  });

  // ---------------------------------------------------------------
  // Vídeos
  // ---------------------------------------------------------------
  // Hero: escolhe o corte vertical no celular; respeita economia de dados.
  const heroVideo = $('.hero__video');
  if (heroVideo && !movimentoReduzido && !economiaDeDados) {
    const vertical = matchMedia('(max-width: 759px) and (orientation: portrait)').matches;
    if (vertical) heroVideo.poster = heroVideo.dataset.mobile.replace('.mp4', '.jpg');
    heroVideo.src = vertical ? heroVideo.dataset.mobile : heroVideo.dataset.desktop;
    heroVideo.addEventListener('playing', () => heroVideo.classList.add('tocando'), { once: true });
    const tocar = () => heroVideo.play().catch(() => {});
    if (document.readyState === 'complete') tocar(); else addEventListener('load', tocar, { once: true });
  }

  // Vídeos de ambiente: carregam e tocam só quando entram na tela.
  if ('IntersectionObserver' in window && !movimentoReduzido && !economiaDeDados) {
    const obsVideo = new IntersectionObserver((entradas) => {
      entradas.forEach(({ target: v, isIntersecting }) => {
        if (isIntersecting) {
          if (!v.src) v.src = v.dataset.src;
          v.play().catch(() => {});
        } else if (v.src) {
          v.pause();
        }
      });
    }, { rootMargin: '200px 0px' });
    $$('video[data-auto]').forEach((v) => obsVideo.observe(v));
  }

  // Depoimentos: toque para tocar com som; um de cada vez.
  const depos = $$('.depo__video');
  depos.forEach((caixa) => {
    const v = $('video', caixa);
    const play = $('.depo__play', caixa);
    play.addEventListener('click', () => {
      depos.forEach((outra) => { const o = $('video', outra); if (o !== v && !o.paused) o.pause(); });
      if (!v.src) v.src = v.dataset.src;
      v.controls = true;
      caixa.classList.add('tocando');
      v.play().catch(() => {});
      medir('video_play', { video: v.dataset.src.split('/').pop() });
    });
    v.addEventListener('ended', () => { caixa.classList.remove('tocando'); v.controls = false; v.load(); });
  });
  if ('IntersectionObserver' in window) {
    const obsDepo = new IntersectionObserver((entradas) => {
      entradas.forEach(({ target, isIntersecting }) => { const v = $('video', target); if (!isIntersecting && v.src && !v.paused) v.pause(); });
    }, { threshold: .2 });
    depos.forEach((d) => obsDepo.observe(d));
  }

  // ---------------------------------------------------------------
  // Revelar ao rolar + contadores
  // ---------------------------------------------------------------
  function contar(el) {
    const alvo = parseFloat(el.dataset.contar);
    const casas = parseInt(el.dataset.casas || '0', 10);
    if (movimentoReduzido) { el.textContent = fmt(alvo, casas); return; }
    const inicio = performance.now(), duracao = 1400;
    const passo = (agora) => {
      const t = Math.min(1, (agora - inicio) / duracao);
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(alvo * e, casas);
      if (t < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }

  const revelaveis = $$('[data-revelar]');
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('visivel');
        $$('[data-contar]', e.target).forEach(contar);
        obs.unobserve(e.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    revelaveis.forEach((el) => {
      // escalona irmãos que aparecem juntos
      const irmaos = [...el.parentElement.children].filter((x) => x.hasAttribute('data-revelar'));
      el.style.setProperty('--atraso', Math.min(irmaos.indexOf(el), 4));
      obs.observe(el);
    });
  } else {
    revelaveis.forEach((el) => el.classList.add('visivel'));
  }

  // ---------------------------------------------------------------
  // Topo e barra fixa
  // ---------------------------------------------------------------
  const topo = $('#topo');
  const barra = $('[data-barra]');
  const hero = $('.hero');
  const fecho = $('#fecho');
  let agendado = false;
  function aoRolar() {
    agendado = false;
    const y = scrollY;
    topo.classList.toggle('rolou', y > 40);
    if (barra) {
      const passouHero = y > hero.offsetHeight * 0.7;
      const noFecho = fecho && fecho.getBoundingClientRect().top < innerHeight * 0.6;
      barra.classList.toggle('ativa', passouHero && !noFecho);
    }
  }
  addEventListener('scroll', () => { if (!agendado) { agendado = true; requestAnimationFrame(aoRolar); } }, { passive: true });
  aoRolar();
})();
