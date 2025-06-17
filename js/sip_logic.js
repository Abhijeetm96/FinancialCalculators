// Ensures the FinancialCalculators namespace exists, or creates it.
var FinancialCalculators = FinancialCalculators || {};

FinancialCalculators.initializeSipPage = function() {
    // Page-specific configurations
    const sipCONFIG = {
        FREQUENCIES: {
            monthly: { maxPeriods: 360, label: 'Months', rateDiv: 12, chartLabel: 'Months' },
            annually: { maxPeriods: 30, label: 'Years', rateDiv: 1, chartLabel: 'Years' }
        },
        LIMITS: {
            minInvestment: 100,
            minRate: 1,
            maxRate: 30,
            chartPoints: 20 // Max points to show on chart for performance
        },
        COLORS: { // Colors can also come from CSS variables if preferred
            investment: getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#3da59c',
            returns: getComputedStyle(document.documentElement).getPropertyValue('--primary-dark').trim() || '#2d7a73'
        },
        DEFAULT_FREQ: 'monthly'
    };

    // Page-specific state
    let sipChart = null; // Local chart instance for this page
    let currentFrequency = sipCONFIG.DEFAULT_FREQ;

    // DOM Elements specific to SIP page (cached for performance)
    const sipUI = {
        inputs: {
            investment: document.getElementById('investment'),
            returnRate: document.getElementById('returnRate'),
            timePeriod: document.getElementById('timePeriod'),
            timeValue: document.getElementById('timeValue')
        },
        displays: {
            totalInvestment: document.getElementById('totalInvestment'),
            expectedReturns: document.getElementById('expectedReturns'),
            totalValue: document.getElementById('totalValue')
        },
        elements: {
            breakdownTable: document.getElementById('breakdownTable'),
            breakdownBtn: document.getElementById('viewBreakdownBtn'),
            chartCanvas: document.getElementById('returnsChart'), // Assuming canvas ID is 'returnsChart'
            freqButtons: document.querySelectorAll('.frequency-btn'),
            yearlyBreakdownTbody: document.getElementById('sipBreakdown-tbody') // Specific tbody ID
        }
    };

    const debouncedCalculateSip = FinancialCalculators.debounce(calculateAndDisplaySIP, 300);

    // --- Page-Specific Calculation Logic ---
    function calculateSipFutureValue(investment, annualRate, periods, frequencyKey) {
        const freqConfig = sipCONFIG.FREQUENCIES[frequencyKey];
        if (!freqConfig) return 0;
        const ratePerPeriod = (annualRate / 100) / freqConfig.rateDiv;
        if (ratePerPeriod === 0) return investment * periods; // No interest
        // FV = P * [((1+r)^n - 1) / r] * (1+r)  (for SIP at start of period)
        return investment * ((Math.pow(1 + ratePerPeriod, periods) - 1) / ratePerPeriod) * (1 + ratePerPeriod);
    }

    function computeSipBreakdown() {
        const investment = parseFloat(sipUI.inputs.investment.value) || 0;
        const annualRate = parseFloat(sipUI.inputs.returnRate.value) || 0;
        const periods = parseInt(sipUI.inputs.timePeriod.value) || 0;

        if (investment < sipCONFIG.LIMITS.minInvestment ||
            annualRate < sipCONFIG.LIMITS.minRate || annualRate > sipCONFIG.LIMITS.maxRate || periods <= 0) {
            // Clear results and visuals if inputs are invalid
            Object.values(sipUI.displays).forEach(el => el.textContent = FinancialCalculators.formatIndianCurrency(0));
            FinancialCalculators.destroyChart('sipChart'); // Use a unique ID for this page's chart
            if(sipUI.elements.yearlyBreakdownTbody) FinancialCalculators.clearTableBody(sipUI.elements.yearlyBreakdownTbody.id);
            return null;
        }

        const totalInvestment = investment * periods;
        const futureValue = calculateSipFutureValue(investment, annualRate, periods, currentFrequency);
        const estimatedReturns = futureValue - totalInvestment;

        return {
            investmentAmount: investment, // per period
            annualRate,
            periods,
            totalInvestment,
            futureValue,
            estimatedReturns
        };
    }

    function generateSipChartData(baseCalculation) {
        if (!baseCalculation) return null;

        const { investmentAmount, annualRate, periods } = baseCalculation;
        const chartData = { labels: [], invested: [], total: [] };
        const step = Math.max(1, Math.ceil(periods / sipCONFIG.LIMITS.chartPoints));

        for (let i = 1; i <= periods; i += step) {
            chartData.labels.push(i);
            chartData.invested.push(investmentAmount * i);
            chartData.total.push(calculateSipFutureValue(investmentAmount, annualRate, i, currentFrequency));
        }
        // Ensure the last period is always included
        if (periods % step !== 0 && periods > step) {
             chartData.labels.push(periods);
             chartData.invested.push(investmentAmount * periods);
             chartData.total.push(calculateSipFutureValue(investmentAmount, annualRate, periods, currentFrequency));
        }
        return chartData;
    }

    // --- Page-Specific UI Update Functions ---
    function displaySipResults(results) {
        if (!results) return;
        FinancialCalculators.animateValue(sipUI.displays.totalInvestment.id, results.totalInvestment);
        FinancialCalculators.animateValue(sipUI.displays.expectedReturns.id, results.estimatedReturns);
        FinancialCalculators.animateValue(sipUI.displays.totalValue.id, results.futureValue);
    }

    function updateSipTimePeriodLabel() {
        const periods = sipUI.inputs.timePeriod.value;
        const freqLabel = sipCONFIG.FREQUENCIES[currentFrequency].label;
        FinancialCalculators.updateTextWithAnimation(sipUI.inputs.timeValue.id, `${periods} ${freqLabel}`);
    }

    function sipTableRowFormatter(rowData) { // rowData = { period: number, invested: number, returns: number, total: number }
        const freqLabel = sipCONFIG.FREQUENCIES[currentFrequency].chartLabel;
        return `
            <td class="text-center">
                <span class="period-number">${rowData.period}</span>
                <span class="period-label">${freqLabel}</span>
            </td>
            <td class="amount-cell">${FinancialCalculators.formatIndianCurrency(rowData.invested)}</td>
            <td class="amount-cell">${FinancialCalculators.formatIndianCurrency(rowData.returns)}</td>
            <td class="amount-cell">${FinancialCalculators.formatIndianCurrency(rowData.total)}</td>
        `;
    }

    function renderSipTable(chartViewData) {
        if (!chartViewData || !sipUI.elements.yearlyBreakdownTbody) return;
        const tableData = chartViewData.labels.map((period, i) => ({
            period: period,
            invested: chartViewData.invested[i],
            returns: chartViewData.total[i] - chartViewData.invested[i],
            total: chartViewData.total[i]
        }));
        FinancialCalculators.populateTable(sipUI.elements.yearlyBreakdownTbody.id, tableData, sipTableRowFormatter);
    }

    function renderSipChart(chartViewData) {
        if (!chartViewData || !sipUI.elements.chartCanvas) return;

        const freqLabel = sipCONFIG.FREQUENCIES[currentFrequency].chartLabel;
        const chartConfig = {
            type: 'line',
            data: {
                labels: chartViewData.labels.map(l => `${l} ${freqLabel}`),
                datasets: [
                    {
                        label: 'Total Investment',
                        data: chartViewData.invested,
                        borderColor: sipCONFIG.COLORS.investment,
                        backgroundColor: `${sipCONFIG.COLORS.investment}1A`, // Adding alpha for area fill
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Total Value',
                        data: chartViewData.total,
                        borderColor: sipCONFIG.COLORS.returns,
                        backgroundColor: `${sipCONFIG.COLORS.returns}1A`,
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: { // Most of these options are common and could be part of FinancialCalculators.DEFAULT_CHART_OPTIONS
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: 'Investment Growth Over Time', font: { size: 16, weight: 'bold'}, padding: 20, color: '#333' },
                    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, font: {size: 12}}},
                    tooltip: {
                        mode: 'index', intersect: false,
                        callbacks: { label: context => `${context.dataset.label}: ${FinancialCalculators.formatIndianCurrency(context.parsed.y)}`},
                        backgroundColor: 'rgba(61, 165, 156, 0.8)', titleFont: {size: 14}, bodyFont: {size: 13}, padding: 12
                    }
                },
                scales: {
                    x: { grid: {display: false}, ticks: {font: {size: 11}}},
                    y: { beginAtZero: true, ticks: { callback: value => FinancialCalculators.formatIndianCurrency(value), font: {size: 11}}}
                },
                interaction: { intersect: false, mode: 'index'},
                animation: {duration: 1000, easing: 'easeInOutQuart'}
            }
        };
        FinancialCalculators.createOrUpdateChart('sipChart', sipUI.elements.chartCanvas.id, chartConfig);
        sipChart = FinancialCalculators.charts['sipChart']; // Keep local reference if needed
    }

    // --- Event Handlers & Initialization ---
    function calculateAndDisplaySIP() {
        const results = computeSipBreakdown();
        if (!results) return; // Invalid input handled in computeSipBreakdown

        displaySipResults(results);
        const chartViewData = generateSipChartData(results);
        renderSipChart(chartViewData);
        if (sipUI.elements.breakdownTable.style.display === 'block') { // Only update table if visible
             renderSipTable(chartViewData);
        }
    }

    function handleFrequencyChange(event) {
        const newFreq = event.target.closest('.frequency-btn').dataset.freq;
        if (newFreq === currentFrequency) return;

        currentFrequency = newFreq;
        sipUI.elements.freqButtons.forEach(btn => btn.classList.remove('active'));
        event.target.closest('.frequency-btn').classList.add('active');

        const freqConfig = sipCONFIG.FREQUENCIES[currentFrequency];
        sipUI.inputs.timePeriod.max = freqConfig.maxPeriods;
        if (parseInt(sipUI.inputs.timePeriod.value) > freqConfig.maxPeriods) {
            sipUI.inputs.timePeriod.value = freqConfig.maxPeriods;
        }
        updateSipTimePeriodLabel(); // Update label based on new frequency immediately
        debouncedCalculateSip();
    }

    function handleToggleBreakdown() {
        const callbackOnShow = () => {
            const results = computeSipBreakdown(); // Recalculate to ensure data is fresh
            if (results) {
                const chartViewData = generateSipChartData(results);
                renderSipTable(chartViewData); // Render table when shown
            }
        };
        FinancialCalculators.toggleElementVisibility(
            sipUI.elements.breakdownTable.id,
            sipUI.elements.breakdownBtn.id,
            'Hide Detailed Breakdown <span class="button-icon">▲</span>',
            'View Detailed Breakdown <span class="button-icon">▼</span>',
            callbackOnShow
        );
    }

    function initializeSipCalculator() {
        sipUI.elements.freqButtons.forEach(btn => {
            btn.addEventListener('click', handleFrequencyChange);
        });

        // Simplified input listeners
        [sipUI.inputs.investment, sipUI.inputs.returnRate, sipUI.inputs.timePeriod].forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    if(input === sipUI.inputs.timePeriod) updateSipTimePeriodLabel();
                    // Basic validation feedback could be added here if desired, or rely on computeSipBreakdown
                    debouncedCalculateSip();
                });
            }
        });

        if (sipUI.elements.breakdownBtn) {
            sipUI.elements.breakdownBtn.addEventListener('click', handleToggleBreakdown);
        }

        // Set default frequency button active
        document.querySelector(`.frequency-btn[data-freq="${sipCONFIG.DEFAULT_FREQ}"]`)?.classList.add('active');

        // Initial setup
        updateSipTimePeriodLabel(); // Set initial time period label
        if(sipUI.elements.chartCanvas.parentElement) {
            sipUI.elements.chartCanvas.parentElement.style.height = '400px'; // Ensure chart container has height
        }
        calculateAndDisplaySIP(); // Initial calculation and display
    }

    // Start the specific calculator initialization
    initializeSipCalculator();
};

// The call to initializeSipPage will be done from sip.html after DOM is loaded.
// e.g., document.addEventListener('DOMContentLoaded', FinancialCalculators.initializeSipPage);
