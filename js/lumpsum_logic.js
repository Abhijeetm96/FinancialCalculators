// Ensures the FinancialCalculators namespace exists, or creates it.
var FinancialCalculators = FinancialCalculators || {};

FinancialCalculators.initializeLumpsumPage = function() {
    // Initialize chart variable
    let chart = null; // Scoped locally
    // calculationTimeout is managed by FinancialCalculators.debounce, so not needed here as a global for the page
    // let calculationTimeout = null;

    // Initialize DOM elements
    const lumpsumInputs = { // Renamed to avoid conflict if this script were ever loaded with others page scripts directly
        investment: document.getElementById('investment'),
        returnRate: document.getElementById('returnRate'),
        timePeriod: document.getElementById('timePeriod'),
        timeValue: document.getElementById('timeValue')
    };

    // Debounced calculation function
    const debouncedCalculateLumpsum = FinancialCalculators.debounce(calculateLumpsum, 300);

    // Initialize input event listeners
    function initializeLumpsumInputListeners() {
        lumpsumInputs.investment.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (isNaN(value) || value < 1000) {
                e.target.classList.add('error');
                FinancialCalculators.showError('Investment amount must be at least ₹1,000');
            } else {
                e.target.classList.remove('error');
                FinancialCalculators.hideError();
            }
            debouncedCalculateLumpsum();
        });

        lumpsumInputs.returnRate.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (isNaN(value) || value < 1 || value > 30) {
                e.target.classList.add('error');
                FinancialCalculators.showError('Return rate must be between 1% and 30%');
            } else {
                e.target.classList.remove('error');
                FinancialCalculators.hideError();
            }
            debouncedCalculateLumpsum();
        });

        lumpsumInputs.timePeriod.addEventListener('input', () => {
            updateLumpsumTimeValueDisplay();
            debouncedCalculateLumpsum();
        });
    }

    // Update time value display
    function updateLumpsumTimeValueDisplay() {
        const currentValue = lumpsumInputs.timePeriod.value;
        FinancialCalculators.updateTextWithAnimation('timeValue', `${currentValue} Years`);
    }

    // Lumpsum Calculation
    function calculateLumpsum() {
        const principal = parseFloat(lumpsumInputs.investment.value) || 0;
        const annualRate = parseFloat(lumpsumInputs.returnRate.value) || 0;
        const years = parseInt(lumpsumInputs.timePeriod.value) || 0;

        if (principal < 1000 || annualRate < 1 || annualRate > 30 || years < 1 ) {
            FinancialCalculators.animateValue('initialInvestment', 0);
            FinancialCalculators.animateValue('expectedReturns', 0);
            FinancialCalculators.animateValue('totalValue', 0);
            chart = FinancialCalculators.destroyChart(chart); // Pass current chart instance
            const tbody = document.getElementById('yearlyBreakdown-tbody'); // Ensure lumpsum.html has this ID
            if (tbody) FinancialCalculators.clearTableBody('yearlyBreakdown-tbody');
            return;
        }

        const rateDecimal = annualRate / 100;
        const futureValue = principal * Math.pow(1 + rateDecimal, years);
        const expectedReturns = futureValue - principal;

        FinancialCalculators.animateValue('initialInvestment', principal);
        FinancialCalculators.animateValue('expectedReturns', expectedReturns);
        FinancialCalculators.animateValue('totalValue', futureValue);

        const data = calculateLumpsumInvestmentDataForVisuals(principal, annualRate, years);
        renderLumpsumTable(data);
        chart = renderLumpsumChart(data, chart); // Pass and reassign chart
    }

    // Calculate investment data for visualization
    function calculateLumpsumInvestmentDataForVisuals(principal, annualRate, totalYears) {
        const data = {
            years: [],
            investedAmount: [],
            totalValue: [],
            expectedReturns: []
        };
        const rateDecimal = annualRate / 100;
        for (let year = 0; year <= totalYears; year++) {
            const currentFutureValue = principal * Math.pow(1 + rateDecimal, year);
            data.years.push(year);
            data.investedAmount.push(principal);
            data.totalValue.push(Math.round(currentFutureValue));
            data.expectedReturns.push(Math.round(currentFutureValue - principal));
        }
        return data;
    }

    function lumpsumTableRowFormatter(rowData) {
        return `
            <td class="text-center">
                <span class="period-number">${rowData.year}</span>
                <span class="period-label">Year${rowData.year !== 1 ? 's' : ''}</span>
            </td>
            <td class="amount-cell">${FinancialCalculators.formatIndianCurrency(rowData.invested)}</td>
            <td class="amount-cell">${FinancialCalculators.formatIndianCurrency(rowData.returns)}</td>
            <td class="amount-cell">${FinancialCalculators.formatIndianCurrency(rowData.total)}</td>
        `;
    }

    // Update breakdown table
    function renderLumpsumTable(dataFromCalc) {
        const tableData = dataFromCalc.years.map((year, i) => ({
            year: year,
            invested: dataFromCalc.investedAmount[i],
            returns: dataFromCalc.expectedReturns[i],
            total: dataFromCalc.totalValue[i]
        }));
        FinancialCalculators.populateTable('yearlyBreakdown-tbody', tableData, lumpsumTableRowFormatter);
    }

    // Update chart visualization
    function renderLumpsumChart(dataFromCalc, existingChartInstance) {
        const chartConfig = {
            type: 'line',
            data: {
                labels: dataFromCalc.years.map(year => `Year ${year}`),
                datasets: [
                    {
                        label: 'Initial Investment',
                        data: dataFromCalc.investedAmount,
                        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#3da59c',
                        backgroundColor: 'rgba(61, 165, 156, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Total Value',
                        data: dataFromCalc.totalValue,
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
                    title: { display: true, text: 'Investment Growth Over Time', font: { size: 16, weight: 'bold' }, padding: 20, color: '#333' },
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
        // Use createOrUpdateChart from common_script.js
        // The common script stores chart instances in FinancialCalculators.charts['lumpsumChart']
        FinancialCalculators.createOrUpdateChart('lumpsumChart', 'returnsChart', chartConfig);
        return FinancialCalculators.charts['lumpsumChart']; // Return the new/updated chart instance
    }

    // Toggle breakdown table
    function handleToggleLumpsumBreakdown() {
        FinancialCalculators.toggleElementVisibility(
            'breakdownTable',
            'viewBreakdownBtn',
            'Hide Detailed Breakdown <span class="button-icon">▲</span>',
            'View Detailed Breakdown <span class="button-icon">▼</span>',
            () => {
                if (lumpsumInputs.investment.value && lumpsumInputs.returnRate.value && lumpsumInputs.timePeriod.value) {
                    calculateLumpsum();
                }
            }
        );
    }

    // Initialize the calculator
    // This function will be called by the new DOMContentLoaded listener or directly by FinancialCalculators.initializeLumpsumPage
    function initializeLumpsumCalculator() {
        initializeLumpsumInputListeners();
        // document.getElementById('chartContainer').style.height = '400px'; // Keep if needed, else remove if handled by CSS
        updateLumpsumTimeValueDisplay();
        calculateLumpsum();
    }

    // Initial setup call for the page
    initializeLumpsumCalculator();
    document.getElementById('viewBreakdownBtn').addEventListener('click', handleToggleLumpsumBreakdown);
};

// This new structure assumes FinancialCalculators.initializeLumpsumPage() will be called
// when the DOM is ready, for example, from lumpsum.html like:
// document.addEventListener('DOMContentLoaded', FinancialCalculators.initializeLumpsumPage);
// Or, if common_script.js handles DOM readiness for all pages:
// FinancialCalculators.registerPageInitializer(FinancialCalculators.initializeLumpsumPage);

// For now, if this script is loaded directly and common_script.js is present,
// this will set up the function. The lumpsum.html would need to call it.
// If common_script.js is NOT present, then FinancialCalculators might be undefined.
// The common_script.js should be loaded first.

// The original DOMContentLoaded listener is now effectively part of initializeLumpsumPage,
// or initializeLumpsumPage is called by a new DOMContentLoaded listener in lumpsum.html.
// The `addEventListener` for 'viewBreakdownBtn' is also moved inside.
