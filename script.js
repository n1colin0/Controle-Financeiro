const form = document.getElementById('form');
const transacoes = document.getElementById('transacoes');
const saldo = document.getElementById('saldo');
const tipoSelect = document.getElementById('tipo');
const categoriaSelect = document.getElementById('categoria');
const generateReportBtn = document.getElementById('generate-report');

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
          label: function(context) {
            const value = context.raw;
            const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(2) : 0;
            return `${context.label}: R$ ${value.toFixed(2).replace('.', ',')} (${percentage}%)`;
          }
        }
      }
    }
  }
});

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

  return {
    summary: {
      entradas: totalEntradas,
      saidas: totalSaidas,
      saldo: saldoFinal
    },
    transactions: monthTransactions
  };
}

function generateChartSummary(month) {
  const categories = ['saude', 'lazer', 'alimentacao', 'transporte', 'outros'];
  const labels = ['Saúde', 'Lazer', 'Alimentação', 'Transporte', 'Outros'];
  const monthTransactions = transactions.filter(t => t.data.startsWith(month));
  const totalSaidas = monthTransactions
    .filter(t => t.tipo === 'saida')
    .reduce((sum, t) => sum + t.valor, 0);
  const data = categories.map(cat =>
    monthTransactions
      .filter(t => t.tipo === 'saida' && t.categoria === cat)
      .reduce((sum, t) => sum + t.valor, 0)
  );

  const summary = {};
  data.forEach((value, index) => {
    if (value > 0) {
      const percentage = totalSaidas > 0 ? ((value / totalSaidas) * 100).toFixed(2) : 0;
      summary[labels[index]] = { value, percentage };
    }
  });
  return summary;
}

async function downloadReport() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const month = getCurrentMonth();
  const report = generateReport(month);
  const chartSummary = generateChartSummary(month);
  let y = 20;

  // Título
  doc.setFontSize(16);
  doc.text(`Relatório Financeiro - ${month}`, 20, y);
  y += 10;

  // Resumo Financeiro
  doc.setFontSize(12);
  doc.text(`Entradas: ${formatCurrency(report.summary.entradas)}`, 20, y);
  y += 10;
  doc.text(`Saídas: ${formatCurrency(report.summary.saidas)}`, 20, y);
  y += 10;
  doc.text(`Saldo: ${formatCurrency(report.summary.saldo)}`, 20, y);
  y += 15;

  // Transações
  doc.text('Transações:', 20, y);
  y += 10;
  doc.setFontSize(10);
  report.transactions.forEach(t => {
    const categoria = t.categoria || '';
    const line = `${t.data} - ${t.descricao} - ${formatCurrency(t.valor)} (${t.tipo}${categoria ? ', ' + categoria : ''})`;
    const splitText = doc.splitTextToSize(line, 170);
    doc.text(splitText, 20, y);
    y += splitText.length * 6;
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
  });

  // Resumo do Gráfico
  y += 10;
  doc.setFontSize(12);
  doc.text('Resumo do Gráfico de Gastos por Categoria:', 20, y);
  y += 10;
  doc.setFontSize(10);
  Object.entries(chartSummary).forEach(([category, { value, percentage }]) => {
    doc.text(`${category}: ${formatCurrency(value)} (${percentage}%)`, 20, y);
    y += 6;
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
  });

  // Capturar e adicionar o gráfico
  const canvas = document.getElementById('expenseChart');
  try {
    const canvasImg = await html2canvas(canvas, { scale: 2 });
    const imgData = canvasImg.toDataURL('image/png');
    const imgWidth = 170;
    const imgHeight = (canvasImg.height * imgWidth) / canvasImg.width;
    y += 10;
    if (y + imgHeight > 260) {
      doc.addPage();
      y = 20;
    }
    doc.addImage(imgData, 'PNG', 20, y, imgWidth, imgHeight);
  } catch (error) {
    console.error('Erro ao capturar o gráfico:', error);
    doc.setFontSize(10);
    doc.text('Não foi possível incluir o gráfico no relatório.', 20, y + 10);
  }

  // Salvar o PDF
  doc.save(`relatorio_financeiro_${month}.pdf`);

  // Opcional: Limpar transações do mês após download
  if (confirm('Deseja limpar as transações do mês após gerar o relatório?')) {
    transactions = transactions.filter(t => !t.data.startsWith(month));
    saveTransactions();
    renderTransactions();
    updateSaldo();
    updateChart();
  }
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

generateReportBtn.addEventListener('click', () => {
  if (confirm('Deseja gerar o relatório do mês atual?')) {
    downloadReport();
    alert('Relatório PDF gerado com sucesso! Você pode abrir o arquivo ou anexá-lo a um e-mail.');
  }
});

// Inicializar
renderTransactions();
updateSaldo();
updateChart();
