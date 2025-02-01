window.onload = function () {
  const urlParams = new URLSearchParams(window.location.search);
  const income = urlParams.get("income");

  if (income) {
    document.getElementById("income").value = formatIndianNumber(income);
    calculateTax(); // Auto-calculate if income exists in URL
  }
};

function calculateTax() {
  let incomeInput = document.getElementById("income");
  let income = parseFloat(incomeInput.value.replace(/,/g, "")) || 0;
  let resultBox = document.querySelector(".result-box");
  let oldTaxElement = document.getElementById("oldTax");
  let newTaxElement = document.getElementById("newTax");
  let savingsInfo = document.querySelector(".savings-info");
  let errorMsg = document.getElementById("error-msg");

  if (isNaN(income) || income <= 0) {
    errorMsg.classList.remove("hidden");
    errorMsg.innerText = "Please enter a valid income in ₹ format.";
    resultBox.classList.add("hidden");
    return;
  }

  errorMsg.classList.add("hidden");

  gtag("event", "calculateTax", {
    event_category: "User Input",
    event_label: "Form Submission",
    input_value: income,
  });

  let oldTax = calculateNewRegimePreBudgetTax(income);
  let newTax = calculateNewRegimePostBudgetTax(income);
  let taxSavings = oldTax - newTax;

  oldTaxElement.innerText = `₹${oldTax.toLocaleString("en-IN")}`;
  newTaxElement.innerText = `₹${newTax.toLocaleString("en-IN")}`;

  if (taxSavings > 0) {
    savingsInfo.innerHTML = `You save <strong>₹${taxSavings.toLocaleString(
      "en-IN"
    )}</strong> under the new regime!`;
  } else {
    savingsInfo.innerText = "No additional savings in the new regime.";
  }

  resultBox.classList.remove("hidden");
  document.getElementById("shareButton").classList.remove("hidden");
  updateChart(oldTax, newTax);
}

function shareTaxResult() {
  let income = document.getElementById("income").value.replace(/,/g, "");
  let url = `${window.location.origin}${window.location.pathname}?income=${income}`;

  navigator.clipboard.writeText(url).then(() => {
    let copyMessage = document.getElementById("copyMessage");
    copyMessage.classList.remove("hidden");

    setTimeout(() => copyMessage.classList.add("hidden"), 2000);
  });
}

function updateChart(oldTax, newTax) {
  let ctx = document.getElementById("taxChart").getContext("2d");
  if (window.taxChartInstance) {
    window.taxChartInstance.destroy();
  }
  window.taxChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Pre Budget", "Post Budget"],
      datasets: [
        {
          label: "Total Tax",
          data: [oldTax, newTax],
          minBarLength: 2,
          backgroundColor: ["#dc3545", "#28a745"],
        },
      ],
    },
    options: {
      responsive: true,
    },
  });
}

window.addEventListener("resize", function () {
  if (window.taxChartInstance) {
    window.taxChartInstance.resize();
  }
});

document.getElementById("income").addEventListener("input", function (e) {
  // Get the input value and remove all non-numeric characters
  let value = e.target.value.replace(/[^0-9]/g, "");

  // Format the number in the Indian numbering system
  let formattedValue = formatIndianNumber(value);

  // Update the input field with the formatted value
  e.target.value = formattedValue;
});

function formatIndianNumber(number) {
  // Convert the number to a string
  let numStr = number.toString();

  // Use regex to insert commas in the Indian numbering system
  let lastThree = numStr.slice(-3); // Last 3 digits
  let otherNumbers = numStr.slice(0, -3); // Remaining digits

  if (otherNumbers !== "") {
    // Add commas after every 2 digits for the remaining part
    otherNumbers = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  }

  // Combine the formatted parts
  return otherNumbers + (otherNumbers ? "," : "") + lastThree;
}

const EXEMPTION = 75000;
const EDUCATION_AND_HEALTH_CESS = 0.04;

function calculateNewRegimePreBudgetTax(income) {
  const slabs = [
    { limit: 300000, rate: 0 },
    { limit: 700000, rate: 5 },
    { limit: 1000000, rate: 10 },
    { limit: 1200000, rate: 15 },
    { limit: 1500000, rate: 20 },
    { limit: Infinity, rate: 30 },
  ];
  const taxRebate = 25000;
  const rebateLimit = 700000;
  return taxCalculator(income, slabs, taxRebate, rebateLimit);
}

function calculateNewRegimePostBudgetTax(income) {
  const slabs = [
    { limit: 400000, rate: 0 },
    { limit: 800000, rate: 5 },
    { limit: 1200000, rate: 10 },
    { limit: 1600000, rate: 15 },
    { limit: 2000000, rate: 20 },
    { limit: 2400000, rate: 25 },
    { limit: Infinity, rate: 30 },
  ];

  const taxRebate = 60000;
  const rebateLimit = 1200000;
  return taxCalculator(income, slabs, taxRebate, rebateLimit);
}

function taxCalculator(income, slabs, taxRebate, rebateLimit) {
  if (income <= EXEMPTION) return 0;

  let tax = 0;
  let prevLimit = 0;

  income -= EXEMPTION;

  for (let slab of slabs) {
    if (income > prevLimit) {
      let taxableAmount = Math.min(income, slab.limit) - prevLimit;
      tax += (taxableAmount * slab.rate) / 100;
      prevLimit = slab.limit;
    } else {
      break;
    }
  }

  if (income <= rebateLimit) {
    tax = Math.max(0, tax - taxRebate);
  }

  tax += tax * EDUCATION_AND_HEALTH_CESS;

  return Math.round(tax);
}
