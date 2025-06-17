const FinancialCalculators = {
    // Global store for chart instances, keyed by a unique ID from the calling page
    charts: {},
    calculationTimeout: null,

    // --- UTILITIES ---

    /**
     * Formats a number as Indian Rupees.
     * @param {number} value - The number to format.
     * @returns {string} Formatted currency string.
     */
    formatIndianCurrency: function(value) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
            minimumFractionDigits: 0
        }).format(value).replace('₹', '₹ ');
    },

    /**
     * Animates a numerical value in an HTML element.
     * @param {string} elementId - The ID of the HTML element.
     * @param {number} targetValue - The target value to animate to.
     * @param {number} [duration=500] - Animation duration in ms.
     */
    animateValue: function(elementId, targetValue, duration = 500) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startValue = parseFloat(element.textContent.replace(/[^0-9.-]+/g, "")) || 0;
        const steps = 20;
        const increment = (targetValue - startValue) / steps;
        let currentValue = startValue;
        let step = 0;

        function animate() {
            currentValue += increment;
            step++;
            element.textContent = FinancialCalculators.formatIndianCurrency(Math.round(currentValue));

            if (step < steps) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = FinancialCalculators.formatIndianCurrency(Math.round(targetValue));
            }
        }
        requestAnimationFrame(animate);
    },

    /**
     * Debounces a function call.
     * @param {function} func - The function to debounce.
     * @param {number} delay - The debounce delay in ms.
     * @returns {function} Debounced function.
     */
    debounce: function(func, delay) {
        return function(...args) {
            clearTimeout(FinancialCalculators.calculationTimeout);
            FinancialCalculators.calculationTimeout = setTimeout(() => func.apply(this, args), delay);
        };
    },

    // --- UI HELPERS ---

    /**
     * Shows an error message.
     * @param {string} message - The error message to display.
     * @param {string} [errorElementId='error-message'] - ID of the error message container.
     * @param {string} [containerSelector='.calculator-container'] - Selector for the container to append error element if not found.
     */
    showError: function(message, errorElementId = 'error-message', containerSelector = '.calculator-container') {
        let errorDiv = document.getElementById(errorElementId);
        if (!errorDiv) {
            errorDiv = this.createErrorElement(containerSelector, errorElementId);
        }
        errorDiv.textContent = message;
        errorDiv.style.opacity = '1';
        setTimeout(() => {
            errorDiv.style.opacity = '0';
        }, 3000);
    },

    /**
     * Hides the error message.
     * @param {string} [errorElementId='error-message'] - ID of the error message container.
     */
    hideError: function(errorElementId = 'error-message') {
        const errorDiv = document.getElementById(errorElementId);
        if (errorDiv) {
            errorDiv.style.opacity = '0';
        }
    },

    /**
     * Creates the error message element if it doesn't exist.
     * @param {string} containerSelector - Selector for the container to append to.
     * @param {string} errorElementId - ID for the new error element.
     * @returns {HTMLElement} The error message element.
     */
    createErrorElement: function(containerSelector = '.calculator-container', errorElementId = 'error-message') {
        const container = document.querySelector(containerSelector);
        let errorDiv = document.getElementById(errorElementId);
        if (!errorDiv && container) {
            errorDiv = document.createElement('div');
            errorDiv.id = errorElementId;
            // Assumes 'error-message' class is defined in common_styles.css
            errorDiv.className = 'error-message';
            container.appendChild(errorDiv);
        }
        return errorDiv;
    },

    /**
     * Updates the text content of an element and adds a temporary animation class.
     * @param {string} elementId - The ID of the HTML element.
     * @param {string} text - The text to set.
     * @param {string} [animationClass='animate-in'] - The CSS class for animation.
     * @param {number} [animationTimeout=300] - Duration for the animation class.
     */
    updateTextWithAnimation: function(elementId, text, animationClass = 'animate-in', animationTimeout = 300) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
            element.classList.add(animationClass);
            setTimeout(() => element.classList.remove(animationClass), animationTimeout);
        }
    },

    /**
     * Toggles the visibility of an element and updates button text.
     * @param {string} elementId - ID of the element to toggle.
     * @param {string} buttonId - ID of the button triggering the toggle.
     * @param {string} showText - Button text when element is shown (e.g., "Hide Details").
     * @param {string} hideText - Button text when element is hidden (e.g., "View Details").
     * @param {function} [callbackOnShow=null] - Optional callback function when element is shown.
     * @param {string} [animationClass='animate-in'] - CSS class for animation when shown.
     */
    toggleElementVisibility: function(elementId, buttonId, showText, hideText, callbackOnShow = null, animationClass = 'animate-in') {
        const element = document.getElementById(elementId);
        const button = document.getElementById(buttonId);
        if (!element || !button) return;

        const isHidden = element.style.display === 'none' || !element.style.display;
        if (isHidden) {
            element.style.display = 'block';
            element.classList.add(animationClass);
            button.innerHTML = showText; // Assumes showText/hideText include icons if needed
            if (callbackOnShow) {
                callbackOnShow();
            }
        } else {
            element.style.display = 'none';
            element.classList.remove(animationClass);
            button.innerHTML = hideText;
        }
    },

    // --- CHART HELPERS ---

    /**
     * Destroys an existing Chart.js instance associated with a canvas.
     * @param {string} chartId - A unique ID for the chart (e.g., 'returnsChartPage1').
     */
    destroyChart: function(chartId) {
        if (this.charts[chartId]) {
            this.charts[chartId].destroy();
            delete this.charts[chartId];
        }
    },

    /**
     * Creates or updates a Chart.js chart.
     * @param {string} chartId - A unique ID for storing and managing the chart instance.
     * @param {string} canvasId - The ID of the canvas element.
     * @param {object} chartConfig - The configuration object for Chart.js (type, data, options).
     */
    createOrUpdateChart: function(chartId, canvasId, chartConfig) {
        this.destroyChart(chartId); // Destroy existing chart with this ID
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (ctx) {
            this.charts[chartId] = new Chart(ctx, chartConfig);
        } else {
            console.error(`Canvas with ID ${canvasId} not found.`);
        }
    },

    // --- TABLE HELPERS ---

    /**
     * Clears all rows from a table body.
     * @param {string} tbodyId - The ID of the table body (tbody) element.
     */
    clearTableBody: function(tbodyId) {
        const tbody = document.getElementById(tbodyId);
        if (tbody) {
            tbody.innerHTML = '';
        }
    },

    /**
     * Populates a table body with rows from data.
     * @param {string} tbodyId - The ID of the table body (tbody) element.
     * @param {Array<object>} dataRows - Array of data objects for rows.
     * @param {function} rowFormatterFn - A function that takes a data object and index, and returns an HTML string or TR element for a row.
     * @param {string} [animationClass='table-row-animate'] - CSS class for row animation.
     * @param {number} [animationDelayStep=50] - Delay increment for staggered animation (ms).
     */
    populateTable: function(tbodyId, dataRows, rowFormatterFn, animationClass = 'table-row-animate', animationDelayStep = 50) {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) {
            console.error(`Table body with ID ${tbodyId} not found.`);
            return;
        }
        this.clearTableBody(tbodyId); // Clear existing rows

        dataRows.forEach((rowData, index) => {
            const rowElement = rowFormatterFn(rowData, index); // This function is page-specific
            if (typeof rowElement === 'string') {
                const tempRow = tbody.insertRow();
                tempRow.innerHTML = rowElement;
                if (animationClass) {
                    tempRow.classList.add(animationClass);
                    tempRow.style.animationDelay = `${index * animationDelayStep}ms`;
                }
            } else if (rowElement instanceof HTMLElement) { // Assumes it's a TR element
                if (animationClass) {
                    rowElement.classList.add(animationClass);
                    rowElement.style.animationDelay = `${index * animationDelayStep}ms`;
                }
                tbody.appendChild(rowElement);
            }
        });
    },

    /**
     * Helper to initialize input listeners for a set of input configurations.
     * @param {Array<object>} inputConfigs - Array of { id: string, validationFn: function, errorMsg: string, callback: function }
     * @param {function} debounceCallback - The main calculation/update function to be debounced.
     * @param {number} debounceDelay - Delay for debouncing.
     */
    initializeGenericInputListeners: function(inputConfigs, debounceCallback, debounceDelay = 300) {
        const debouncedAction = this.debounce(debounceCallback, debounceDelay);

        inputConfigs.forEach(config => {
            const inputElement = document.getElementById(config.id);
            if (inputElement) {
                inputElement.addEventListener('input', (e) => {
                    if (config.validationFn) {
                        const value = config.isNumeric ? parseFloat(e.target.value) : e.target.value;
                        if (!config.validationFn(value)) {
                            // Basic error indication, could be enhanced
                            e.target.classList.add('error');
                            this.showError(config.errorMsg); // Assuming showError is available
                        } else {
                            e.target.classList.remove('error');
                            this.hideError(); // Assuming hideError is available
                        }
                    }
                    if (config.liveUpdateFn) { // For things like updating slider text
                        config.liveUpdateFn(e.target.value);
                    }
                    debouncedAction();
                });
            }
        });
    }
};

// Example of how a page might use this:
// document.addEventListener('DOMContentLoaded', () => {
// const inputs = [
// { id: 'investmentAmount', validationFn: val => !isNaN(val) && val >= 1000, errorMsg: 'Min amount is 1000', isNumeric: true, callback: mainCalculationFunction },
// { id: 'timePeriodSlider', liveUpdateFn: updateSliderText, callback: mainCalculationFunction }
// ];
// FinancialCalculators.initializeGenericInputListeners(inputs, mainCalculationFunction, 500);
// });
