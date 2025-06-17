// Ensures the FinancialCalculators namespace exists, or creates it.
var FinancialCalculators = FinancialCalculators || {};

FinancialCalculators.initializeNpsPage = function() {
    // Page-specific state variables
    let npsInvestmentChart = null; // Local chart instance for this page

    // Global constants from original script, now scoped to this initializer & namespaced
    const NPS_CONSTANTS = {
        CURRENT_TIME: "2025-03-01 13:14:17", // Example, can be dynamic if needed
        CURRENT_USER: "Abhijeetm96", // Example
        MIN_MONTHLY_INVESTMENT: 500,
        MAX_EQUITY_ALLOCATION: 75, // Max equity allocation specific to NPS rules for certain ages
        DEFAULT_EQUITY_ALLOCATION: 75, // Default, can be adjusted based on age later if needed
        DEFAULT_CORP_ALLOCATION: 15,
        DEFAULT_GOVT_ALLOCATION: 10,
        ANNUITY_PURCHASE_PERCENTAGE: 0.4, // Minimum 40% to be annuitized
        EXPECTED_ANNUITY_RATE: 0.06 // 6% p.a.
    };

    // DOM Elements specific to NPS page
    const npsUI = {
        inputs: {
            currentAge: document.getElementById('currentAge'),
            retirementAge: document.getElementById('retirementAge'),
            monthlyInvestment: document.getElementById('monthlyInvestment'),
            returnRate: document.getElementById('returnRate'),
            equityAllocation: document.getElementById('equityAllocation'),
            corporateAllocation: document.getElementById('corporateAllocation'),
            govtAllocation: document.getElementById('govtAllocation')
        },
        displays: {
            equityPercent: document.getElementById('equityPercent'),
            corporatePercent: document.getElementById('corporatePercent'),
            govtPercent: document.getElementById('govtPercent'),
            totalCorpus: document.getElementById('totalCorpus'),
            monthlyPension: document.getElementById('monthlyPension'),
            totalInvestment: document.getElementById('totalInvestment'),
            totalReturns: document.getElementById('totalReturns')
        },
        elements: {
            yearlyBreakdownTbody: document.getElementById('npsBreakdown-tbody') // Corrected ID
        }
    };

    const debouncedCalculateAndDisplayNPS = FinancialCalculators.debounce(calculateAndDisplayNPS, 300);

    function initializeDateTimeDisplay() { // Renamed for clarity
        const timeDisplay = document.querySelector('.time-display span'); // Assumes .time-display exists
        if (timeDisplay) {
            // This could be made dynamic using FinancialCalculators common utility if one existed for time
            timeDisplay.textContent = NPS_CONSTANTS.CURRENT_TIME + ' UTC';
        }
    }

    function initializeUserDisplay() { // Renamed
        const userDisplay = document.querySelector('.user-display span'); // Assumes .user-display exists
        if (userDisplay) {
            userDisplay.textContent = NPS_CONSTANTS.CURRENT_USER;
        }
    }

    function setupNpsChartDefaults() {
        // Chart.js defaults can be set in common_script.js to apply globally
        // For specific overrides for NPS charts, they can be here or within chart creation.
        // FinancialCalculators.setupChartDefaults(); // Call if you have a common setup
    }

    function validateNpsAge(inputEl, minAge, maxAge, fieldName) {
        const value = parseInt(inputEl.value);
        let isValid = true;
        if (isNaN(value) || value < minAge || value > maxAge) {
            FinancialCalculators.showError(`${fieldName} must be between ${minAge} and ${maxAge}.`, 'error-toast-nps'); // Use unique ID for toast
            inputEl.classList.add('error');
            isValid = false;
        } else {
            inputEl.classList.remove('error');
        }

        if (fieldName === 'Retirement Age' && isValid) {
            const currentAgeVal = parseInt(npsUI.inputs.currentAge.value);
            if (!isNaN(currentAgeVal) && value <= currentAgeVal) {
                FinancialCalculators.showError('Retirement age must be greater than current age.', 'error-toast-nps');
                inputEl.classList.add('error');
                isValid = false;
            }
        }
        if(isValid) FinancialCalculators.hideError('error-toast-nps');
        return isValid;
    }

    function updateNpsAllocationDisplays() {
        let equity = parseInt(npsUI.inputs.equityAllocation.value);
        let corporate = parseInt(npsUI.inputs.corporateAllocation.value);
        let govt = parseInt(npsUI.inputs.govtAllocation.value);

        equity = Math.min(equity, NPS_CONSTANTS.MAX_EQUITY_ALLOCATION);
        // Auto-adjust logic for sliders to sum to 100%
        // This is a simple adjustment; more complex logic might be needed for perfect UX
        const totalAllocation = equity + corporate + govt;
        if (totalAllocation !== 100) {
            const diff = 100 - totalAllocation;
            // Prioritize equity, then adjust others or notify user
            // For now, simple adjustment if one of the others can take the diff
            if (govt + diff >= 0 && govt + diff <= 100) {
                govt += diff;
            } else if (corporate + diff >=0 && corporate + diff <= 100) {
                corporate += diff;
            }
            // Re-cap equity if it was adjusted by this logic
            equity = Math.min(equity, NPS_CONSTANTS.MAX_EQUITY_ALLOCATION);
        }
        // Ensure sum is 100 after adjustments. This might need refinement.
        if(equity + corporate + govt !== 100) {
            // If still not 100, try to adjust govt first, then corporate, without breaking equity cap.
            govt = 100 - equity - corporate;
            if(govt < 0) {
                govt = 0;
                corporate = 100 - equity;
            }
        }


        npsUI.inputs.equityAllocation.value = equity;
        npsUI.inputs.corporateAllocation.value = corporate;
        npsUI.inputs.govtAllocation.value = govt;

        FinancialCalculators.updateTextWithAnimation(npsUI.displays.equityPercent.id, `${equity}%`);
        FinancialCalculators.updateTextWithAnimation(npsUI.displays.corporatePercent.id, `${corporate}%`);
        FinancialCalculators.updateTextWithAnimation(npsUI.displays.govtPercent.id, `${govt}%`);
        // Slider track update would go here if sliders are custom.
        debouncedCalculateAndDisplayNPS();
    }


    function calculateAndDisplayNPS() {
        const currentAge = parseInt(npsUI.inputs.currentAge.value);
        const retirementAge = parseInt(npsUI.inputs.retirementAge.value);
        const monthlyInvestment = parseFloat(npsUI.inputs.monthlyInvestment.value);
        const returnRate = parseFloat(npsUI.inputs.returnRate.value);

        let isValid = true;
        if (!validateNpsAge(npsUI.inputs.currentAge, 18, 65, 'Current Age')) isValid = false;
        if (!validateNpsAge(npsUI.inputs.retirementAge, 60, 75, 'Retirement Age')) isValid = false;
         if (isValid && retirementAge <= currentAge) {
            FinancialCalculators.showError('Retirement age must be greater than current age.', 'error-toast-nps');
            npsUI.inputs.retirementAge.classList.add('error');
            isValid = false;
        }
        if (!FinancialCalculators.validateInput(npsUI.inputs.monthlyInvestment, val => val >= NPS_CONSTANTS.MIN_MONTHLY_INVESTMENT, `Min investment ₹${NPS_CONSTANTS.MIN_MONTHLY_INVESTMENT}.`, 'error-toast-nps')) isValid = false;
        if (!FinancialCalculators.validateInput(npsUI.inputs.returnRate, val => val >=1 && val <=15, `Return rate 1-15%.`, 'error-toast-nps')) isValid = false;


        if (!isValid) {
            // Clear or indicate error in result fields
            ['totalCorpus', 'monthlyPension', 'totalInvestment', 'totalReturns'].forEach(id => FinancialCalculators.animateValue(id, 0));
            FinancialCalculators.destroyChart('npsInvestmentChart');
            if (npsElements.yearlyBreakdownTbody) FinancialCalculators.clearTableBody(npsElements.yearlyBreakdownTbody.id);
            return;
        }

        const yearsToRetirement = retirementAge - currentAge;
        const numMonths = yearsToRetirement * 12;
        const monthlyReturnRate = returnRate / 12 / 100;

        let totalCorpus = 0;
        if (monthlyReturnRate > 0) {
            totalCorpus = monthlyInvestment * ((Math.pow(1 + monthlyReturnRate, numMonths) - 1) / monthlyReturnRate) * (1 + monthlyReturnRate);
        } else {
            totalCorpus = monthlyInvestment * numMonths; // No interest
        }

        const totalInvestmentVal = monthlyInvestment * numMonths;
        const totalReturnsVal = totalCorpus - totalInvestmentVal;
        const annuityAmount = totalCorpus * NPS_CONSTANTS.ANNUITY_PURCHASE_PERCENTAGE;
        const monthlyPensionVal = (annuityAmount * NPS_CONSTANTS.EXPECTED_ANNUITY_RATE) / 12;

        FinancialCalculators.animateValue(npsDisplays.totalCorpus.id, totalCorpus);
        FinancialCalculators.animateValue(npsDisplays.monthlyPension.id, monthlyPensionVal);
        FinancialCalculators.animateValue(npsDisplays.totalInvestment.id, totalInvestmentVal);
        FinancialCalculators.animateValue(npsDisplays.totalReturns.id, totalReturnsVal);

        const yearlyData = generateNpsYearlyData(monthlyInvestment, returnRate, yearsToRetirement, currentAge);
        renderNpsChart(yearlyData);
        renderNpsTable(yearlyData);
        saveNpsLocalState(); // Renamed to avoid conflict
    }

    function generateNpsYearlyData(monthlyInv, annualRate, totalYears, startAge) {
        const data = { years: [], ages: [], investments: [], returns: [], balances: [] };
        const yearlyInv = monthlyInv * 12;
        const yearlyReturnRate = annualRate / 100;
        let balance = 0;
        let cumulativeInv = 0;

        for (let i = 1; i <= totalYears; i++) {
            let yearlyInterest = (balance + yearlyInv / 2) * yearlyReturnRate; // Approximate for mid-year contributions
            balance += yearlyInv + yearlyInterest;
            cumulativeInv += yearlyInv;
            data.years.push(i);
            data.ages.push(startAge + i);
            data.investments.push(cumulativeInv);
            data.returns.push(yearlyInterest);
            data.balances.push(balance);
        }
        return data;
    }

    function npsTableRowFormatter(rowData) {
        return `
            <td class="text-center">${rowData.year}</td>
            <td class="text-center">${rowData.age}</td>
            <td>${FinancialCalculators.formatIndianCurrency(rowData.investment)}</td>
            <td>${FinancialCalculators.formatIndianCurrency(rowData.interest)}</td>
            <td>${FinancialCalculators.formatIndianCurrency(rowData.balance)}</td>
        `;
    }

    function renderNpsTable(yearlyData) {
        if (!npsElements.yearlyBreakdownTbody) return;
        const tableData = yearlyData.years.map((year, i) => ({
            year: year,
            age: yearlyData.ages[i],
            investment: yearlyData.investments[i], // This is cumulative investment
            interest: yearlyData.returns[i],    // This is interest for the year
            balance: yearlyData.balances[i]
        }));
        FinancialCalculators.populateTable(npsElements.yearlyBreakdownTbody.id, tableData, npsTableRowFormatter);
    }

    function renderNpsChart(yearlyData) {
        const chartCanvasId = 'investmentChart'; // From nps.html
        const chartConfig = {
            type: 'line',
            data: {
                labels: yearlyData.ages.map(age => `Age ${age}`),
                datasets: [
                    {
                        label: 'Total Corpus', data: yearlyData.balances,
                        borderColor: NPS_CONSTANTS.COLORS?.investment || '#3da59c',
                        backgroundColor: (NPS_CONSTANTS.COLORS?.investment || '#3da59c') + '1A', // Adding alpha
                        fill: true, tension: 0.4
                    },
                    {
                        label: 'Total Investment', data: yearlyData.investments,
                        borderColor: NPS_CONSTANTS.COLORS?.returns || '#2dd4bf',
                        backgroundColor: (NPS_CONSTANTS.COLORS?.returns || '#2dd4bf') + '1A',
                        fill: true, tension: 0.4
                    }
                ]
            },
            options: FinancialCalculators.getGenericChartOptions(`NPS Growth Over Time`, FinancialCalculators.formatIndianCurrency)
        };
        FinancialCalculators.createOrUpdateChart('npsInvestmentChart', chartCanvasId, chartConfig);
        npsChart = FinancialCalculators.charts['npsInvestmentChart'];
    }

    function saveNpsLocalState() {
        const stateToSave = {
            currentAge: npsUI.inputs.currentAge.value,
            retirementAge: npsUI.inputs.retirementAge.value,
            monthlyInvestment: npsUI.inputs.monthlyInvestment.value,
            returnRate: npsUI.inputs.returnRate.value,
            equityAllocation: npsUI.inputs.equityAllocation.value,
            corporateAllocation: npsUI.inputs.corporateAllocation.value,
            govtAllocation: npsUI.inputs.govtAllocation.value,
            timestamp: new Date().toISOString(),
            user: NPS_CONSTANTS.CURRENT_USER
        };
        try {
            localStorage.setItem('npsCalculatorState', JSON.stringify(stateToSave));
        } catch (error) {
            console.warn('Error saving NPS state to localStorage:', error);
            // FinancialCalculators.showError('Could not save your data.', 'error-toast-nps');
        }
    }

    function loadNpsLocalState() {
        try {
            const saved = localStorage.getItem('npsCalculatorState');
            if (saved) {
                const state = JSON.parse(saved);
                if (state.user === NPS_CONSTANTS.CURRENT_USER) { // Basic check
                    npsUI.inputs.currentAge.value = state.currentAge || '25';
                    npsUI.inputs.retirementAge.value = state.retirementAge || '60';
                    npsUI.inputs.monthlyInvestment.value = state.monthlyInvestment || '10000';
                    npsUI.inputs.returnRate.value = state.returnRate || '10';
                    npsUI.inputs.equityAllocation.value = state.equityAllocation || NPS_CONSTANTS.DEFAULT_EQUITY_ALLOCATION;
                    npsUI.inputs.corporateAllocation.value = state.corporateAllocation || NPS_CONSTANTS.DEFAULT_CORP_ALLOCATION;
                    npsUI.inputs.govtAllocation.value = state.govtAllocation || NPS_CONSTANTS.DEFAULT_GOVT_ALLOCATION;
                    // FinancialCalculators.showError('Loaded saved calculation.', 'error-toast-nps', 'success');
                }
            }
        } catch (error) {
            console.warn('Error loading NPS state from localStorage:', error);
            // FinancialCalculators.showError('Could not load saved data.', 'error-toast-nps');
        }
    }

    function initializeNpsCalculator() {
        initializeDateTimeDisplay();
        initializeUserDisplay();
        setupNpsChartDefaults();

        // Attach event listeners to inputs
        Object.values(npsUI.inputs).forEach(input => {
            if (input) { // Check if element exists
                 if(input.type === 'range'){ // Allocation sliders
                    input.addEventListener('input', updateNpsAllocationDisplays);
                 } else { // Other inputs
                    input.addEventListener('input', debouncedCalculateAndDisplayNPS);
                 }
            }
        });

        loadNpsLocalState(); // Load state before initial calculation
        updateNpsAllocationDisplays(); // This will also trigger first calculation via its own debounce
        // calculateAndDisplayNPS(); // Explicit initial calculation if updateNpsAllocations doesn't trigger reliably

        const chartContainer = document.getElementById('investmentChart')?.parentElement;
        if (chartContainer) chartContainer.style.height = '400px';

        // Global event listeners (consider moving to common script if truly global)
        window.addEventListener('resize', FinancialCalculators.debounce(calculateAndDisplayNPS, 300));
    }

    // Start the NPS calculator initialization
    initializeNpsCalculator();
};
