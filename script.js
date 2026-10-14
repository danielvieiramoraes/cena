const STORAGE_KEY = 'cena-transition-dashboard-v1';
const areas = [
  { name: 'Administrativo', description: 'Contratos, procurações e rotinas corporativas.' },
  { name: 'Financeiro', description: 'Contas a pagar, a receber e posição de caixa.' },
  { name: 'Orçamento', description: 'Orçado, realizado e compromissos por obra.' },
  { name: 'Operacional', description: 'Obras ativas, marcos e pendências críticas.' },
  { name: 'Estrutura da sede', description: 'Espaço físico, patrimônio e continuidade.' },
  { name: 'Estrutura de apoio', description: 'Frota, compras, viagens e serviços.' },
  { name: 'RH', description: 'Pessoas, folha, benefícios e obrigações.' },
  { name: 'Processos & indicadores', description: 'Métodos, métricas, metas e ritos.' },
  { name: 'Sistemas de tecnologia', description: 'Sienge, CV e ambiente Microsoft 365.' }
];
const statusColumns = [
  { id: 'request', label: 'A solicitar' },
  { id: 'progress', label: 'Em andamento' },
  { id: 'done', label: 'Entregue' }
];
const toast = document.querySelector('#toast');
const dialog = document.querySelector('#editorDialog');
const detailDialog = document.querySelector('#detailDialog');
const editorForm = document.querySelector('#editorForm');
let toastTimeout;
let saveTimeout;
let dragTaskId = null;
let editorMode = 'task';
let editTargetId = null;
let detailTargetId = null;

