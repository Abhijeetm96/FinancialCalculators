// Ensures the FinancialCalculators namespace exists, or creates it.
var FinancialCalculators = FinancialCalculators || {};

FinancialCalculators.initializeNetworthPage = function() {
    // Page-specific state variables
    let assetDistributionChartInstance = null; // Renamed to avoid conflict
    let netWorthTrendChartInstance = null;   // Renamed to avoid conflict
    // calculationTimeout is managed by FinancialCalculators.debounce

    // Asset categories mapping (remains page-specific)
    const networthCategories = {
        assets: {
            'Liquid Assets': ['cash', 'bankDeposits', 'moneyMarket', 'cds'],
            'Investment Assets': ['stocks', 'bonds', 'mutualFunds', 'etfs', 'retirement', 'crypto'],
            'Real Estate': ['primaryResidence', 'vacationHomes', 'rentalProperties', 'land'],
            'Personal Property': ['vehicles', 'jewelry', 'art']
        },
        liabilities: {
            'Short-term Liabilities': ['creditCards'],
            'Long-term Liabilities': ['mortgages', 'studentLoans', 'autoLoans']
        }
    };

    // Custom color palettes (remains page-specific)
    const networthColorPalettes = {
        assets: [
            'rgba(61, 165, 156, 0.8)',   // Primary teal
            'rgba(79, 190, 180, 0.8)',   // Light teal
            'rgba(45, 122, 115, 0.8)',   // Dark teal
            'rgba(92, 219, 208, 0.8)',   // Bright teal
            'rgba(38, 198, 218, 0.8)',   // Cyan
            'rgba(0, 150, 136, 0.8)'     // Material teal
        ],
        liabilities: [
            'rgba(220, 53, 69, 0.8)',    // Red
            'rgba(255, 87, 34, 0.8)',    // Deep Orange
            'rgba(255, 152, 0, 0.8)',    // Orange
            'rgba(255, 193, 7, 0.8)'     // Amber
        ]
    };

    // Get value from input (remains page-specific helper)
    function getInputValue(id) {
        return parseFloat(document.getElementById(id)?.value || 0) || 0;
    }

    // Calculate totals by category (remains page-specific)
    function calculateNetworthTotals() {
        const totals = {
            assetsByCategory: {},
            liabilitiesByCategory: {},
            totalAssets: 0,
            totalLiabilities: 0,
            timestamp: new Date().toISOString() // For potential future trend tracking
        };

        Object.entries(networthCategories.assets).forEach(([category, ids]) => {
            totals.assetsByCategory[category] = ids.reduce((sum, id) => {
                const value = getInputValue(id);
                totals.totalAssets += value;
                return sum + value;
            }, 0);
        });

        Object.entries(networthCategories.liabilities).forEach(([category, ids]) => {
            totals.liabilitiesByCategory[category] = ids.reduce((sum, id) => {
                const value = getInputValue(id);
                totals.totalLiabilities += value;
                return sum + value;
            }, 0);
        });
        return totals;
    }

    // Update results display with animation (uses common animateValue)
    function updateNetworthResults(totals) {
        const netWorth = totals.totalAssets - totals.totalLiabilities;
        FinancialCalculators.animateValue('totalAssets', totals.totalAssets);
        FinancialCalculators.animateValue('totalLiabilities', totals.totalLiabilities);
        FinancialCalculators.animateValue('netWorth', netWorth);

        const netWorthElement = document.getElementById('netWorth');
        if (netWorthElement) {
            netWorthElement.className = `result-value ${netWorth >= 0 ? 'positive' : 'negative'}`;
        }
    }

    // Get responsive chart options (can be common or adapted)
    function getNetworthResponsiveChartOptions() { // Renamed for clarity
        const isMobile = window.innerWidth <= 768;
        const isSmallMobile = window.innerWidth <= 480;
        return {
            fontSize: isSmallMobile ? 10 : (isMobile ? 12 : 14),
            padding: isSmallMobile ? 10 : (isMobile ? 15 : 20),
            legendPosition: isMobile ? 'bottom' : 'right'
        };
    }

    function renderAssetDistributionChart(totals) {
        const responsiveOpts = getNetworthResponsiveChartOptions();
        const assetLabels = [];
        const assetData = [];
        const assetColors = [];
        let assetColorIndex = 0;

        Object.entries(totals.assetsByCategory).forEach(([category, value]) => {
            if (value > 0) {
                assetLabels.push(category);
                assetData.push(value);
                assetColors.push(networthColorPalettes.assets[assetColorIndex % networthColorPalettes.assets.length]);
                assetColorIndex++;
            }
        });

        const chartConfig = {
            type: 'doughnut',
            data: {
                labels: assetLabels,
                datasets: [{
                    data: assetData,
                    backgroundColor: assetColors,
                    borderColor: assetColors.map(color => color.replace('0.8', '1')),
                    borderWidth: 2,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '60%',
                plugins: {
                    title: { display: true, text: 'Asset Distribution', color: '#333', font: { size: responsiveOpts.fontSize + 2, weight: 'bold', family: 'Inter' }, padding: responsiveOpts.padding },
                    legend: { position: responsiveOpts.legendPosition, labels: { font: { size: responsiveOpts.fontSize, family: 'Inter' }, padding: responsiveOpts.padding, usePointStyle: true, pointStyle: 'circle'}},
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const value = Math.abs(context.raw);
                                const totalAssetsForPercentage = Object.values(totals.assetsByCategory).reduce((sum, val) => sum + val, 0);
                                const percentage = totalAssetsForPercentage > 0 ? ((value / totalAssetsForPercentage) * 100).toFixed(1) : 0;
                                return `${context.label}: ${FinancialCalculators.formatIndianCurrency(value)} (${percentage}%)`;
                            }
                        },
                        padding: responsiveOpts.padding, titleFont: { size: responsiveOpts.fontSize + 2, family: 'Inter' }, bodyFont: { size: responsiveOpts.fontSize, family: 'Inter' }
                    }
                },
                animation: { animateScale: true, animateRotate: true, duration: 1000, easing: 'easeInOutQuart' }
            }
        };
        FinancialCalculators.createOrUpdateChart('assetDistributionChart', 'assetDistributionChart', chartConfig);
        assetDistributionChartInstance = FinancialCalculators.charts['assetDistributionChart'];
    }

    function renderNetWorthTrendChart(totals) {
        const responsiveOpts = getNetworthResponsiveChartOptions();
        const chartConfig = {
            type: 'bar',
            data: {
                labels: ['Current Position'],
                datasets: [
                    { label: 'Total Assets', data: [totals.totalAssets], backgroundColor: 'rgba(61, 165, 156, 0.8)', borderColor: '#3da59c', borderWidth: 2, borderRadius: 8, barPercentage: 0.6 },
                    { label: 'Total Liabilities', data: [totals.totalLiabilities], backgroundColor: 'rgba(220, 53, 69, 0.8)', borderColor: '#dc3545', borderWidth: 2, borderRadius: 8, barPercentage: 0.6 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)', lineWidth: 1 }, ticks: { callback: value => FinancialCalculators.formatIndianCurrency(value), font: { size: responsiveOpts.fontSize, family: 'Inter' }}},
                    x: { grid: { display: false }, ticks: { font: { size: responsiveOpts.fontSize, family: 'Inter' }}}
                },
                plugins: {
                    title: { display: true, text: 'Assets vs Liabilities', color: '#333', font: { size: responsiveOpts.fontSize + 2, weight: 'bold', family: 'Inter' }, padding: responsiveOpts.padding },
                    legend: { position: responsiveOpts.legendPosition, labels: { font: { size: responsiveOpts.fontSize, family: 'Inter' }, usePointStyle: true, pointStyle: 'circle'}},
                    tooltip: {
                        padding: responsiveOpts.padding, titleFont: { size: responsiveOpts.fontSize + 2, family: 'Inter' }, bodyFont: { size: responsiveOpts.fontSize, family: 'Inter' },
                        callbacks: { label: context => `${context.dataset.label}: ${FinancialCalculators.formatIndianCurrency(context.raw)}` }
                    }
                }
            }
        };
        FinancialCalculators.createOrUpdateChart('netWorthTrendChart', 'netWorthTrendChart', chartConfig);
        netWorthTrendChartInstance = FinancialCalculators.charts['netWorthTrendChart'];
    }

    function networthTableRowFormatter(rowData) { // rowData = {category: string, value: number, percentage: string, isAsset: boolean}
        return `
            <td>${rowData.category}</td>
            <td class="amount-cell ${rowData.isAsset ? 'positive' : 'negative'}">
                ${FinancialCalculators.formatIndianCurrency(rowData.value)}
            </td>
            <td class="amount-cell">${rowData.percentage}%</td>
        `;
    }

    function renderNetworthBreakdownTable(totals) {
        const tbodyId = 'networthBreakdown-tbody'; // tbody ID from HTML
        FinancialCalculators.clearTableBody(tbodyId); // Use common function

        const tableData = [];

        let titleRowHtml = `<td colspan="3" style="font-weight: bold; background-color: rgba(61, 165, 156, 0.1);">Assets</td>`;
        // This approach of adding HTML strings directly for titles is simpler with current populateTable
        document.getElementById(tbodyId).insertAdjacentHTML('beforeend', `<tr>${titleRowHtml}</tr>`);

        Object.entries(totals.assetsByCategory).forEach(([category, value]) => {
            if (value > 0) {
                const percentage = totals.totalAssets > 0 ? ((value / totals.totalAssets) * 100).toFixed(1) : 0;
                tableData.push({ category, value, percentage, isAsset: true });
            }
        });
        FinancialCalculators.populateTable(tbodyId, tableData, networthTableRowFormatter, null, 0); // Append asset data

        let totalAssetRowHtml = `<td style="font-weight: bold;">Total Assets</td>
                                 <td class="amount-cell positive" style="font-weight: bold;">${FinancialCalculators.formatIndianCurrency(totals.totalAssets)}</td>
                                 <td class="amount-cell" style="font-weight: bold;">${totals.totalAssets > 0 ? "100.0%" : "0.0%"}</td>`;
        document.getElementById(tbodyId).insertAdjacentHTML('beforeend', `<tr>${totalAssetRowHtml}</tr>`);

        titleRowHtml = `<td colspan="3" style="font-weight: bold; background-color: rgba(220, 53, 69, 0.1);">Liabilities</td>`;
        document.getElementById(tbodyId).insertAdjacentHTML('beforeend', `<tr>${titleRowHtml}</tr>`);

        const liabilitiesTableData = [];
        Object.entries(totals.liabilitiesByCategory).forEach(([category, value]) => {
             if (value > 0) {
                const percentage = totals.totalLiabilities > 0 ? ((value / totals.totalLiabilities) * 100).toFixed(1) : 0;
                liabilitiesTableData.push({ category, value, percentage, isAsset: false });
            }
        });
        FinancialCalculators.populateTable(tbodyId, liabilitiesTableData, networthTableRowFormatter, null, 0); // Append liability data

        let totalLiabilityRowHtml = `<td style="font-weight: bold;">Total Liabilities</td>
                                     <td class="amount-cell negative" style="font-weight: bold;">${FinancialCalculators.formatIndianCurrency(totals.totalLiabilities)}</td>
                                     <td class="amount-cell" style="font-weight: bold;">${totals.totalLiabilities > 0 ? "100.0%" : "0.0%"}</td>`;
        document.getElementById(tbodyId).insertAdjacentHTML('beforeend', `<tr>${totalLiabilityRowHtml}</tr>`);

        const netWorth = totals.totalAssets - totals.totalLiabilities;
        let netWorthRowHtml = `<td style="font-weight: bold; background-color: #f0f0f0;">Net Worth</td>
                                 <td class="amount-cell ${netWorth >= 0 ? 'positive' : 'negative'}" style="font-weight: bold; background-color: #f0f0f0;">${FinancialCalculators.formatIndianCurrency(netWorth)}</td>
                                 <td class="amount-cell" style="font-weight: bold; background-color: #f0f0f0;"></td>`;
        document.getElementById(tbodyId).insertAdjacentHTML('beforeend', `<tr>${netWorthRowHtml}</tr>`);
    }

    const debouncedCalculateAndUpdate = FinancialCalculators.debounce(calculateAndUpdate, 300);

    function calculateAndUpdate() {
        const totals = calculateNetworthTotals();
        updateNetworthResults(totals);
        renderAssetDistributionChart(totals);
        renderNetWorthTrendChart(totals);
        renderNetworthBreakdownTable(totals);
    }

    function initializeNetworthInputListeners() {
        document.querySelectorAll('.input-field').forEach(input => {
            input.addEventListener('input', () => {
                if (input.value < 0) input.value = 0;
                debouncedCalculateAndUpdate();
            });
        });
        window.addEventListener('resize', FinancialCalculators.debounce(calculateAndUpdate, 300)); // Debounce resize updates
    }

    function initializeNetworthCalculator() {
        initializeNetworthInputListeners();
        calculateAndUpdate(); // Initial calculation and display
    }

    // Start the Net Worth calculator initialization
    initializeNetworthCalculator();
};

// The call to initializeNetworthPage will be done from networth.html after DOM is loaded.
