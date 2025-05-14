const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => Array.from(document.querySelectorAll(sel));
const on = (el, evt, fn) => el && el.addEventListener(evt, fn);
const guard = (el, fn) => el ? fn(el) : null;

function calcAnnuity(P, A0, termY, rateAnnual) {
  if (![P, A0, termY].every(Number.isFinite) || P <= 0 || A0 < 0 || termY <= 0) {
    return null;
  }
  const n = termY * 12;
  const r = rateAnnual / 12 / 100;
  const principal = P - A0;
  if (principal <= 0) return null;
  const x = Math.pow(1 + r, n);
  const monthlyPayment = principal * (r * x) / (x - 1);
  return Number.isFinite(monthlyPayment) ? monthlyPayment : null;
}

function calcCompound(principal, rateAnnual, months) {
    if (!Number.isFinite(principal) || !Number.isFinite(rateAnnual) || !Number.isFinite(months) || principal <= 0 || months <= 0) {
        return { total: 0, profit: 0 };
    }
    const r = rateAnnual / 12 / 100;
    const total = principal * Math.pow(1 + r, months);
    return {
        total: Math.round(total),
        profit: Math.round(total - principal)
    };
}

function cleanNum(str) {
  let s = String(str).replace(/[^0-9.]/g, '');
  const parts = s.split('.');
  if (parts.length > 2) s = parts.shift() + '.' + parts.join('');
  return s.slice(0, 6);
}