function localDateOffset(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function makeTask(area, title, detail, status, dueIn, priority = 'medium') {
  return { id: crypto.randomUUID(), area, title, detail, status, due: localDateOffset(dueIn), priority, requested: status !== 'request', received: status === 'done' };
}

const initialState = {
  keyData: { activeWorks: '', focus: 'Continuidade administrativa, financeira e operacional' },
  tasks: [
    makeTask('Administrativo', 'Contratos, procurações e obrigações vigentes', 'Listar vigências, responsáveis, renovações e pendências legais.', 'progress', 4, 'high'),
    makeTask('Administrativo', 'Certidões, licenças e calendário corporativo', 'Entregar documentos válidos e datas de renovação.', 'request', 11),
    makeTask('Financeiro', 'Contas a pagar: títulos, vencimentos e alçadas', 'Posição aberta, fluxo de aprovação, pagamentos recorrentes e urgências.', 'progress', 2, 'high'),
    makeTask('Financeiro', 'Contas a receber: carteira, aging e cobrança', 'Títulos por cliente/obra, atrasos, garantias, medições e responsáveis.', 'request', 4, 'high'),
    makeTask('Financeiro', 'Fluxo de caixa, conciliações e compromissos', 'Projeção de 13 semanas, saldos, conciliações e obrigações futuras.', 'request', 8, 'high'),
    makeTask('Financeiro', 'Bancos, acessos e rotina de fechamento', 'Contas, perfis autorizados, dupla aprovação e calendário de fechamento.', 'done', -1, 'high'),
    makeTask('Orçamento', 'Orçamento vigente por obra e centro de custo', 'Versão aprovada, premissas, responsáveis e histórico de revisões.', 'progress', 6, 'high'),
    makeTask('Orçamento', 'Realizado x orçado e projeção de desvios', 'Desvios relevantes, compromissos assumidos e plano de correção.', 'request', 13),
    makeTask('Operacional', 'Status físico-financeiro das obras ativas', 'Cronograma, avanço, medições, marcos contratuais e riscos de prazo.', 'progress', 3, 'high'),
    makeTask('Operacional', 'Pendências críticas e decisões em aberto', 'Ação necessária, impacto, responsável e data limite por obra.', 'request', 7, 'high'),
    makeTask('Operacional', 'Mobilização e contratos de apoio às obras', 'Frentes previstas, fornecedores críticos e dependências para 60 dias.', 'request', 18),
    makeTask('Estrutura da sede', 'Acessos, chaves, patrimônio e responsáveis', 'Relação de bens, localização, usuários e itens sob guarda.', 'request', 10, 'low'),
    makeTask('Estrutura da sede', 'Manutenções e contratos da sede', 'Serviços recorrentes, chamados abertos, garantias e próximos vencimentos.', 'request', 16),
    makeTask('Estrutura de apoio', 'Frota, viagens, compras e fornecedores', 'Veículos, contratos, pedidos abertos e rotinas de autorização.', 'progress', 8),
    makeTask('Estrutura de apoio', 'Arquivo e guarda de documentos', 'Localização de arquivos físicos, responsáveis e padrão de guarda.', 'request', 17, 'low'),
    makeTask('RH', 'Quadro, organograma e movimentações previstas', 'Posições-chave, substituições, férias e movimentações já alinhadas.', 'progress', 5, 'high'),
    makeTask('RH', 'Folha, benefícios e obrigações próximas', 'Calendário, fornecedores, eventos de folha e prazos legais.', 'request', 3, 'high'),
    makeTask('RH', 'Políticas, admissões e desligamentos em curso', 'Processos abertos, documentos pendentes e responsáveis pela continuidade.', 'request', 14),
    makeTask('Processos & indicadores', 'Processos críticos e procedimentos vigentes', 'Fluxo, dono, entradas/saídas, controles e pontos sem documentação.', 'request', 15),
    makeTask('Processos & indicadores', 'Indicadores: fontes, fórmulas e metas', 'Dicionário de indicadores, periodicidade, origem e responsável pela atualização.', 'progress', 9, 'high'),
    makeTask('Processos & indicadores', 'Ritos de gestão e calendário de fechamento', 'Reuniões, participantes, pauta, decisões esperadas e atas recentes.', 'request', 19),
    makeTask('Sistemas de tecnologia', 'Sienge: módulos, perfis, integrações e rotinas', 'Mapa de usuários, permissões, cadastros críticos, integrações e suporte.', 'progress', 4, 'high'),
    makeTask('Sistemas de tecnologia', 'CV: acessos, cadastros e fluxos utilizados', 'Confirmar escopo do sistema CV, usuários-chave, integrações e processos.', 'request', 9, 'high'),
    makeTask('Sistemas de tecnologia', 'Microsoft 365: usuários, licenças e segurança', 'Contas, grupos, MFA, licenças, administração e recuperação de acesso.', 'request', 5, 'high'),
    makeTask('Sistemas de tecnologia', 'Teams, SharePoint e OneDrive: donos e estrutura', 'Espaços, permissões, documentos de referência e política de retenção.', 'request', 12)
  ],
  dailyActions: [
    { id: crypto.randomUUID(), title: 'Confirmar alçadas de aprovação de pagamentos', owner: 'Financeiro', area: 'Financeiro', done: false },
    { id: crypto.randomUUID(), title: 'Validar a lista de obras e responsáveis ativos', owner: 'Operação', area: 'Operacional', done: false },
    { id: crypto.randomUUID(), title: 'Agendar conversa de passagem com RH', owner: 'Equipe CENA', area: 'RH', done: true },
    { id: crypto.randomUUID(), title: 'Revisar acessos críticos do Sienge e Microsoft 365', owner: 'Tecnologia', area: 'Sistemas de tecnologia', done: false }
  ],
  focusItems: [
    { id: crypto.randomUUID(), horizon: '30', title: 'Garantir continuidade de contas a pagar e folha', detail: 'Validar calendário de vencimentos, substitutos e alçadas durante a virada.', owner: 'Financeiro + RH' },
    { id: crypto.randomUUID(), horizon: '30', title: 'Fechar a posição de caixa e recebíveis críticos', detail: 'Conferir inadimplência, medições a faturar e compromissos de curto prazo.', owner: 'Financeiro' },
    { id: crypto.randomUUID(), horizon: '30', title: 'Revisar acessos administrativos do ERP e M365', detail: 'Evitar contas sem responsável e manter trilha de aprovação.', owner: 'Tecnologia' },
    { id: crypto.randomUUID(), horizon: '60', title: 'Revisar desvios de orçamento por obra', detail: 'Definir responsáveis, plano de recuperação e frequência do acompanhamento.', owner: 'Orçamento + Operação' },
    { id: crypto.randomUUID(), horizon: '60', title: 'Consolidar indicadores e ritos de gestão', detail: 'Acordar fontes oficiais, cadência de publicação e fórum de decisão.', owner: 'Processos' },
    { id: crypto.randomUUID(), horizon: '60', title: 'Organizar contratos de apoio e estrutura da sede', detail: 'Mapear renovações, manutenção preventiva e custos recorrentes.', owner: 'Administrativo' }
  ]
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !Array.isArray(saved.tasks) || !Array.isArray(saved.dailyActions) || !Array.isArray(saved.focusItems)) return initialState;
    return { ...initialState, ...saved, keyData: { activeWorks: saved.keyData?.activeWorks || '', focus: saved.keyData?.focus || initialState.keyData.focus } };
  } catch {
    return initialState;
  }
}

