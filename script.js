const form = document.getElementById('form');
const transacoes = document.getElementById('transacoes');
const saldo = document.getElementById('saldo');
const tipoSelect = document.getElementById('tipo');
const categoriaSelect = document.getElementById('categoria');
const finalizeMonthBtn = document.getElementById('finalize-month');

let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let total = transactions.reduce((acc, t) => acc + (t.tipo === 'entrada' ? t.valor : -t.valor), 0);

// Configuração do gráfico
const ctx = document.getElementById('expenseChart').getContext('2d');
const expenseChart = new Chart(ctx, {
  type: 'pie',
  data: {
    labels: ['Saúde', 'Lazer', 'Alimentação', 'Transporte', 'Outros'],
    datasets: [{
      data: [0, 0, 0, 0, 0],
      backgroundColor: ['#e74c3c', '#2ecc71', '#3498db', '#f1c40f', '#95a5a6']
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#e0e0e0' } },
      tooltip: {
        callbacks: {
          label: context => `${context.label}: R$ ${context.raw.toFixed(2).replace('.', ',')}`
        }
      }
    }
  }
});

// Removida a inicialização do EmailJS aqui, já que está no index.html
// emailjs.init('kPLFHY3nTlD_QXygv');

function formatCurrency(value) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function getCurrentDate() {
  const now = new Date();
  return now.toISOString().split('T')[0]; // Formato YYYY-MM-DD
}

function getCurrentMonth() {
  const now = new Date();
  return now.toISOString().slice(0, 7); // Formato YYYY-MM
}

function getCurrentTime() {
  const now = new Date();
  return now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }); // Exemplo: 09/05/2025 17:25
}

function updateSaldo() {
  total = transactions.reduce((acc, t) => acc + (t.tipo === 'entrada' ? t.valor : -t.valor), 0);
  saldo.textContent = formatCurrency(total);
}

function updateChart() {
  const categories = ['saude', 'lazer', 'alimentacao', 'transporte', 'outros'];
  const data = categories.map(cat =>
    transactions
      .filter(t => t.tipo === 'saida' && t.categoria === cat)
      .reduce((sum, t) => sum + t.valor, 0)
  );
  expenseChart.data.datasets[0].data = data;
  expenseChart.update();
}

function saveTransactions() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

function renderTransactions() {
  transacoes.innerHTML = '';
  transactions.forEach((t, index) => {
    const li = document.createElement('li');
    li.className = t.tipo;
    li.innerHTML = `
      ${t.descricao} - ${formatCurrency(t.valor)} (${t.data})
      <button class="delete-btn" onclick="deleteTransaction(${index})">Excluir</button>
    `;
    transacoes.appendChild(li);
  });
}

function deleteTransaction(index) {
  transactions.splice(index, 1);
  saveTransactions();
  renderTransactions();
  updateSaldo();
  updateChart();
}

function generateReport(month) {
  const monthTransactions = transactions.filter(t => t.data.startsWith(month));
  const totalEntradas = monthTransactions
    .filter(t => t.tipo === 'entrada')
    .reduce((sum, t) => sum + t.valor, 0);
  const totalSaidas = monthTransactions
    .filter(t => t.tipo === 'saida')
    .reduce((sum, t) => sum + t.valor, 0);
  const saldoFinal = totalEntradas - totalSaidas;

  // Relatório em texto simples para compatibilidade com EmailJS
  let report = `Relatório Financeiro - ${month}\n\n`;
  report += `Entradas: ${formatCurrency(totalEntradas)}\n`;
  report += `Saídas: ${formatCurrency(totalSaidas)}\n`;
  report += `Saldo: ${formatCurrency(saldoFinal)}\n\n`;
  report += `Transações:\n`;
  monthTransactions.forEach(t => {
    report += `- ${t.data} - ${t.descricao} - ${formatCurrency(t.valor)} (${t.tipo}${t.categoria ? ', ' + t.categoria : ''})\n`;
  });

  return report;
}

function generateChartSummary() {
  const categories = ['saude', 'lazer', 'alimentacao', 'transporte', 'outros'];
  const labels = ['Saúde', 'Lazer', 'Alimentação', 'Transporte', 'Outros'];
  const data = categories.map(cat =>
    transactions
      .filter(t => t.tipo === 'saida' && t.categoria === cat)
      .reduce((sum, t) => sum + t.valor, 0)
  );

  let summary = `Resumo do Gráfico de Gastos por Categoria:\n`;
  data.forEach((value, index) => {
    if (value > 0) {
      summary += `- ${labels[index]}: ${formatCurrency(value)}\n`;
    }
  });
  return summary;
}

function sendReport() {
  const month = getCurrentMonth();
  const report = generateReport(month);
  const chartSummary = generateChartSummary();
  const time = getCurrentTime();

  // Concatenar todas as informações no campo "message"
  const messageContent = `Relatório do Mês: ${month}\n\n${report}\n\n${chartSummary}`;

  // Depuração detalhada
  console.log('--- Início do Envio de Email ---');
  console.log('Service ID:', 'service_8nxu4e7');
  console.log('Template ID:', 'template_pk2r2fb');
  console.log('Parâmetros Enviados:', {
    name: 'Usuário',
    email: 'nicolassantossilva2458@gmail.com',
    message: messageContent,
    time: time
  });

  emailjs.send('service_8nxu4e7', 'template_pk2r2fb', {
    name: 'Usuário',
    email: 'nicolassantossilva2458@gmail.com',
    message: messageContent,
    time: time
  }).then((response) => {
    console.log('Sucesso:', response.status, response.text);
    console.log('--- Fim do Envio de Email ---');
    alert('Relatório enviado com sucesso!');
    transactions = transactions.filter(t => !t.data.startsWith(month));
    saveTransactions();
    renderTransactions();
    updateSaldo();
    updateChart();
  }).catch(error => {
    console.error('Erro ao enviar relatório:', error);
    console.log('--- Fim do Envio de Email (com erro) ---');
    alert('Erro ao enviar relatório: ' + (error.text || error.message));
  });
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const descricao = document.getElementById('descricao').value.trim();
  const valor = parseFloat(document.getElementById('valor').value);
  const tipo = tipoSelect.value;
  const categoria = categoriaSelect.value;

  if (!descricao || isNaN(valor) || (tipo === 'saida' && !categoria)) {
    alert('Preencha todos os campos corretamente!');
    return;
  }

  const novaTransacao = {
    descricao,
    valor,
    tipo,
    data: getCurrentDate()
  };
  if (tipo === 'saida') {
    novaTransacao.categoria = categoria;
  }

  transactions.push(novaTransacao);
  saveTransactions();
  renderTransactions();
  updateSaldo();
  updateChart();

  form.reset();
  categoriaSelect.disabled = true;
});

tipoSelect.addEventListener('change', () => {
  categoriaSelect.disabled = tipoSelect.value !== 'saida';
});

finalizeMonthBtn.addEventListener('click', () => {
  if (confirm('Deseja finalizar o mês e enviar o relatório?')) {
    sendReport();
  }
});

// Inicializar
renderTransactions();
updateSaldo();
updateChart();