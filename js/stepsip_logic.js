// Ensures the FinancialCalculators namespace exists, or creates it.
var FinancialCalculators = FinancialCalculators || {};

FinancialCalculators.initializeStepSipPage = function() { // Corrected function name
    // Page-specific state variables
    let stepSipChart = null;
    let currentStepSipFrequency = 'monthly'; // Default frequency

    const STEP_SIP_CONSTANTS = {
        THIRTY_YEARS: {
            monthly: 12 * 30,
            annually: 30
        },
        FREQUENCY_LABELS: {
            monthly: 'Months',
            annually: 'Years'
        },
        MIN_INVESTMENT: 100,
        MIN_RETURN_RATE: 1,
        MAX_RETURN_RATE: 30,
        MIN_STEP_UP_RATE: 0,
        MAX_STEP_UP_RATE: 100
    };

    const stepSipUI = {
        inputs: {
            investment: document.getElementById('investment'),
            returnRate: document.getElementById('returnRate'),
            stepUpRate: document.getElementById('stepUpRate'),
            timePeriod: document.getElementById('timePeriod'),
            timeValue: document.getElementById('timeValue')
        },
        displays: {
            totalInvestment: document.getElementById('totalInvestment'),
            expectedReturns: document.getElementById('expectedReturns'),
            totalValue: document.getElementById('totalValue'),
            startingInvestment: document.getElementById('startingInvestment'),
            finalInvestment: document.getElementById('finalInvestment'),
            totalIncrease: document.getElementById('totalIncrease'),
            growthLabel: document.getElementById('growthLabel')
        },
        elements: {
            frequencyButtons: document.querySelectorAll('.frequency-btn'),
            sliderLabels: document.querySelector('.slider-labels'),
            breakdownTable: document.getElementById('breakdownTable'),
            yearlyBreakdownTbody: document.getElementById('stepSipBreakdown-tbody'), // Standardized ID
            viewBreakdownBtn: document.getElementById('viewBreakdownBtn'),
            chartCanvas: document.getElementById('returnsChart')
        }
    };

    const debouncedCalculateAndDisplayStepSIP = FinancialCalculators.debounce(calculateAndDisplayStepSIP, 300);

    function initializeStepSipFrequencyButtons() {
        stepSipUI.elements.frequencyButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                stepSipUI.elements.frequencyButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentStepSipFrequency = btn.dataset.freq;
                updateStepSipTimeSlider();
                updateStepSipInvestmentLabel();
                debouncedCalculateAndDisplayStepSIP();
            });
        });
    }

    function updateStepSipInvestmentLabel() {
        const label = document.querySelector('label[for="investment"]');
        if (label) {
            label.textContent = `Initial ${currentStepSipFrequency === 'monthly' ? 'Monthly' : 'Annual'} Investment Amount (₹)`;
        }
    }

    function updateStepSipTimeSlider() {
        const slider = stepSipUI.inputs.timePeriod;
        const maxPeriods = STEP_SIP_CONSTANTS.THIRTY_YEARS[currentStepSipFrequency];
        slider.min = 1;
        slider.max = maxPeriods;
        slider.value = Math.min(parseInt(slider.value), maxPeriods);
        updateStepSipTimeValueDisplay();
        updateStepSipSliderLabels();
    }

    function updateStepSipSliderLabels() {
        if (!stepSipUI.elements.sliderLabels) return;
        const unit = STEP_SIP_CONSTANTS.FREQUENCY_LABELS[currentStepSipFrequency];
        const max = STEP_SIP_CONSTANTS.THIRTY_YEARS[currentStepSipFrequency];
        const mid = Math.floor(max / 2);
        stepSipUI.elements.sliderLabels.innerHTML = `<span>1 ${unit}</span><span>${mid} ${unit}</span><span>${max} ${unit}</span>`;
    }

    function updateStepSipTimeValueDisplay() {
        const currentValue = stepSipUI.inputs.timePeriod.value;
        const unit = STEP_SIP_CONSTANTS.FREQUENCY_LABELS[currentStepSipFrequency];
        FinancialCalculators.updateTextWithAnimation(stepSipUI.inputs.timeValue.id, `${currentValue} ${unit}`);
    }

    function validateStepSipInputs() { // Combined validation
        let isValid = true;
        if (!FinancialCalculators.validateInput(stepSipUI.inputs.investment, val => val >= STEP_SIP_CONSTANTS.MIN_INVESTMENT, `Min investment ₹${STEP_SIP_CONSTANTS.MIN_INVESTMENT}.`, 'error-message')) isValid = false;
        if (!FinancialCalculators.validateInput(stepSipUI.inputs.returnRate, val => val >= STEP_SIP_CONSTANTS.MIN_RETURN_RATE && val <= STEP_SIP_CONSTANTS.MAX_RETURN_RATE, `Return rate ${STEP_SIP_CONSTANTS.MIN_RETURN_RATE}-${STEP_SIP_CONSTANTS.MAX_RETURN_RATE}%.`, 'error-message')) isValid = false;
        if (!FinancialCalculators.validateInput(stepSipUI.inputs.stepUpRate, val => val >= STEP_SIP_CONSTANTS.MIN_STEP_UP_RATE && val <= STEP_SIP_CONSTANTS.MAX_STEP_UP_RATE, `Step-up rate ${STEP_SIP_CONSTANTS.MIN_STEP_UP_RATE}-${STEP_SIP_CONSTANTS.MAX_STEP_UP_RATE}%.`, 'error-message')) isValid = false;
        // Basic check for time period, more specific checks might be needed depending on frequency
        if (!FinancialCalculators.validateInput(stepSipUI.inputs.timePeriod, val => val >= 1, `Min period is 1.`, 'error-message')) isValid = false;
        return isValid;
    }

    function performStepSIPCalculations(baseInvestment, annualRate, stepUpRatePercent, timePeriods) {
        let totalInvestment = 0;
        let futureValue = 0;
        let currentInvestment = baseInvestment;
        // Data for table and chart - ensuring it's reset for each calculation
        const yearlyAggregatedData = { years: [], investments: [], stepUpAmounts: [], returns: [], balances: [] };
        const stepUpFactor = stepUpRatePercent / 100;

        if (currentStepSipFrequency === 'monthly') {
            const monthlyRate = (annualRate / 100) / 12;
            for (let month = 1; month <= timePeriods; month++) {
                let investmentThisMonth = currentInvestment;
                if (month > 1 && (month - 1) % 12 === 0) { // Annual step-up applied at the start of the new year (i.e., after 12, 24, ... months)
                    investmentThisMonth *= (1 + stepUpFactor);
                    currentInvestment = investmentThisMonth; // Update currentInvestment for subsequent months of this year
                }
                totalInvestment += investmentThisMonth;
                futureValue = (futureValue + investmentThisMonth) * (1 + monthlyRate);

                if (month % 12 === 0 || month === timePeriods) { // Aggregate data yearly or at the end
                    let year = Math.ceil(month / 12);
                    yearlyAggregatedData.years.push(year);
                    yearlyAggregatedData.investments.push(totalInvestment); // Cumulative investment
                    yearlyAggregatedData.stepUpAmounts.push(currentInvestment); // Investment amount for this period
                    yearlyAggregatedData.balances.push(futureValue);
                    yearlyAggregatedData.returns.push(futureValue - totalInvestment); // Cumulative returns
                }
            }
        } else { // Annually
            const annualRateDecimal = annualRate / 100;
            for (let year = 1; year <= timePeriods; year++) {
                if (year > 1) {
                    currentInvestment *= (1 + stepUpFactor);
                }
                totalInvestment += currentInvestment;
                futureValue = (futureValue + currentInvestment) * (1 + annualRateDecimal);

                yearlyAggregatedData.years.push(year);
                yearlyAggregatedData.investments.push(totalInvestment);
                yearlyAggregatedData.stepUpAmounts.push(currentInvestment);
                yearlyAggregatedData.balances.push(futureValue);
                yearlyAggregatedData.returns.push(futureValue - totalInvestment);
            }
        }
        return { totalInvestment, futureValue, expectedReturns: futureValue - totalInvestment, finalInvestmentAmount: currentInvestment, yearlyData: yearlyAggregatedData };
    }

    function updateStepSipResultUIDisplays(result) {
        FinancialCalculators.animateValue(stepSipUI.displays.totalInvestment.id, result.totalInvestment);
        FinancialCalculators.animateValue(stepSipUI.displays.expectedReturns.id, result.expectedReturns);
        FinancialCalculators.animateValue(stepSipUI.displays.totalValue.id, result.futureValue);

        const baseInvestment = parseFloat(stepSipUI.inputs.investment.value) || 0;
        FinancialCalculators.updateTextWithAnimation(stepSipUI.displays.startingInvestment.id, FinancialCalculators.formatIndianCurrency(baseInvestment));
        FinancialCalculators.updateTextWithAnimation(stepSipUI.displays.finalInvestment.id, FinancialCalculators.formatIndianCurrency(result.finalInvestmentAmount));
        FinancialCalculators.updateTextWithAnimation(stepSipUI.displays.totalIncrease.id, FinancialCalculators.formatIndianCurrency(result.finalInvestmentAmount - baseInvestment));
        if(stepSipUI.displays.growthLabel) stepSipUI.displays.growthLabel.textContent = `Investment amount increases by ${stepSipUI.inputs.stepUpRate.value}% every year.`;
    }

    function calculateAndDisplayStepSIP() {
        const baseInvestment = parseFloat(stepSipUI.inputs.investment.value) || 0;
        const annualRate = parseFloat(stepSipUI.inputs.returnRate.value) || 0;
        const stepUpRate = parseFloat(stepSipUI.inputs.stepUpRate.value) || 0;
        const timePeriods = parseInt(stepSipUI.inputs.timePeriod.value) || 0;

        if (!validateStepSipInputs() || timePeriods <= 0) {
            ['totalInvestment', 'expectedReturns', 'totalValue', 'finalInvestment', 'totalIncrease'].forEach(id => {
                 if(stepSipUI.displays[id]) FinancialCalculators.animateValue(stepSipUI.displays[id].id, 0);
            });
            if(stepSipUI.displays.startingInvestment) FinancialCalculators.updateTextWithAnimation(stepSipUI.displays.startingInvestment.id, FinancialCalculators.formatIndianCurrency(baseInvestment));
            FinancialCalculators.destroyChart('stepSipChart');
            if(stepSipUI.elements.yearlyBreakdownTbody) FinancialCalculators.clearTableBody(stepSipUI.elements.yearlyBreakdownTbody.id);
            return;
        }

        const result = performStepSIPCalculations(baseInvestment, annualRate, stepUpRate, timePeriods);
        updateStepSipResultUIDisplays(result);
        renderStepSipChart(result.yearlyData); // yearlyData comes from performStepSIPCalculations
        if (stepSipUI.elements.breakdownTable.style.display === 'block') {
            renderStepSipTable(result.yearlyData);
        }
    }

    function stepSipTableRowFormatter(rowData) {
        const periodLabel = STEP_SIP_CONSTANTS.FREQUENCY_LABELS[currentStepSipFrequency];
        return `
            <td class="text-center">${rowData.year}</td> <!-- This is the year/month number from yearlyData.years -->
            <td>${FinancialCalculators.formatIndianCurrency(rowData.investmentThisPeriod)}</td>
            <td>${FinancialCalculators.formatIndianCurrency(rowData.stepUpAmount > 0 ? rowData.stepUpAmount : 0)}</td>
            <td>${FinancialCalculators.formatIndianCurrency(rowData.cumulativeReturns)}</td>
            <td>${FinancialCalculators.formatIndianCurrency(rowData.balance)}</td>
        `;
    }

    function renderStepSipTable(yearlyData) {
        if (!stepSipUI.elements.yearlyBreakdownTbody) return;

        const tableData = yearlyData.years.map((year, i) => {
            const investmentThisPeriod = yearlyData.stepUpAmounts[i];
            let prevPeriodInvestment = 0;
            if (i > 0) {
                prevPeriodInvestment = yearlyData.stepUpAmounts[i-1];
                 // If monthly, and not the first month of a new year, the step-up amount is 0 for that month
                if(currentStepSipFrequency === 'monthly' && year % 1 !== 0 && Math.ceil(yearlyData.years[i-1]/12) === Math.ceil(year/12) ) {
                     prevPeriodInvestment = investmentThisPeriod;
                }
            } else {
                 prevPeriodInvestment = parseFloat(stepSipUI.inputs.investment.value) || 0;
                 if (currentStepSipFrequency === 'monthly' && year > 1) { // First entry in table but not first month overall
                    // This logic needs refinement if table starts from month 1 not year 1 for monthly
                 } else {
                    // For year 1, or first month, step up amount is 0 from base
                    prevPeriodInvestment = investmentThisPeriod;
                 }
            }


            return {
                year: year,
                investmentThisPeriod: investmentThisPeriod,
                stepUpAmount: investmentThisPeriod - prevPeriodInvestment,
                cumulativeReturns: yearlyData.returns[i], // Cumulative returns up to this year/period
                balance: yearlyData.balances[i]
            };
        });
        FinancialCalculators.populateTable(stepSipUI.elements.yearlyBreakdownTbody.id, tableData, stepSipTableRowFormatter);
    }

    function renderStepSipChart(yearlyData) {
        if (!stepSipUI.elements.chartCanvas) return;
        const chartCanvasId = stepSipUI.elements.chartCanvas.id;
        const labels = yearlyData.years.map(y => `${STEP_SIP_CONSTANTS.FREQUENCY_LABELS[currentStepSipFrequency]} ${y}`);
        const chartConfig = {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total Investment', data: yearlyData.investments, // Cumulative
                        borderColor: '#3da59c', backgroundColor: 'rgba(61, 165, 156, 0.1)',
                        fill: true, tension: 0.4
                    },
                    {
                        label: 'Total Value (Corpus)', data: yearlyData.balances, // End of period balance
                        borderColor: '#2d7a73', backgroundColor: 'rgba(45, 122, 115, 0.1)',
                        fill: true, tension: 0.4
                    }
                ]
            },
            options: FinancialCalculators.getGenericChartOptions('Step-up SIP Growth', FinancialCalculators.formatIndianCurrency)
        };
        FinancialCalculators.createOrUpdateChart('stepSipChart', chartCanvasId, chartConfig);
        stepSipChart = FinancialCalculators.charts['stepSipChart'];
    }

    function handleToggleStepSipBreakdown() {
        const callbackOnShow = () => {
            calculateAndDisplayStepSIP();
        };
        FinancialCalculators.toggleElementVisibility(
            stepSipUI.elements.breakdownTable.id,
            stepSipUI.elements.viewBreakdownBtn.id,
            'Hide Detailed Breakdown <span class="button-icon">▲</span>',
            'View Detailed Breakdown <span class="button-icon">▼</span>',
            callbackOnShow
        );
    }

    function initializeStepSipCalculator() {
        initializeStepSipFrequencyButtons();
        Object.values(stepSipUI.inputs).forEach(input => {
            if(input) input.addEventListener('input', () => {
                if(input === stepSipUI.inputs.timePeriod) updateStepSipTimeValueDisplay();
                debouncedCalculateAndDisplayStepSIP();
            });
        });

        if (stepSipUI.elements.viewBreakdownBtn) {
            stepSipUI.elements.viewBreakdownBtn.addEventListener('click', handleToggleStepSipBreakdown);
        }

        const defaultFreqButton = document.querySelector(`.frequency-btn[data-freq="${currentStepSipFrequency}"]`);
        if (defaultFreqButton) defaultFreqButton.classList.add('active');

        updateStepSipTimeSlider();
        updateStepSipInvestmentLabel();
        if(stepSipUI.elements.chartCanvas && stepSipUI.elements.chartCanvas.parentElement) {
             stepSipUI.elements.chartCanvas.parentElement.style.height = '400px';
        }
        calculateAndDisplayStepSIP();

        window.addEventListener('resize', FinancialCalculators.debounce(calculateAndDisplayStepSIP, 300));
    }

    initializeStepSipCalculator();
};