let state = loadState();
const formatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function formatDate(value) {
  if (!value) return 'A definir';
  const [year, month, day] = value.split('-').map(Number);
  return formatter.format(new Date(year, month - 1, day)).replace('.', '');
}

function dueLabel(value) {
  if (!value) return 'Sem prazo';
  const [year, month, day] = value.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const difference = Math.round((target - today) / 86400000);
  if (difference < 0) return 'Atrasado';
  if (difference === 0) return 'Hoje';
  if (difference === 1) return 'Amanhã';
  return formatDate(value);
}

function persistState() {
  const saveState = document.querySelector('#saveState');
  const stateLabel = document.querySelector('.save-state');
  stateLabel.classList.add('saving');
  saveState.textContent = 'Salvando...';
  window.clearTimeout(saveTimeout);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    saveTimeout = window.setTimeout(() => {
      saveState.textContent = 'Salvo neste dispositivo';
      stateLabel.classList.remove('saving');
    }, 180);
  } catch {
    saveState.textContent = 'Falha ao salvar';
    stateLabel.classList.remove('saving');
    showToast('O armazenamento local está indisponível neste navegador.');
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove('visible'), 2600);
}

function renderKeyData() {
  const data = state.keyData;
  const fields = [
    ['Obras ativas', data.activeWorks ? `${data.activeWorks} obras` : 'A confirmar'],
    ['Foco da transição', data.focus || 'A definir']
  ];
  document.querySelector('#keyDataGrid').innerHTML = fields.map(([label, value]) => `<div class="key-field"><span>${label}</span><strong title="${escapeHTML(value)}">${escapeHTML(value)}</strong></div>`).join('');
}

function renderMetrics() {
  const total = state.tasks.length;
  const completed = state.tasks.filter(task => task.status === 'done').length;
  const percent = total ? Math.round(completed / total * 100) : 0;
  const inProgress = state.tasks.filter(task => task.status === 'progress').length;
  const toRequest = state.tasks.filter(task => task.status === 'request').length;
  const attention = state.focusItems.filter(item => item.horizon === '30').length;
  document.querySelector('#metricInProgress').textContent = inProgress;
  document.querySelector('#metricToRequest').textContent = toRequest;
  document.querySelector('#metricDone').innerHTML = `${percent}<span class="summary-suffix">%</span>`;
  document.querySelector('#completionBar').style.width = `${percent}%`;
  document.querySelector('#metricAttention').textContent = attention;
  document.querySelector('#attentionCount').textContent = attention;
  document.querySelector('#navOpenCount').textContent = inProgress + toRequest;
}