function formatNumber(number) {
    if (typeof number !== 'number' || isNaN(number)) {
        return 'N/A';
    }
    return number.toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


document.addEventListener('DOMContentLoaded', () => {
    const rang1 = qs('.range-1');
    const outMonthly = qs('.monthly-payment');
    const initPayEl = qs('.js_initPay');
    const rangeSliders = qsa('.js_range');
    const termBtns = qsa('.term-sellector button');
    const depSliders = qsa('.js_depRange');
    const phoneInput = qs('#phone');
    const noNumbInputs = qsa('.js_noNumb');
    const amtInput = qs('#amountInput');
    const rubBtn = qs('#rubBtn');
    const eurBtn = qs('#eurBtn');
    const usdBtn = qs('#usdBtn');
    const tblBody = qs('#resultTable tbody');
    const curBtns = [rubBtn, eurBtn, usdBtn];
    const apiKey = '64c2ddbca0bb71b356ba84a4';
    const apiUrl = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/`;
    const targetCurrencies = ['RUB', 'USD', 'EUR'];
    const plusBtn = qs('.our-summ .fa-plus');
    const minusBtn = qs('.our-summ .fa-minus');
    const depAmountSlider = qs('.js_depRange[data-unit="рублей"]');
    const depTermSlider = qs('.js_depRange[data-unit="мес"]');
    const js_intRateEl = qs('.js_intRate');
    const js_depIncomeEl = qs('.js_depIncome');
    const js_depSumEl = qs('.js_depSum');
        
    let opTab = qsa('.tab-item')
    let opTabItem = qsa('.ct-tab-div')

    let creditAmount = 15000;
    let creditTerm = 1;
    let initPayment = creditAmount * 0.2;
    const annualRate = 31;
    const spread = 0.02;
    let currentCur = 'RUB';
    let rates = {};

    const updateSliderBg = (input) => {
      const max = +input.max || 100;
      const min = +input.min || 0;
      const range = max - min;
      const p = ((input.value - min) / range) * 100;
      input.style.background = `linear-gradient(to right, #FF451C 0%, #FF451C ${p}%, #eee ${p}%, #eee 100%)`;
    };

    const updateMonthly = () => {
        guard(outMonthly, el => {
            const pay = calcAnnuity(creditAmount, initPayment, creditTerm, annualRate);
            el.textContent = pay ? pay.toFixed(2) + ' RUB' : '—';
        });
    };

    const updateInitPayDisplay = () => {
        guard(initPayEl, el => {
            el.textContent = initPayment.toFixed(0);
        });
    };

    const setActive = (btn, btnList) => {
        btnList.forEach(b => b?.classList.remove('active'));
        btn?.classList.add('active');
    };

    const fetchRates = async (base) => {
        try {
            const res = await fetch(apiUrl + base);
            if (!res.ok) {
                 const errorData = await res.json();
                 throw new Error(errorData['error-type'] || res.statusText);
            }
            const data = await res.json();
            if (data && data.conversion_rates) {
                rates = data.conversion_rates;
                return true;
            } else {
                throw new Error('Invalid API data format');
            }
        } catch (e) {
            guard(tblBody, tbody => {
                tbody.innerHTML = `<tr><td colspan="3">Ошибка загрузки курсов: ${e.message}</td></tr>`;
            });
            rates = {};
            return false;
        }
    };

    const convertDisplay = () => {
        guard(tblBody, tbody => {
            tbody.innerHTML = '';
            const amt = parseFloat(cleanNum(amtInput ? amtInput.value : '0'));
            if (isNaN(amt) || !Object.keys(rates).length) return;

            targetCurrencies.forEach(cur => {
                if (cur === currentCur) return;
                const rate = rates[cur];
                let buy = NaN;
                let sell = NaN;

                if (rate !== undefined) {
                    const mid = rate * amt;
                    buy = mid / (1 - spread);
                    sell = mid / (1 + spread);
                }

                const row = tbody.insertRow();
                row.insertCell().textContent = cur;
                row.insertCell().textContent = formatNumber(buy);
                row.insertCell().textContent = formatNumber(sell);
            });
        });
    };

    const updatePlaceholder = (cur) => {
        guard(amtInput, inp => { inp.placeholder = `Введите сумму (${cur})`; });
    };

    const updateAmountInputWithToken = (currency) => {
        guard(amtInput, inp => {
            const cleanedValue = cleanNum(inp.value);
             if (cleanedValue !== '') {
                inp.value = cleanedValue + ' ' + currency;
             } else {
                 updatePlaceholder(currency);
             }
        });
    };

    const calculateAndDisplayDeposite = () => {
         if(!depAmountSlider || !depTermSlider || !js_intRateEl || !js_depIncomeEl || !js_depSumEl){
             guard(js_intRateEl, el => el.innerHTML = '-');
             guard(js_depIncomeEl, el => el.innerHTML = '-');
             guard(js_depSumEl, el => el.innerHTML = '-');
             return;
         }

         const amountStart = parseInt(depAmountSlider.dataset.start, 10) || 0;
         const amountStep = parseInt(depAmountSlider.dataset.step, 10) || 1;
         const amountIndex = parseInt(depAmountSlider.value, 10);
         const principal = amountStart + (amountIndex * amountStep);

         const termStart = parseInt(depTermSlider.dataset.start, 10) || 0;
         const termStep = parseInt(depTermSlider.dataset.step, 10) || 1;
         const termIndex = parseInt(depTermSlider.value, 10);
         const months = termStart + (termIndex * termStep);

         let depositAnnualRate;

         if(months < 3){
             depositAnnualRate = 1;
         } else {
             depositAnnualRate = 15;
         }

         js_intRateEl.innerHTML = depositAnnualRate + '% <br/> годовых';

         const depositResult = calcCompound(principal, depositAnnualRate, months);

         if(depositResult) {
             js_depIncomeEl.innerHTML = depositResult.profit.toLocaleString('ru-RU') + '<br/> рублей';
             js_depSumEl.innerHTML = depositResult.total.toLocaleString('ru-RU') + '<br/> рублей';
         } else {
             js_depIncomeEl.innerHTML = '-';
             js_depSumEl.innerHTML = '-';
         }
     };


    guard(rang1, inp => {
        inp.value = inp.dataset.defaultValue || 4;
        updateSliderBg(inp);
        on(inp, 'input', () => updateSliderBg(inp));
    });

    updateInitPayDisplay();

    rangeSliders.forEach(sl => {
        on(sl, 'input', function() {
            const map = [1000, 3000, 5000, 10000, 15000, 20000, 25000, 1000000];
            const index = parseInt(this.value, 10);
            const newAmount = map[index] || creditAmount;

            creditAmount = newAmount;
            const maxInit = creditAmount * 0.95;
            if (initPayment > maxInit) initPayment = maxInit;
            if (initPayment < creditAmount * 0.1) initPayment = creditAmount * 0.1;

            updateInitPayDisplay();
            updateMonthly();
            updateSliderBg(this);
        });
        updateSliderBg(sl);
    });

    termBtns.forEach((btn, i) => {
        if(i === (creditTerm -1)) btn.classList.add('active');
        on(btn, 'click', () => {
            if (btn.classList.contains('active')) return;
            setActive(btn, termBtns);
            creditTerm = i + 1;
            updateMonthly();
        });
    });

    guard(plusBtn, btn => {
        on(btn, 'click', () => {
            const maxInit = creditAmount * 0.95;
            if (initPayment < maxInit) {
                 initPayment = Math.min(initPayment + 100, maxInit);
                 updateInitPayDisplay();
                 updateMonthly();
            }
        });
    });

     guard(minusBtn, btn => {
        on(btn, 'click', () => {
            const minInit = creditAmount * 0.1;
             if (initPayment > minInit) {
                 initPayment = Math.max(initPayment - 100, minInit);
                 updateInitPayDisplay();
                 updateMonthly();
             }
        });
     });

    guard(phoneInput, pi => {
        pi.value = '';
        on(pi, 'focus', () => { if (!pi.value) pi.value = '+'; });
        on(pi, 'blur', () => { if (pi.value === '+') pi.value = ''; });
        on(pi, 'input', () => {
            let digits = pi.value.replace(/\D/g, '');
            pi.value = '+' + digits;
        });
    });

    noNumbInputs.forEach(inp => {
        inp.value = '';
        on(inp, 'input', () => {
            inp.value = inp.value.replace(/[^a-zA-Zа-яА-ЯёЁ\s\-]/g, '');
        });
    });

    depSliders.forEach(sl => {
        const container = sl.closest('.dep-inputs');
        const output = container && container.querySelector('.js_depCalcOut');
        const start = +sl.dataset.start || 0;
        const step = +sl.dataset.step || 1;
        const unit = sl.dataset.unit || '';

        const updateDepSliderOutput = () => {
            const idx = +sl.value;
            const val = start + idx * step;
            if (output) output.value = val.toLocaleString('ru-RU') + ' ' + unit;
            updateSliderBg(sl);
            if (sl === depAmountSlider || sl === depTermSlider) {
                calculateAndDisplayDeposite();
            }
        };
        updateDepSliderOutput();
        on(sl, 'input', updateDepSliderOutput);
    });

    [rubBtn, eurBtn, usdBtn].forEach(btn => {
        guard(btn, b => {
            on(b, 'click', async () => {
                currentCur = b.id.replace('Btn', '').toUpperCase();
                setActive(b, curBtns);
                updateAmountInputWithToken(currentCur);
                if (await fetchRates(currentCur)) convertDisplay();
            });
        });
    });

    guard(amtInput, inp => {
        on(inp, 'input', () => {
            const currentVal = inp.value;
            const cursorPosition = inp.selectionStart;
            const originalLength = currentVal.length;

            let numericValue = cleanNum(currentVal);

            let formattedValue = '';
            if (numericValue) {
                formattedValue = numericValue + ' ' + currentCur;
            }

            inp.value = formattedValue;

            const newLength = formattedValue.length;
            const lengthDiff = newLength - originalLength;
            const newCursorPos = Math.max(0, cursorPosition + lengthDiff - (currentCur.length + 1)); 
            const cursorWasAtEnd = cursorPosition >= originalLength - (currentCur.length + 1);
            const finalCursorPos = cursorWasAtEnd ? numericValue.length : newCursorPos;

            try { 
              inp.setSelectionRange(finalCursorPos, finalCursorPos);
            } catch(e) {}


            convertDisplay();
        });
    });

     qsa('a[href^="#"]').forEach(link => {
         if (link.getAttribute('href').length > 1) {
             on(link, 'click', function (e) {
                 e.preventDefault();

                 const tabLink = link.getAttribute('href').substring(1);
                 const targetTabItem = document.getElementById(tabLink);

                 const activeTabItem = qs('.sel-tab-items.active');

                 if (activeTabItem && activeTabItem !== targetTabItem){
                     activeTabItem.classList.remove('active');
                 }

                 if (targetTabItem) {
                     targetTabItem.classList.add('active');
                     updateMonthly();
                 }

                 qsa('.selector-item').forEach(item => {
                     item.classList.remove('active');
                 });

                 const selectorItem = this.closest('.selector-item');
                 if (selectorItem) {
                     selectorItem.classList.add('active');
                 }
             });
         }
     });


        
    if (opTab.length > 0){

    const firstTab = opTab[0]

    firstTab.classList.add('active')


    const itemLink = firstTab.dataset.tab.slice(1)

    const target = document.getElementById(itemLink)


    if(target){

    target.classList.add('active')

    }

    }


    opTab.forEach((item) => {
        on(item, 'click', () =>{
        opTab.forEach(tab => tab.classList.remove('active'));
        opTabItem.forEach(tabItem => tabItem.classList.remove('active'));

        item.classList.add('active')

        const itemLink = item.dataset.tab.slice(1)

        const target = document.getElementById(itemLink)

        if(target){
        target.classList.add('active')
        }
        })
        
    })


    const init = async () => {
        updatePlaceholder(currentCur);
        setActive(rubBtn, curBtns);
        updateMonthly();
        if (depSliders.length > 0) calculateAndDisplayDeposite();
        if (await fetchRates(currentCur)) {
            convertDisplay();
        }
    };

    init();
});