// Connect to Socket.IO server
const socket = io(); 

// Chart instance
let sourceChart;

// Variáveis de controle para dados
let allData = [];
let filteredData = [];
let activeLeadsData = [];
let currentPage = 1;
const itemsPerPage = 10;
let searchTerm = '';

// Registrar o plugin de rótulos de dados
Chart.register(ChartDataLabels);

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

/**
 * Filtra os dados pelo intervalo de datas fornecido
 * @param {Array} data - Dados a serem filtrados
 * @param {string} startDateStr - Data inicial (YYYY-MM-DD)
 * @param {string} endDateStr - Data final (YYYY-MM-DD)
 * @returns {Array} - Dados filtrados
 */
function filterDataByDateRange(data, startDateStr, endDateStr) {
    // Se não houver datas ou dados, retornar dados originais
    if (!startDateStr || !endDateStr || !Array.isArray(data)) {
        console.log("Filtro não aplicado: datas ou dados inválidos");
        return data;
    }

    console.log(`Filtrando dados de ${startDateStr} até ${endDateStr}`);
    
    try {
        // Converter strings para objetos Date e normalizar para início/fim do dia
        const startDate = new Date(startDateStr);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(endDateStr);
        endDate.setHours(23, 59, 59, 999);
        
        // Verificar se as datas são válidas
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.error("Datas inválidas para filtro");
            return data;
        }
        
        // Filtrar os dados pelo intervalo de datas
        const filtered = data.filter(lead => {
            // Se não tiver data, excluir do resultado
            if (!lead.DataEntrada) return false;
            
            try {
                // Converter a data do lead para objeto Date
                const leadDate = new Date(lead.DataEntrada);
                
                // Verificar se a data é válida
                if (isNaN(leadDate.getTime())) return false;
                
                // Normalizar a hora do lead
                leadDate.setHours(0, 0, 0, 0);
                
                // Verificar se está no intervalo (inclusivo)
                return leadDate >= startDate && leadDate <= endDate;
            } catch (error) {
                console.error(`Erro ao processar data do lead: ${lead.DataEntrada}`, error);
                return false;
            }
        });
        
        console.log(`Filtro aplicado: ${filtered.length} de ${data.length} registros incluídos`);
        return filtered;
    } catch (error) {
        console.error("Erro ao aplicar filtro de datas:", error);
        return data;
    }
}

/**
 * Configura os seletores de data com valores mínimos e máximos
 * @param {Array} data - Dados para extrair intervalo de datas
 */
function initializeDatePickers(data) {
    if (!Array.isArray(data) || data.length === 0) {
        console.warn("Dados insuficientes para inicializar os seletores de data");
        return;
    }
    
    try {
        // Extrair datas válidas dos dados
        const validDates = data
            .map(lead => lead.DataEntrada ? new Date(lead.DataEntrada) : null)
            .filter(date => date !== null && !isNaN(date.getTime()))
            .sort((a, b) => a - b);
        
        if (validDates.length === 0) {
            console.warn("Nenhuma data válida encontrada nos dados");
            return;
        }
        
        const startDatePicker = document.getElementById('start-date-picker');
        const endDatePicker = document.getElementById('end-date-picker');
        
        // Formato YYYY-MM-DD para HTML input type="date"
        const minDate = validDates[0].toISOString().split('T')[0];
        const maxDate = validDates[validDates.length - 1].toISOString().split('T')[0];
        
        // Configurar limites e valores iniciais
        startDatePicker.min = minDate;
        startDatePicker.max = maxDate;
        startDatePicker.value = minDate;
        
        endDatePicker.min = minDate;
        endDatePicker.max = maxDate; 
        endDatePicker.value = maxDate;
        
        console.log(`Seletores de data inicializados: de ${minDate} até ${maxDate}`);
    } catch (error) {
        console.error("Erro ao inicializar seletores de data:", error);
    }
}

/**
 * Aplica o filtro de intervalo de datas e atualiza o dashboard
 */
function applyDateRange() {
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
        
        // Filtrar dados pelo intervalo
        filteredData = filterDataByDateRange(allData, startDate, endDate);
        
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

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Inicializar o gráfico
        initializeChart();
        
        // Recuperar e aplicar o tema salvo
        const savedTheme = localStorage.getItem('preferredTheme');
        if (savedTheme) {
            applyTheme(savedTheme);
        }
        
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
        
        console.log("Inicialização da página concluída");
    } catch (error) {
        console.error("Erro na inicialização da página:", error);
    }
});

// Socket.IO event handlers
socket.on('initial-data', (data) => {
    try {
        console.log(`Dados recebidos: ${data.length} registros`);
        
        // Armazenar dados completos
        allData = Array.isArray(data) ? [...data] : [];
        
        // Inicializar os seletores de data
        initializeDatePickers(allData);
        
        // Verificar se existem preferências de intervalo salvas
        const savedStartDate = localStorage.getItem('preferredStartDate');
        const savedEndDate = localStorage.getItem('preferredEndDate');
        
        if (savedStartDate && savedEndDate) {
            // Restaurar preferências salvas
            const startDatePicker = document.getElementById('start-date-picker');
            const endDatePicker = document.getElementById('end-date-picker');
            
            // Verificar se as datas salvas estão dentro do intervalo válido
            if (startDatePicker.min <= savedStartDate && savedStartDate <= startDatePicker.max &&
                endDatePicker.min <= savedEndDate && savedEndDate <= endDatePicker.max) {
                
                startDatePicker.value = savedStartDate;
                endDatePicker.value = savedEndDate;
                
                // Aplicar o filtro salvo
                filteredData = filterDataByDateRange(allData, savedStartDate, savedEndDate);
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
    } catch (error) {
        console.error("Erro ao processar dados iniciais:", error);
    }
});

socket.on('data-update', (data) => {
    try {
        console.log(`Atualização de dados: ${data.length} registros`);
        
        // Atualizar dados completos
        allData = Array.isArray(data) ? [...data] : [];
        
        // Recuperar configurações de filtro atuais
        const startDatePicker = document.getElementById('start-date-picker');
        const endDatePicker = document.getElementById('end-date-picker');
        
        if (startDatePicker.value && endDatePicker.value) {
            // Reaplicar o filtro com os novos dados
            filteredData = filterDataByDateRange(allData, startDatePicker.value, endDatePicker.value);
            console.log(`Filtro reaplicado após atualização: ${filteredData.length} registros`);
        } else {
            // Sem filtro, usar todos os dados
            filteredData = [...allData];
            console.log("Usando todos os dados após atualização");
        }
        
        // Atualizar o dashboard
        updateDashboard(filteredData);
    } catch (error) {
        console.error("Erro ao processar atualização de dados:", error);
    }
});