function renderBoard() {
  const selectedArea = document.querySelector('#areaFilter').value;
  const query = document.querySelector('#boardSearch').value.trim().toLocaleLowerCase('pt-BR');
  const board = document.querySelector('#kanbanBoard');
  board.innerHTML = statusColumns.map(column => {
    const tasks = state.tasks.filter(task => task.status === column.id && (selectedArea === 'all' || task.area === selectedArea) && `${task.title} ${task.area} ${task.detail}`.toLocaleLowerCase('pt-BR').includes(query));
    const cards = tasks.length ? tasks.map(task => `<article class="kanban-card" draggable="true" data-task-id="${escapeHTML(task.id)}"><div class="card-topline"><span class="area-tag">${escapeHTML(task.area)}</span><span class="priority ${task.priority}"><i></i>${task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}</span></div><h3>${escapeHTML(task.title)}</h3><p>${escapeHTML(task.detail || 'Sem detalhe registrado.')}</p><div class="card-footer"><span class="due-label ${dueLabel(task.due) === 'Atrasado' ? 'overdue' : ''}">${task.due ? `Prazo · ${dueLabel(task.due)}` : 'Sem prazo'}</span><div class="card-actions"><button type="button" data-action="details-task" data-id="${escapeHTML(task.id)}">Detalhes</button><button type="button" data-action="edit-task" data-id="${escapeHTML(task.id)}">Editar</button><select data-action="move-task" data-id="${escapeHTML(task.id)}" aria-label="Mover ${escapeHTML(task.title)}">${statusColumns.map(option => `<option value="${option.id}" ${task.status === option.id ? 'selected' : ''}>${option.label}</option>`).join('')}</select><button class="delete-task" type="button" data-action="delete-task" data-id="${escapeHTML(task.id)}">Excluir</button></div></div></article>`).join('') : '<div class="empty-column">Nenhum item nesta coluna.</div>';
    return `<section class="kanban-column" data-status="${column.id}"><div class="column-head"><i class="column-dot ${column.id}"></i><strong>${column.label}</strong><span class="column-count">${tasks.length}</span><button class="column-add" type="button" data-action="add-task" data-status="${column.id}" aria-label="Adicionar card em ${column.label}"><span aria-hidden="true">+</span> Card</button></div><div class="column-cards">${cards}</div></section>`;
  }).join('');
}

function renderAreas() {
  const areaGrid = document.querySelector('#areaGrid');
  areaGrid.innerHTML = areas.map((area, index) => {
    const tasks = state.tasks.filter(task => task.area === area.name);
    const receivedCount = tasks.filter(task => task.received).length;
    const checklist = tasks.length ? tasks.map(task => `<div class="handoff-row"><p class="handoff-title">${escapeHTML(task.title)}</p>${task.detail ? `<p class="handoff-detail">${escapeHTML(task.detail)}</p>` : ''}<div class="handoff-toggles"><label class="handoff-check outgoing"><input type="checkbox" data-action="check-handoff" data-field="requested" data-id="${escapeHTML(task.id)}" ${task.requested ? 'checked' : ''}><span>Solicitado ao gestor atual</span></label><label class="handoff-check"><input type="checkbox" data-action="check-handoff" data-field="received" data-id="${escapeHTML(task.id)}" ${task.received ? 'checked' : ''}><span>Entregue ao novo gestor</span></label></div></div>`).join('') : '<div class="no-area-items">Adicione um item de passagem para esta área.</div>';
    return `<article class="area-card"><header class="area-card-header"><div><h3>${String(index + 1).padStart(2, '0')} · ${escapeHTML(area.name)}</h3><p>${escapeHTML(area.description)}</p></div><span class="area-progress">${receivedCount}/${tasks.length || 0}</span></header><div class="area-checklist">${checklist}</div></article>`;
  }).join('');
}

function renderDaily() {
  const dailyList = document.querySelector('#dailyList');
  const actions = state.dailyActions;
  dailyList.innerHTML = actions.length ? actions.map(action => `<div class="daily-row ${action.done ? 'done' : ''}"><input class="daily-check" type="checkbox" data-action="toggle-daily" data-id="${escapeHTML(action.id)}" ${action.done ? 'checked' : ''} aria-label="Concluir ${escapeHTML(action.title)}"><div class="daily-row-copy"><strong>${escapeHTML(action.title)}</strong><small>${escapeHTML(action.owner || action.area || 'Sem responsável')} · ${escapeHTML(action.area || 'Geral')}</small></div><button class="daily-delete" type="button" data-action="delete-daily" data-id="${escapeHTML(action.id)}" aria-label="Remover ação">×</button></div>`).join('') : '<div class="empty-column">Nenhuma ação registrada para hoje.</div>';
  const completed = actions.filter(action => action.done).length;
  document.querySelector('#dailyProgressText').textContent = `${completed} de ${actions.length} concluídas`;
  document.querySelector('#dailyProgress').style.width = `${actions.length ? completed / actions.length * 100 : 0}%`;
}

