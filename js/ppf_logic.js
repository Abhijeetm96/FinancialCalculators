// Ensures the FinancialCalculators namespace exists, or creates it.
var FinancialCalculators = FinancialCalculators || {};

FinancialCalculators.initializePpfPage = function() {
    // Page-specific state
    let ppfChart = null; // Local chart instance for this page

    // DOM Elements specific to PPF page
    const ppfInputs = {
        investment: document.getElementById('investment'),
        interestRate: document.getElementById('interestRate'), // Although disabled, it's read
        timePeriod: document.getElementById('timePeriod'),
        timeValue: document.getElementById('timeValue')
    };

    // Debounced calculation function for PPF
    const debouncedCalculatePpf = FinancialCalculators.debounce(calculateAndDisplayPPF, 300);

    // Initialize input event listeners for PPF
    function initializePpfInputListeners() {
        ppfInputs.investment.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            // PPF specific validation
            if (isNaN(value) || value < 500 || value > 150000) {
                e.target.classList.add('error');
                FinancialCalculators.showError('Investment must be between ₹500 and ₹1,50,000 per year');
            } else {
                e.target.classList.remove('error');
                FinancialCalculators.hideError();
            }
            debouncedCalculatePpf();
        });

        ppfInputs.timePeriod.addEventListener('input', () => {
            updatePpfTimeValueDisplay();
            debouncedCalculatePpf();
        });
    }

    // Update time value display for PPF
    function updatePpfTimeValueDisplay() {
        const currentValue = ppfInputs.timePeriod.value;
        FinancialCalculators.updateTextWithAnimation('timeValue', `${currentValue} Years`);
    }

    // --- Page-Specific Calculation Logic for PPF ---
    function calculateYearlyPpfData(yearlyInvestment, annualInterestRate, totalYears) {
        const data = {
            years: [],
            openingBalances: [],
            investments: [],
            interestEarnedThisYear: [], // Renamed for clarity
            closingBalances: []
        };
        let currentBalance = 0;
        const rateDecimal = annualInterestRate / 100;

        for (let year = 1; year <= totalYears; year++) {
            data.years.push(year);
            data.openingBalances.push(currentBalance);
            data.investments.push(yearlyInvestment);
            const interestForYear = Math.round((currentBalance + yearlyInvestment) * rateDecimal);
            data.interestEarnedThisYear.push(interestForYear);
            currentBalance += yearlyInvestment + interestForYear;
            data.closingBalances.push(currentBalance);
        }
        return data;
    }

    function calculateAndDisplayPPF() {
        const yearlyInvestment = parseFloat(ppfInputs.investment.value) || 0;
        const interestRate = parseFloat(ppfInputs.interestRate.value) || 7.1; // Default if needed
        const years = parseInt(ppfInputs.timePeriod.value) || 15; // Default if needed

        if (yearlyInvestment < 500 || yearlyInvestment > 150000 || years < 15) {
            FinancialCalculators.animateValue('totalInvestment', 0);
            FinancialCalculators.animateValue('interestEarned', 0);
            FinancialCalculators.animateValue('maturityAmount', 0);
            FinancialCalculators.destroyChart('ppfChart');
            const tbody = document.getElementById('ppfBreakdown-tbody');
            if (tbody) FinancialCalculators.clearTableBody(tbody.id);
            return;
        }

        const yearlyData = calculateYearlyPpfData(yearlyInvestment, interestRate, years);
        const totalInvested = yearlyInvestment * years;
        const maturityAmount = yearlyData.closingBalances[yearlyData.closingBalances.length - 1] || 0;
        const totalInterestEarned = maturityAmount - totalInvested;

        FinancialCalculators.animateValue('totalInvestment', totalInvested);
        FinancialCalculators.animateValue('interestEarned', totalInterestEarned);
        FinancialCalculators.animateValue('maturityAmount', maturityAmount);

        renderPpfTable(yearlyData);
        renderPpfChart(yearlyData);
    }

    // --- Page-Specific UI Update Functions for PPF ---
    function ppfTableRowFormatter(rowData, index, arr) { // rowData here is one year's complete data object
        return `
            <td class="text-center">
                <span class="period-number">${rowData.year}</span>
            </td>
            <td class="amount-cell">${FinancialCalculators.formatIndianCurrency(rowData.openingBalance)}</td>
            <td class="amount-cell">${FinancialCalculators.formatIndianCurrency(rowData.investment)}</td>
            <td class="amount-cell">${FinancialCalculators.formatIndianCurrency(rowData.interest)}</td>
            <td class="amount-cell">${FinancialCalculators.formatIndianCurrency(rowData.closingBalance)}</td>
        `;
    }

    function renderPpfTable(yearlyData) {
        const tbody = document.getElementById('ppfBreakdown-tbody');
        if (!tbody) return;

        const tableData = yearlyData.years.map((year, i) => ({
            year: year,
            openingBalance: yearlyData.openingBalances[i],
            investment: yearlyData.investments[i],
            interest: yearlyData.interestEarnedThisYear[i],
            closingBalance: yearlyData.closingBalances[i]
        }));
        FinancialCalculators.populateTable(tbody.id, tableData, ppfTableRowFormatter);
    }

    function renderPpfChart(yearlyData) {
        const chartCanvasId = 'returnsChart'; // Assuming this is the canvas ID in ppf.html
        const chartConfig = {
            type: 'line',
            data: {
                labels: yearlyData.years.map(year => `Year ${year}`),
                datasets: [
                    {
                        label: 'Total Investment',
                        data: yearlyData.investments.reduce((acc, val, i) => { acc.push((acc[i-1] || 0) + val); return acc; }, []),
                        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#3da59c',
                        backgroundColor: 'rgba(61, 165, 156, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Maturity Amount',
                        data: yearlyData.closingBalances,
                        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-dark').trim() || '#2d7a73',
                        backgroundColor: 'rgba(45, 122, 115, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: 'PPF Investment Growth Over Time', font: { size: 16, weight: 'bold' }, padding: 20, color: '#333' },
                    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, font: { size: 12 } } },
                    tooltip: {
                        mode: 'index', intersect: false,
                        callbacks: { label: context => `${context.dataset.label}: ${FinancialCalculators.formatIndianCurrency(context.parsed.y)}` },
                        backgroundColor: 'rgba(61, 165, 156, 0.8)', titleFont: { size: 14 }, bodyFont: { size: 13 }, padding: 12
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                    y: { beginAtZero: true, ticks: { callback: value => FinancialCalculators.formatIndianCurrency(value), font: { size: 11 } } }
                },
                interaction: { intersect: false, mode: 'index' },
                animation: { duration: 1000, easing: 'easeInOutQuart' }
            }
        };
        FinancialCalculators.createOrUpdateChart('ppfChart', chartCanvasId, chartConfig);
        ppfChart = FinancialCalculators.charts['ppfChart']; // Keep local reference
    }

    // --- Event Handlers & Initialization for PPF ---
    function handleTogglePpfBreakdown() {
        const callbackOnShow = () => {
            if (ppfInputs.investment.value && ppfInputs.timePeriod.value) {
                 calculateAndDisplayPPF(); // Recalculate to ensure table data is current
            }
        };
        FinancialCalculators.toggleElementVisibility(
            'breakdownTable', // ID of the table container
            'viewBreakdownBtn', // ID of the button
            'Hide Detailed Breakdown <span class="button-icon">▲</span>',
            'View Detailed Breakdown <span class="button-icon">▼</span>',
            callbackOnShow
        );
    }

    function initializePpfCalculator() {
        initializePpfInputListeners();
        updatePpfTimeValueDisplay(); // Set initial time period display
        const chartContainer = document.getElementById('chartContainer');
        if (chartContainer) chartContainer.style.height = '400px'; // Ensure chart container has height
        calculateAndDisplayPPF(); // Initial calculation and display

        const viewBreakdownBtn = document.getElementById('viewBreakdownBtn');
        if (viewBreakdownBtn) {
            viewBreakdownBtn.addEventListener('click', handleTogglePpfBreakdown);
        }
    }

    // Start the PPF calculator initialization
    initializePpfCalculator();
};

// The call to initializePpfPage will be done from ppf.html after DOM is loaded.
// e.g., document.addEventListener('DOMContentLoaded', FinancialCalculators.initializePpfPage);
