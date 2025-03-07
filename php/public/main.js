// Variáveis de controle para dados
let allData = [];
let filteredData = [];
let activeLeadsData = [];
let currentPage = 1;
const itemsPerPage = 10;
let searchTerm = '';
let lastModifiedTimestamp = 0;

// Chart instance
let sourceChart;

// Registrar o plugin de rótulos de dados
Chart.register(ChartDataLabels);

/**
 * Mostra o indicador de carregamento
 */
function showLoading() {
    // Remover eventual loading anterior
    hideLoading();
    
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    
    const message = document.createElement('span');
    message.textContent = 'Carregando...';
    
    overlay.appendChild(spinner);
    overlay.appendChild(message);
    document.body.appendChild(overlay);
}

/**
 * Esconde o indicador de carregamento
 */
function hideLoading() {
    const existing = document.querySelector('.loading-overlay');
    if (existing) {
        existing.remove();
    }
}

/**
 * Carrega dados do servidor PHP
 */
async function loadData(startDate = null, endDate = null) {
    showLoading();
    
    try {
        let url = '../include/process_csv.php?action=get_data';
        
        if (startDate && endDate) {
            url += `&start_date=${startDate}&end_date=${endDate}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Atualizar timestamp para checagem de atualizações
        const modifiedResponse = await fetch('../include/process_csv.php?action=check_update');
        const modifiedData = await modifiedResponse.json();
        lastModifiedTimestamp = modifiedData.last_modified;
        
        return data;
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        return [];
    } finally {
        hideLoading();
    }
}

/**
 * Carrega o intervalo de datas disponíveis
 */
async function loadDateRange() {
    try {
        const response = await fetch('../include/process_csv.php?action=get_date_range');
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Erro ao carregar intervalo de datas:', error);
        return { min_date: null, max_date: null };
    }
}

/**
 * Configura os seletores de data com valores mínimos e máximos
 */
async function initializeDatePickers() {
    try {
        const { min_date, max_date } = await loadDateRange();
        
        if (!min_date || !max_date) {
            console.warn("Nenhuma data válida encontrada nos dados");
            return;
        }
        
        const startDatePicker = document.getElementById('start-date-picker');
        const endDatePicker = document.getElementById('end-date-picker');
        
        // Configurar limites e valores iniciais
        startDatePicker.min = min_date;
        startDatePicker.max = max_date;
        startDatePicker.value = min_date;
        
        endDatePicker.min = min_date;
        endDatePicker.max = max_date; 
        endDatePicker.value = max_date;
        
        console.log(`Seletores de data inicializados: de ${min_date} até ${max_date}`);
        
        // Atualizar a exibição do intervalo
        updateDateRangeDisplay(min_date, max_date);
    } catch (error) {
        console.error("Erro ao inicializar seletores de data:", error);
    }
}

/**
 * Aplica o filtro de intervalo de datas e atualiza o dashboard
 */
async function applyDateRange() {
    try {
        const startDatePicker = document.getElementById('start-date-picker');
        const endDatePicker = document.getElementById('end-date-picker');
        
        const startDate = startDatePicker.value;
        const endDate = endDatePicker.value;
        
        if (!startDate || !endDate) {
            console.warn("Datas não selecionadas");
            return;
        }
        
        // Verificar se a data inicial é anterior à data final
        if (new Date(startDate) > new Date(endDate)) {
            alert("A data inicial deve ser anterior ou igual à data final");
            return;
        }
        
        // Salvar preferências no localStorage
        localStorage.setItem('preferredStartDate', startDate);
        localStorage.setItem('preferredEndDate', endDate);
        
        console.log(`Aplicando filtro: de ${startDate} até ${endDate}`);
        
        // Carregar dados filtrados diretamente do servidor
        filteredData = await loadData(startDate, endDate);
        
        // Atualizar o dashboard com os dados filtrados
        updateDashboard(filteredData);
        
        // Atualizar exibição do intervalo
        updateDateRangeDisplay(startDate, endDate);
        
        console.log(`Filtro aplicado: ${filteredData.length} registros`);
    } catch (error) {
        console.error("Erro ao aplicar filtro de datas:", error);
    }
}

/**
 * Atualiza a exibição do intervalo de datas no dashboard
 */
function updateDateRangeDisplay(startDate, endDate) {
    try {
        const formatDate = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR');
        };
        
        const formattedStart = formatDate(startDate);
        const formattedEnd = formatDate(endDate);
        
        // Atualizar o texto do intervalo
        document.getElementById('current-date').textContent = `${formattedStart} - ${formattedEnd}`;
        
        console.log(`Exibição de datas atualizada: ${formattedStart} - ${formattedEnd}`);
    } catch (error) {
        console.error("Erro ao atualizar exibição de datas:", error);
    }
}

// Função para alternar o tema entre claro e escuro
function toggleTheme() {
    const html = document.documentElement;
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');
    
    // Alterna o tema atual
    const newTheme = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    
    // Salva a preferência do usuário no localStorage
    localStorage.setItem('preferredTheme', newTheme);
    
    // Aplica o tema
    applyTheme(newTheme);
}

// Função para aplicar um tema específico
function applyTheme(theme) {
    const html = document.documentElement;
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');
    
    html.setAttribute('data-theme', theme);
    
    if (theme === 'dark') {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
        themeText.textContent = 'Modo Claro';
        applyDarkTheme();
    } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
        themeText.textContent = 'Modo Escuro';
        applyLightTheme();
    }
    
    // Atualizar o gráfico com as novas cores do tema
    if (sourceChart) {
        sourceChart.update();
    }
}

// Aplicar tema claro ao gráfico
function applyLightTheme() {
    document.body.classList.remove('dark-theme');
    if (sourceChart) {
        sourceChart.options.plugins.datalabels.color = '#000';
        sourceChart.options.scales.x.grid.color = 'rgba(0, 0, 0, 0.1)';
        sourceChart.options.scales.y.grid.color = 'rgba(0, 0, 0, 0.1)';
        sourceChart.options.scales.x.ticks.color = '#666';
        sourceChart.options.scales.y.ticks.color = '#666';
    }
}

// Aplicar tema escuro ao gráfico
function applyDarkTheme() {
    document.body.classList.add('dark-theme');
    if (sourceChart) {
        sourceChart.options.plugins.datalabels.color = '#fff';
        sourceChart.options.scales.x.grid.color = 'rgba(255, 255, 255, 0.1)';
        sourceChart.options.scales.y.grid.color = 'rgba(255, 255, 255, 0.1)';
        sourceChart.options.scales.x.ticks.color = '#ccc';
        sourceChart.options.scales.y.ticks.color = '#ccc';
    }
}

// Initialize chart
function initializeChart() {
    // Origem Chart (Gráfico de barras)
    const sourceCtx = document.getElementById('sourceChart').getContext('2d');
    sourceChart = new Chart(sourceCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Leads por Origem',
                data: [],
                backgroundColor: '#0d6efd',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',  // Gráfico horizontal
            scales: {
                x: {
                    beginAtZero: true
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.chart.data.datasets[0].data.reduce((sum, val) => sum + val, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${value} leads (${percentage}%)`;
                        }
                    }
                },
                datalabels: {
                    color: '#000',
                    anchor: 'end',
                    align: 'end',
                    formatter: function(value, context) {
                        const total = context.chart.data.datasets[0].data.reduce((sum, val) => sum + val, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${value} (${percentage}%)`;
                    }
                }
            }
        }
    });
}

/**
 * Atualiza a tabela de leads ativos com os dados filtrados
 */
function updateActiveLeadsTable(data) {
    try {
        // Filtrar apenas leads ativos
        activeLeadsData = data.filter(lead => lead.Triagem !== 'DESCARTADOS');
        
        // Aplicar filtro de busca se existir
        if (searchTerm) {
            const term = searchTerm.toLowerCase().trim();
            activeLeadsData = activeLeadsData.filter(lead => {
                return (
                    (lead.Id && lead.Id.toLowerCase().includes(term)) ||
                    (lead.DataEntrada && lead.DataEntrada.toLowerCase().includes(term)) ||
                    (lead.Usuario_Atual && lead.Usuario_Atual.toLowerCase().includes(term)) ||
                    (lead.Status && lead.Status.toLowerCase().includes(term)) ||
                    (lead.VeiculoNome && lead.VeiculoNome.toLowerCase().includes(term)) ||
                    (lead.CanalNome && lead.CanalNome.toLowerCase().includes(term))
                );
            });
        }
        
        // Ordenar por data (mais recente primeiro)
        activeLeadsData.sort((a, b) => {
            return new Date(b.DataEntrada) - new Date(a.DataEntrada);
        });
        
        // Resetar para a primeira página quando os dados mudam
        currentPage = 1;
        
        // Atualizar contador
        document.getElementById('active-leads-showing').textContent = 
            `Mostrando ${Math.min(itemsPerPage, activeLeadsData.length)} de ${activeLeadsData.length} leads ativos`;
        
        // Renderizar a tabela
        renderLeadsPage();
        
        console.log(`Tabela de leads atualizada: ${activeLeadsData.length} leads ativos`);
    } catch (error) {
        console.error("Erro ao atualizar tabela de leads:", error);
    }
}

// Função para renderizar a página atual de leads
function renderLeadsPage() {
    const table = document.getElementById('activeLeadsTable').querySelector('tbody');
    table.innerHTML = '';
    
    // Calcula o intervalo de itens para a página atual
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = activeLeadsData.slice(startIndex, endIndex);
    
    // Cria as linhas da tabela
    pageData.forEach(lead => {
        const row = document.createElement('tr');
        
        // Formata a data
        const dateStr = lead.DataEntrada ? new Date(lead.DataEntrada).toLocaleDateString('pt-BR') : '-';
        
        // Prepara os dados para a linha
        row.innerHTML = `
            <td>${lead.Id || '-'}</td>
            <td>${dateStr}</td>
            <td>${lead.Usuario_Atual || '-'}</td>
            <td>${lead.Status || '-'}</td>
            <td>${lead.VeiculoNome || 'Indefinida'}</td>
            <td>${lead.CanalNome || '-'}</td>
        `;
        
        table.appendChild(row);
    });
    
    // Atualiza estado dos botões de paginação
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    
    prevButton.disabled = currentPage === 1;
    nextButton.disabled = endIndex >= activeLeadsData.length;
}

/**
 * Atualiza todo o dashboard com os dados filtrados
 */
function updateDashboard(data) {
    try {
        if (!Array.isArray(data)) {
            console.error("Dados inválidos para atualização do dashboard");
            return;
        }
        
        // Atualizar contadores
        document.getElementById('totalLeads').textContent = data.length;
        
        const activeLeads = data.filter(lead => lead.Triagem !== 'DESCARTADOS').length;
        document.getElementById('activeLeads').textContent = activeLeads;
        
        const discardedLeads = data.filter(lead => lead.Triagem === 'DESCARTADOS').length;
        document.getElementById('discardedLeads').textContent = discardedLeads;
        
        // Processar dados para o gráfico de origem
        const sourceGroups = {};
        data.forEach(lead => {
            const source = (lead.VeiculoNome && lead.VeiculoNome.trim()) ? lead.VeiculoNome.trim() : 'Indefinida';
            sourceGroups[source] = (sourceGroups[source] || 0) + 1;
        });
        
        // Ordenar por contagem (maior para menor)
        const sortedSources = Object.entries(sourceGroups).sort(([,a], [,b]) => b - a);
        
        // Atualizar o gráfico
        if (sourceChart) {
            sourceChart.data.labels = sortedSources.map(([key]) => key);
            sourceChart.data.datasets[0].data = sortedSources.map(([,value]) => value);
            
            // Aplicar cores diferentes para cada barra
            sourceChart.data.datasets[0].backgroundColor = sortedSources.map((_, index) => 
                `hsl(${(index * 25) % 360}, 70%, 50%)`
            );
            
            sourceChart.update();
        }
        
        // Atualizar a tabela de leads ativos
        updateActiveLeadsTable(data);
        
        console.log("Dashboard atualizado com sucesso");
    } catch (error) {
        console.error("Erro ao atualizar dashboard:", error);
    }
}

/**
 * Verifica se o arquivo CSV foi atualizado
 */
async function checkForUpdates() {
    try {
        const response = await fetch(`../include/process_csv.php?action=check_update&last_modified=${lastModifiedTimestamp}`);
        const data = await response.json();
        
        if (data.changed) {
            console.log('CSV atualizado. Recarregando dados...');
            lastModifiedTimestamp = data.last_modified;
            
            // Recarregar dados com o mesmo filtro atual
            const startDatePicker = document.getElementById('start-date-picker');
            const endDatePicker = document.getElementById('end-date-picker');
            
            if (startDatePicker.value && endDatePicker.value) {
                filteredData = await loadData(startDatePicker.value, endDatePicker.value);
            } else {
                filteredData = await loadData();
            }
            
            updateDashboard(filteredData);
        }
    } catch (error) {
        console.error('Erro ao verificar atualizações:', error);
    }
}

// Funções para filtros rápidos
let currentWeekDate = new Date();
let currentMonthDate = new Date();
let currentYearDate = new Date();

function setDateFilter(startDate, endDate) {
    const startDatePicker = document.getElementById('start-date-picker');
    const endDatePicker = document.getElementById('end-date-picker');
    
    try {
        // Formatar as datas para o formato YYYY-MM-DD
        const formatDate = (date) => {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const formattedStartDate = formatDate(startDate);
        const formattedEndDate = formatDate(endDate);
        
        console.log(`Definindo período: ${formattedStartDate} até ${formattedEndDate}`);
        
        startDatePicker.value = formattedStartDate;
        endDatePicker.value = formattedEndDate;
        
        // Chamar diretamente a função
        applyDateRange();
    } catch (error) {
        console.error("Erro ao definir filtro de data:", error);
    }
}

function setWeekFilter(referenceDate = new Date()) {
    try {
        console.log(`Filtro de semana com referência: ${referenceDate}`);
        currentWeekDate = new Date(referenceDate);
        
        const startOfWeek = new Date(currentWeekDate);
        // Ajustar para segunda-feira (1 = segunda, 0 = domingo)
        const dayOfWeek = startOfWeek.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Se domingo, volta 6 dias, senão voltar (dayOfWeek - 1) dias
        startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        // Adicionar 6 dias para chegar ao domingo
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        
        console.log(`Semana (segunda a domingo): ${startOfWeek.toLocaleDateString()} até ${endOfWeek.toLocaleDateString()}`);
        
        setDateFilter(startOfWeek, endOfWeek);
    } catch (error) {
        console.error("Erro ao aplicar filtro de semana:", error);
    }
}

function setMonthFilter(referenceDate = new Date()) {
    try {
        console.log(`Filtro de mês com referência: ${referenceDate}`);
        currentMonthDate = new Date(referenceDate);
        
        // Primeiro dia do mês
        const startOfMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        // Último dia do mês (dia 0 do próximo mês é o último dia do mês atual)
        const endOfMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        
        console.log(`Mês: ${startOfMonth.toLocaleDateString()} até ${endOfMonth.toLocaleDateString()}`);
        
        setDateFilter(startOfMonth, endOfMonth);
    } catch (error) {
        console.error("Erro ao aplicar filtro de mês:", error);
    }
}

function setYearFilter(referenceDate = new Date()) {
    try {
        console.log(`Filtro de ano com referência: ${referenceDate}`);
        currentYearDate = new Date(referenceDate);
        
        // Primeiro dia do ano (1º de janeiro)
        const startOfYear = new Date(currentYearDate.getFullYear(), 0, 1);
        startOfYear.setHours(0, 0, 0, 0);
        
        // Último dia do ano (31 de dezembro)
        const endOfYear = new Date(currentYearDate.getFullYear(), 11, 31);
        endOfYear.setHours(23, 59, 59, 999);
        
        console.log(`Ano: ${startOfYear.toLocaleDateString()} até ${endOfYear.toLocaleDateString()}`);
        
        setDateFilter(startOfYear, endOfYear);
    } catch (error) {
        console.error("Erro ao aplicar filtro de ano:", error);
    }
}

function prevWeek() {
    currentWeekDate.setDate(currentWeekDate.getDate() - 7);
    setWeekFilter(currentWeekDate);
}

function nextWeek() {
    currentWeekDate.setDate(currentWeekDate.getDate() + 7);
    setWeekFilter(currentWeekDate);
}

function prevMonth() {
    currentMonthDate.setMonth(currentMonthDate.getMonth() - 1);
    setMonthFilter(currentMonthDate);
}

function nextMonth() {
    currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
    setMonthFilter(currentMonthDate);
}

function prevYear() {
    currentYearDate.setFullYear(currentYearDate.getFullYear() - 1);
    setYearFilter(currentYearDate);
}

function nextYear() {
    currentYearDate.setFullYear(currentYearDate.getFullYear() + 1);
    setYearFilter(currentYearDate);
}

function clearFilter() {
    const startDatePicker = document.getElementById('start-date-picker');
    const endDatePicker = document.getElementById('end-date-picker');
    
    startDatePicker.value = startDatePicker.min;
    endDatePicker.value = endDatePicker.max;
    
    applyDateRange();
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Inicializar o gráfico
        initializeChart();
        
        // Recuperar e aplicar o tema salvo
        const savedTheme = localStorage.getItem('preferredTheme');
        if (savedTheme) {
            applyTheme(savedTheme);
        }
        
        // Inicializar seletores de data
        await initializeDatePickers();
        
        // Carregar dados iniciais
        allData = await loadData();
        
        // Verificar se existem preferências de intervalo salvas
        const savedStartDate = localStorage.getItem('preferredStartDate');
        const savedEndDate = localStorage.getItem('preferredEndDate');
        
        if (savedStartDate && savedEndDate) {
            const startDatePicker = document.getElementById('start-date-picker');
            const endDatePicker = document.getElementById('end-date-picker');
            
            // Verificar se as datas salvas estão dentro do intervalo válido
            if (startDatePicker.min <= savedStartDate && savedStartDate <= startDatePicker.max &&
                endDatePicker.min <= savedEndDate && savedEndDate <= endDatePicker.max) {
                
                startDatePicker.value = savedStartDate;
                endDatePicker.value = savedEndDate;
                
                // Carregar dados filtrados
                filteredData = await loadData(savedStartDate, savedEndDate);
                updateDateRangeDisplay(savedStartDate, savedEndDate);
                
                console.log(`Filtro restaurado: de ${savedStartDate} até ${savedEndDate}`);
            } else {
                // Usar intervalo completo se as datas salvas estiverem fora do intervalo válido
                filteredData = [...allData];
                updateDateRangeDisplay(startDatePicker.value, endDatePicker.value);
                
                console.log("Preferências de data ignoradas: fora do intervalo válido");
            }
        } else {
            // Inicializar com todos os dados
            filteredData = [...allData];
            
            // Mostrar intervalo completo
            const startDatePicker = document.getElementById('start-date-picker');
            const endDatePicker = document.getElementById('end-date-picker');
            updateDateRangeDisplay(startDatePicker.value, endDatePicker.value);
            
            console.log("Nenhuma preferência de data encontrada, usando intervalo completo");
        }
        
        // Atualizar o dashboard
        updateDashboard(filteredData);
        
        // Adicionar listeners
        document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
        document.getElementById('apply-date-range').addEventListener('click', applyDateRange);
        
        document.getElementById('prev-page').addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                renderLeadsPage();
            }
        });
        
        document.getElementById('next-page').addEventListener('click', function() {
            if (currentPage * itemsPerPage < activeLeadsData.length) {
                currentPage++;
                renderLeadsPage();
            }
        });
        
        document.getElementById('search-leads').addEventListener('input', function(e) {
            searchTerm = e.target.value;
            currentPage = 1;
            updateActiveLeadsTable(filteredData);
        });
        
        // Adicionar validação para garantir que a data final não seja anterior à data inicial
        document.getElementById('start-date-picker').addEventListener('change', function(e) {
            const endDatePicker = document.getElementById('end-date-picker');
            if (e.target.value > endDatePicker.value) {
                endDatePicker.value = e.target.value;
            }
        });
        
        document.getElementById('end-date-picker').addEventListener('change', function(e) {
            const startDatePicker = document.getElementById('start-date-picker');
            if (e.target.value < startDatePicker.value) {
                startDatePicker.value = e.target.value;
            }
        });
        
        // Adicionar listeners para os novos botões
        document.getElementById('week-filter').addEventListener('click', function() {
            console.log('Botão Esta Semana clicado');
            setWeekFilter();
        });
        document.getElementById('month-filter').addEventListener('click', function() {
            console.log('Botão Este Mês clicado');
            setMonthFilter();
        });
        document.getElementById('year-filter').addEventListener('click', function() {
            console.log('Botão Este Ano clicado');
            setYearFilter();
        });
        document.getElementById('clear-filter').addEventListener('click', function() {
            console.log('Botão Limpar clicado');
            clearFilter();
        });
        document.getElementById('prev-week').addEventListener('click', function() {
            console.log('Botão Retroceder Semana clicado');
            prevWeek();
        });
        document.getElementById('next-week').addEventListener('click', function() {
            console.log('Botão Avançar Semana clicado');
            nextWeek();
        });
        document.getElementById('prev-month').addEventListener('click', function() {
            console.log('Botão Retroceder Mês clicado');
            prevMonth();
        });
        document.getElementById('next-month').addEventListener('click', function() {
            console.log('Botão Avançar Mês clicado');
            nextMonth();
        });
        document.getElementById('prev-year').addEventListener('click', function() {
            console.log('Botão Retroceder Ano clicado');
            prevYear();
        });
        document.getElementById('next-year').addEventListener('click', function() {
            console.log('Botão Avançar Ano clicado');
            nextYear();
        });
        
        // Iniciar verificação periódica de atualizações (a cada 30 segundos)
        setInterval(checkForUpdates, 30000);
        
        console.log("Inicialização da página concluída");
    } catch (error) {
        console.error("Erro na inicialização da página:", error);
        hideLoading();
    }
});