function renderHorizons() {
  document.querySelector('#horizonGrid').innerHTML = ['30', '60'].map(horizon => {
    const items = state.focusItems.filter(item => item.horizon === horizon);
    const rows = items.length ? items.map(item => `<div class="focus-row"><i class="focus-flag"></i><div class="focus-copy"><strong>${escapeHTML(item.title)}</strong><p>${escapeHTML(item.detail || 'Contexto ainda não registrado.')}</p><div class="focus-meta"><span>${escapeHTML(item.owner || 'Responsável a definir')}</span><span class="focus-actions"><button type="button" data-action="edit-focus" data-id="${escapeHTML(item.id)}" aria-label="Editar ponto">Editar</button><button type="button" data-action="delete-focus" data-id="${escapeHTML(item.id)}" aria-label="Remover ponto">×</button></span></div></div></div>`).join('') : '<div class="empty-focus">Nenhum ponto registrado neste horizonte.</div>';
    return `<article class="horizon-card" data-horizon="${horizon}"><div class="horizon-card-head"><h3 class="horizon-title"><span class="horizon-badge">${horizon}d</span> Próximos ${horizon} dias</h3><span class="horizon-count">${items.length} pontos</span></div><div class="focus-list">${rows}</div></article>`;
  }).join('');
}

function renderAll() {
  renderKeyData();
  renderMetrics();
  renderBoard();
  renderAreas();
  renderDaily();
  renderHorizons();
}

function populateAreaSelects() {
  const options = areas.map(area => `<option value="${escapeHTML(area.name)}">${escapeHTML(area.name)}</option>`).join('');
  document.querySelector('#areaFilter').insertAdjacentHTML('beforeend', options);
  document.querySelector('#taskArea').innerHTML = options;
  document.querySelector('#actionArea').innerHTML = `<option value="Geral">Geral</option>${options}`;
}

function openEditor(mode, item = null, defaults = {}) {
  editorMode = mode;
  editTargetId = item?.id ?? null;
  editorForm.reset();
  document.querySelectorAll('.dialog-fields').forEach(fields => { fields.hidden = true; });
  const modeLabels = {
    task: ['PASSAGEM', item ? 'Editar item de passagem' : 'Novo item de passagem', 'taskFields'],
    data: ['CONTEXTO', 'Editar dados-chave', 'dataFields'],
    action: ['ROTINA DIÁRIA', item ? 'Editar ação do dia' : 'Adicionar ação', 'actionFields'],
    focus: ['RADAR', item ? 'Editar ponto de atenção' : 'Registrar ponto de atenção', 'focusFields']
  };
  const [kicker, title, fieldId] = modeLabels[mode];
  document.querySelector('#dialogKicker').textContent = kicker;
  document.querySelector('#dialogTitle').textContent = title;
  document.querySelector(`#${fieldId}`).hidden = false;

  if (mode === 'task') {
    if (item) {
      editorForm.elements.title.value = item.title;
      editorForm.elements.area.value = item.area;
      editorForm.elements.status.value = item.status;
      editorForm.elements.due.value = item.due || '';
      editorForm.elements.priority.value = item.priority;
      editorForm.elements.detail.value = item.detail || '';
    } else {
      editorForm.elements.status.value = defaults.status || 'request';
    }
  } else if (mode === 'data') {
    editorForm.elements.activeWorks.value = state.keyData.activeWorks || '';
    editorForm.elements.focus.value = state.keyData.focus || '';
  } else if (mode === 'action' && item) {
    editorForm.elements.actionTitle.value = item.title;
    editorForm.elements.actionOwner.value = item.owner || '';
    editorForm.elements.actionArea.value = item.area || 'Geral';
  } else if (mode === 'focus' && item) {
    editorForm.elements.focusTitle.value = item.title;
    editorForm.elements.horizon.value = item.horizon;
    editorForm.elements.focusOwner.value = item.owner || '';
    editorForm.elements.focusDetail.value = item.detail || '';
  }
  dialog.showModal();
  const firstInput = document.querySelector(`#${fieldId} input, #${fieldId} select`);
  firstInput?.focus({ preventScroll: true });
}

function openTaskDetails(task) {
  detailTargetId = task.id;
  document.querySelector('#detailTitle').textContent = task.title;
  const status = statusColumns.find(column => column.id === task.status)?.label || 'A solicitar';
  const priority = task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa';
  const facts = [['Área', task.area], ['Status', status], ['Prioridade', priority], ['Prazo', task.due ? formatDate(task.due) : 'Sem prazo']];
  document.querySelector('#detailFacts').innerHTML = facts.map(([label, value]) => `<div class="detail-fact"><span>${label}</span><strong>${escapeHTML(value)}</strong></div>`).join('');
  document.querySelector('#detailDescription').textContent = task.detail || 'Nenhum contexto ou informação adicional registrado.';
  detailDialog.showModal();
}

