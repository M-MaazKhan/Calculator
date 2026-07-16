// ============================================================
// AMBER calculator — logic layer
// ============================================================

const display   = document.getElementById('display');
const historyEl = document.getElementById('history');
const statusDot = document.getElementById('statusDot');
const statusText= document.getElementById('statusText');
const keys      = document.querySelectorAll('.key');

let current   = '0';     // value currently shown
let previous  = null;    // stored left-hand operand
let operator  = null;    // pending operator
let justEvaluated = false;

const MAX_DIGITS = 12;

function setStatus(text, active = false){
  statusText.textContent = text;
  statusDot.classList.toggle('active', active);
}

function formatNumber(numStr){
  if (numStr === 'Error') return numStr;
  const num = Number(numStr);
  if (!isFinite(num)) return 'Error';

  // Trim to a sane number of significant digits without breaking trailing "."
  let str = numStr;
  if (str.includes('.') === false && str.replace('-', '').length > MAX_DIGITS) {
    str = num.toExponential(5);
  } else if (str.replace(/[-.]/g, '').length > MAX_DIGITS) {
    const [intPart] = str.split('.');
    const decimals = Math.max(0, MAX_DIGITS - intPart.replace('-', '').length);
    str = num.toFixed(decimals);
  }
  return str;
}

function render(){
  display.textContent = formatNumber(current);
  if (operator && previous !== null){
    historyEl.textContent = `${formatNumber(previous)} ${symbolFor(operator)}`;
  } else if (justEvaluated && previous !== null) {
    historyEl.textContent = `${formatNumber(previous)} ${symbolFor(operator)} ${formatNumber(current)} =`;
  } else {
    historyEl.textContent = '\u00A0';
  }
}

function symbolFor(op){
  return { add:'+', subtract:'−', multiply:'×', divide:'÷' }[op] || '';
}

function inputDigit(d){
  if (justEvaluated){
    current = d === '.' ? '0.' : d;
    previous = null;
    operator = null;
    justEvaluated = false;
    setStatus('READY');
    render();
    return;
  }
  if (current.replace('-', '').replace('.', '').length >= MAX_DIGITS) return;

  if (d === '.'){
    if (current.includes('.')) return;
    current = current + '.';
  } else {
    current = (current === '0') ? d : current + d;
  }
  render();
}

function chooseOperator(op){
  if (operator && !justEvaluated){
    evaluate();
  }
  previous = current;
  operator = op;
  current = '0';
  justEvaluated = false;
  setStatus(symbolFor(op) + ' PENDING', true);
  render();
}

function evaluate(){
  if (operator === null || previous === null) return;
  const a = parseFloat(previous);
  const b = parseFloat(current);
  let result;

  switch(operator){
    case 'add':      result = a + b; break;
    case 'subtract': result = a - b; break;
    case 'multiply': result = a * b; break;
    case 'divide':   result = b === 0 ? NaN : a / b; break;
    default: return;
  }

  if (!isFinite(result)){
    current = 'Error';
    previous = null;
    operator = null;
    justEvaluated = true;
    setStatus('ERROR', true);
    render();
    return;
  }

  // clean floating point noise (0.1 + 0.2 etc.)
  result = Math.round((result + Number.EPSILON) * 1e10) / 1e10;

  previous = a; // keep for history line
  current = String(result);
  justEvaluated = true;
  setStatus('READY');
  render();
}

function clearAll(){
  current = '0';
  previous = null;
  operator = null;
  justEvaluated = false;
  setStatus('READY');
  render();
}

function negate(){
  if (current === '0' || current === 'Error') return;
  current = current.startsWith('-') ? current.slice(1) : '-' + current;
  render();
}

function percent(){
  if (current === 'Error') return;
  current = String(parseFloat(current) / 100);
  render();
}

function handleAction(action){
  switch(action){
    case 'clear':    clearAll(); break;
    case 'negate':   negate(); break;
    case 'percent':  percent(); break;
    case 'decimal':  inputDigit('.'); break;
    case 'add':
    case 'subtract':
    case 'multiply':
    case 'divide':   chooseOperator(action); break;
    case 'equals':   evaluate(); break;
  }
}

// ---- click / tap handling with a tactile "pressed" pulse ----
keys.forEach(key => {
  key.addEventListener('click', () => {
    pulse(key);
    if (key.dataset.num !== undefined){
      inputDigit(key.dataset.num);
    } else if (key.dataset.action){
      handleAction(key.dataset.action);
    }
  });
});

function pulse(el){
  el.classList.add('pressed');
  setTimeout(() => el.classList.remove('pressed'), 120);
}

// ---- keyboard support ----
window.addEventListener('keydown', (e) => {
  const { key } = e;
  let matchEl = null;

  if (/^[0-9]$/.test(key)){
    inputDigit(key);
    matchEl = [...keys].find(k => k.dataset.num === key);
  } else if (key === '.'){
    inputDigit('.');
    matchEl = [...keys].find(k => k.dataset.action === 'decimal');
  } else if (key === '+'){
    chooseOperator('add');
    matchEl = [...keys].find(k => k.dataset.action === 'add');
  } else if (key === '-'){
    chooseOperator('subtract');
    matchEl = [...keys].find(k => k.dataset.action === 'subtract');
  } else if (key === '*'){
    chooseOperator('multiply');
    matchEl = [...keys].find(k => k.dataset.action === 'multiply');
  } else if (key === '/'){
    e.preventDefault();
    chooseOperator('divide');
    matchEl = [...keys].find(k => k.dataset.action === 'divide');
  } else if (key === 'Enter' || key === '='){
    evaluate();
    matchEl = [...keys].find(k => k.dataset.action === 'equals');
  } else if (key === 'Escape'){
    clearAll();
    matchEl = [...keys].find(k => k.dataset.action === 'clear');
  } else if (key === '%'){
    percent();
    matchEl = [...keys].find(k => k.dataset.action === 'percent');
  } else if (key === 'Backspace'){
    if (current.length > 1){
      current = current.slice(0, -1); 
    } else {
      current = '0';
    }
    render();
  }

  if (matchEl) pulse(matchEl);
});

render();