function closeTaskDetails() {
  if (detailDialog.open) detailDialog.close();
  detailTargetId = null;
}

function deleteTask(taskId) {
  const task = state.tasks.find(item => item.id === taskId);
  if (!task) return;
  state.tasks = state.tasks.filter(item => item.id !== task.id);
  closeTaskDetails();
  renderAll();
  persistState();
  showToast('Card excluído.');
}

function closeEditor() {
  if (dialog.open) dialog.close();
  editorForm.reset();
}

function saveTask(formData) {
  const title = String(formData.get('title') || '').trim();
  if (!title) return showToast('Informe o título do item.');
  const status = String(formData.get('status'));
  const values = {
    title,
    area: String(formData.get('area')),
    status,
    due: String(formData.get('due') || ''),
    priority: String(formData.get('priority')),
    detail: String(formData.get('detail') || '').trim(),
    requested: status !== 'request',
    received: status === 'done'
  };
  if (editTargetId) Object.assign(state.tasks.find(task => task.id === editTargetId), values);
  else state.tasks.unshift({ id: crypto.randomUUID(), ...values });
}

editorForm.addEventListener('submit', event => {
  event.preventDefault();
  const formData = new FormData(editorForm);
  if (editorMode === 'task') saveTask(formData);
  if (editorMode === 'data') {
    state.keyData = {
      activeWorks: String(formData.get('activeWorks') || '').trim(),
      focus: String(formData.get('focus') || '').trim()
    };
  }
  if (editorMode === 'action') {
    const title = String(formData.get('actionTitle') || '').trim();
    if (!title) return showToast('Informe a ação do dia.');
    const values = { title, owner: String(formData.get('actionOwner') || '').trim(), area: String(formData.get('actionArea') || 'Geral') };
    if (editTargetId) Object.assign(state.dailyActions.find(action => action.id === editTargetId), values);
    else state.dailyActions.unshift({ id: crypto.randomUUID(), ...values, done: false });
  }
  if (editorMode === 'focus') {
    const title = String(formData.get('focusTitle') || '').trim();
    if (!title) return showToast('Informe o ponto de atenção.');
    const values = { title, horizon: String(formData.get('horizon')), owner: String(formData.get('focusOwner') || '').trim(), detail: String(formData.get('focusDetail') || '').trim() };
    if (editTargetId) Object.assign(state.focusItems.find(item => item.id === editTargetId), values);
    else state.focusItems.unshift({ id: crypto.randomUUID(), ...values });
  }
  closeEditor();
  renderAll();
  persistState();
  showToast('Alterações atualizadas.');
});

function changeTaskStatus(taskId, status) {
  const task = state.tasks.find(item => item.id === taskId);
  if (!task) return;
  task.status = status;
  task.requested = status !== 'request';
  task.received = status === 'done';
  renderAll();
  persistState();
}

document.querySelector('#addTaskBtn').addEventListener('click', () => openEditor('task'));
document.querySelector('#editDataBtn').addEventListener('click', () => openEditor('data'));
document.querySelector('#addActionBtn').addEventListener('click', () => openEditor('action'));
document.querySelector('#addFocusBtn').addEventListener('click', () => openEditor('focus'));
document.querySelector('#closeDialog').addEventListener('click', closeEditor);
document.querySelector('#cancelDialog').addEventListener('click', closeEditor);
document.querySelector('#areaFilter').addEventListener('change', renderBoard);
document.querySelector('#boardSearch').addEventListener('input', renderBoard);

document.querySelector('#kanbanBoard').addEventListener('click', event => {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  if (control.dataset.action === 'add-task') {
    openEditor('task', null, { status: control.dataset.status });
    return;
  }
  const task = state.tasks.find(item => item.id === control.dataset.id);
  if (control.dataset.action === 'details-task' && task) openTaskDetails(task);
  if (control.dataset.action === 'edit-task' && task) openEditor('task', task);
  if (control.dataset.action === 'delete-task' && task) deleteTask(task.id);
});

document.querySelector('#closeDetail').addEventListener('click', closeTaskDetails);
document.querySelector('#cancelDetail').addEventListener('click', closeTaskDetails);
detailDialog.addEventListener('close', () => { detailTargetId = null; });
document.querySelector('#editDetail').addEventListener('click', () => {
  const task = state.tasks.find(item => item.id === detailTargetId);
  closeTaskDetails();
  if (task) openEditor('task', task);
});
document.querySelector('#deleteDetail').addEventListener('click', () => deleteTask(detailTargetId));

document.querySelector('#kanbanBoard').addEventListener('change', event => {
  if (event.target.dataset.action === 'move-task') changeTaskStatus(event.target.dataset.id, event.target.value);
});

document.querySelector('#kanbanBoard').addEventListener('dragstart', event => {
  const card = event.target.closest('.kanban-card');
  if (!card) return;
  dragTaskId = card.dataset.taskId;
  card.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', dragTaskId);
});

document.querySelector('#kanbanBoard').addEventListener('dragend', event => {
  event.target.closest('.kanban-card')?.classList.remove('dragging');
  document.querySelectorAll('.kanban-column').forEach(column => column.classList.remove('drag-over'));
});

document.querySelector('#kanbanBoard').addEventListener('dragover', event => {
  const column = event.target.closest('.kanban-column');
  if (!column) return;
  event.preventDefault();
  column.classList.add('drag-over');
});

document.querySelector('#kanbanBoard').addEventListener('dragleave', event => {
  if (!event.target.contains(event.relatedTarget)) event.target.closest('.kanban-column')?.classList.remove('drag-over');
});

document.querySelector('#kanbanBoard').addEventListener('drop', event => {
  const column = event.target.closest('.kanban-column');
  if (!column) return;
  event.preventDefault();
  const taskId = event.dataTransfer.getData('text/plain') || dragTaskId;
  dragTaskId = null;
  changeTaskStatus(taskId, column.dataset.status);
});

document.querySelector('#areaGrid').addEventListener('change', event => {
  if (event.target.dataset.action !== 'check-handoff') return;
  const task = state.tasks.find(item => item.id === event.target.dataset.id);
  if (!task) return;
  if (event.target.dataset.field === 'requested') {
    task.requested = event.target.checked;
    if (!event.target.checked) task.received = false;
  } else {
    task.received = event.target.checked;
    if (task.received) task.requested = true;
  }
  task.status = task.received ? 'done' : task.requested ? 'progress' : 'request';
  renderAll();
  persistState();
});

document.querySelector('#dailyList').addEventListener('change', event => {
  if (event.target.dataset.action !== 'toggle-daily') return;
  const action = state.dailyActions.find(item => item.id === event.target.dataset.id);
  if (!action) return;
  action.done = event.target.checked;
  renderDaily();
  persistState();
});

document.querySelector('#dailyList').addEventListener('click', event => {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const action = state.dailyActions.find(item => item.id === control.dataset.id);
  if (control.dataset.action === 'delete-daily' && action) {
    state.dailyActions = state.dailyActions.filter(item => item.id !== action.id);
    renderDaily(); persistState(); showToast('Ação removida.');
  }
});

document.querySelector('#horizonGrid').addEventListener('click', event => {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const item = state.focusItems.find(focus => focus.id === control.dataset.id);
  if (control.dataset.action === 'edit-focus' && item) openEditor('focus', item);
  if (control.dataset.action === 'delete-focus' && item) {
    state.focusItems = state.focusItems.filter(focus => focus.id !== item.id);
    renderAll(); persistState(); showToast('Ponto de atenção removido.');
  }
});

document.querySelector('#exportBtn').addEventListener('click', () => {
  const json = JSON.stringify({ exportedAt: new Date().toISOString(), company: 'CENA SC', ...state }, null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `cena-transicao-${localDateOffset(0)}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Cópia dos dados exportada em JSON.');
});

document.querySelectorAll('.side-nav .nav-link').forEach(link => link.addEventListener('click', () => {
  document.querySelectorAll('.side-nav .nav-link').forEach(item => item.classList.toggle('active', item === link));
}));

document.querySelector('#todayLabel').textContent = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date()).replace('.', '');
populateAreaSelects();
renderAll();
