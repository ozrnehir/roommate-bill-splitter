// ==========================================
// SPLITMATE - ROOMMATE BILL SPLITTER
// ==========================================

// DOM ELEMENTS

const roommateNameInput = document.getElementById('roommateName')
const addRoommateBtn = document.getElementById('addRoommateBtn')
const roommateList = document.getElementById('roommateList')
const roommateCheckboxes = document.getElementById('roommateCheckboxes')

const billNameInput = document.getElementById('billName')
const billAmountInput = document.getElementById('billAmount')
const paidBySelect = document.getElementById('paidBy')
const addBillBtn = document.getElementById('addBillBtn')

const billList = document.getElementById('billList')
const balanceList = document.getElementById('balanceList')
const paymentList = document.getElementById('paymentList')

const totalExpenses = document.getElementById('totalExpenses')
const roommateCount = document.getElementById('roommateCount')
const outstandingBalance = document.getElementById('outstandingBalance')
const completedPayments = document.getElementById('completedPayments')
const searchExpense = document.getElementById('searchExpense')

// ==========================================
// LOCAL STORAGE
// ==========================================

function loadData (key, fallback) {
  try {
    const stored = localStorage.getItem(key)
    return stored === null ? fallback : JSON.parse(stored)
  } catch {
    return fallback
  }
}

let roommates = loadData('splitmate-roommates', [
  { id: 1, name: 'Alex' },
  { id: 2, name: 'Mia' },
  { id: 3, name: 'Sam' }
])

let bills = loadData('splitmate-bills', [
  {
    id: 1,
    name: 'Electricity',
    amount: 90,
    paidBy: 1,
    people: [1, 2, 3],
    date: '2026-10-20'
  },
  {
    id: 2,
    name: 'Internet',
    amount: 45,
    paidBy: 2,
    people: [1, 2, 3],
    date: '2026-10-21'
  }
])

let payments = loadData('splitmate-payments', [])

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function saveData () {
  localStorage.setItem('splitmate-roommates', JSON.stringify(roommates))

  localStorage.setItem('splitmate-bills', JSON.stringify(bills))

  localStorage.setItem('splitmate-payments', JSON.stringify(payments))
}

function generateId () {
  return crypto.randomUUID()
}

function escapeHTML (value) {
  return String(value).replace(/[&<>"']/g, character => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }

    return entities[character]
  })
}

function formatMoney (cents) {
  return `€${(cents / 100).toFixed(2)}`
}

function toCents (amount) {
  return Math.round(Number(amount) * 100)
}

function getRoommateName (id) {
  const roommate = roommates.find(person => String(person.id) === String(id))

  return roommate ? roommate.name : 'Unknown'
}

// ==========================================
// ROOMMATES
// ==========================================

function renderRoommates () {
  roommateList.innerHTML = ''
  roommateCheckboxes.innerHTML = ''

  const previousPayer = paidBySelect.value

  paidBySelect.innerHTML = '<option value="">Select a roommate</option>'

  roommateCount.textContent = roommates.length

  if (roommates.length === 0) {
    roommateList.innerHTML = '<p class="empty">No roommates added yet.</p>'

    roommateCheckboxes.innerHTML = '<p class="empty">Add roommates first.</p>'

    return
  }

  roommates.forEach(roommate => {
    const item = document.createElement('div')
    item.className = 'roommate-item'

    const name = document.createElement('span')
    name.textContent = `👤 ${roommate.name}`

    const removeButton = document.createElement('button')
    removeButton.textContent = 'Remove'
    removeButton.className = 'delete-button'

    removeButton.addEventListener('click', () => {
      removeRoommate(roommate.id)
    })

    item.appendChild(name)
    item.appendChild(removeButton)

    roommateList.appendChild(item)

    // Paid By dropdown

    const option = document.createElement('option')
    option.value = roommate.id
    option.textContent = roommate.name

    paidBySelect.appendChild(option)

    // Participant checkbox

    const checkbox = document.createElement('label')
    checkbox.className = 'checkbox-item'

    const input = document.createElement('input')
    input.type = 'checkbox'
    input.value = roommate.id
    input.checked = true

    const text = document.createTextNode(roommate.name)

    checkbox.appendChild(input)
    checkbox.appendChild(text)

    roommateCheckboxes.appendChild(checkbox)
  })

  if (roommates.some(roommate => String(roommate.id) === previousPayer)) {
    paidBySelect.value = previousPayer
  }
}

function addRoommate () {
  const name = roommateNameInput.value.trim()

  if (!name) {
    alert('Please enter a roommate name.')
    return
  }

  const exists = roommates.some(
    roommate => roommate.name.toLowerCase() === name.toLowerCase()
  )

  if (exists) {
    alert('This roommate already exists.')
    return
  }

  roommates.push({
    id: generateId(),
    name: name
  })

  roommateNameInput.value = ''

  saveData()
  renderAll()
}

function removeRoommate (id) {
  const hasBills = bills.some(bill => {
    return (
      String(bill.paidBy) === String(id) ||
      bill.people.some(personId => String(personId) === String(id))
    )
  })

  const hasPayments = payments.some(payment => {
    return (
      String(payment.from) === String(id) || String(payment.to) === String(id)
    )
  })

  if (hasBills || hasPayments) {
    alert(
      'This roommate has expense or payment history. ' +
        'Removing them would affect existing balances.'
    )
    return
  }

  roommates = roommates.filter(roommate => String(roommate.id) !== String(id))

  saveData()
  renderAll()
}

// ==========================================
// ADD EXPENSE
// ==========================================

function addBill () {
  const name = billNameInput.value.trim()
  const amount = Number(billAmountInput.value)
  const paidBy = paidBySelect.value

  const selectedPeople = Array.from(
    roommateCheckboxes.querySelectorAll('input[type="checkbox"]:checked')
  ).map(input => input.value)

  if (!name) {
    alert('Please enter an expense name.')
    return
  }

  if (!Number.isFinite(amount) || toCents(amount) <= 0) {
    alert('Please enter a valid amount.')
    return
  }

  if (!paidBy) {
    alert('Please select who paid.')
    return
  }

  if (selectedPeople.length === 0) {
    alert('Please select at least one roommate.')
    return
  }

  bills.push({
    id: generateId(),
    name: name,
    amount: toCents(amount) / 100,
    paidBy: paidBy,
    people: selectedPeople,
    date: new Date().toISOString().slice(0, 10)
  })

  billNameInput.value = ''
  billAmountInput.value = ''
  paidBySelect.value = ''

  saveData()
  renderAll()
}

// ==========================================
// DELETE EXPENSE
// ==========================================

function removeBill (id) {
  const confirmed = confirm('Are you sure you want to delete this expense?')

  if (!confirmed) return

  bills = bills.filter(bill => String(bill.id) !== String(id))

  saveData()
  renderAll()
}

// ==========================================
// EXPENSE HISTORY
// ==========================================

function renderBills () {
  billList.innerHTML = ''

  const search = searchExpense.value.trim().toLowerCase()

  const filteredBills = bills.filter(bill =>
    bill.name.toLowerCase().includes(search)
  )

  if (filteredBills.length === 0) {
    billList.innerHTML = '<p class="empty">No expenses found.</p>'
    return
  }

  filteredBills
    .slice()
    .reverse()
    .forEach(bill => {
      const includedNames = bill.people.map(id => getRoommateName(id))

      const payer = bill.paidBy ? getRoommateName(bill.paidBy) : 'Not recorded'

      const item = document.createElement('div')
      item.className = 'bill-card'

      item.innerHTML = `
      <div class="bill-info">

        <h4>${escapeHTML(bill.name)}</h4>

        <p>Paid by ${escapeHTML(payer)}</p>

        <p>
          Split between:
          ${escapeHTML(includedNames.join(', '))}
        </p>

        <p>${escapeHTML(bill.date || 'Date unavailable')}</p>

      </div>

      <div class="bill-actions">

        <span class="bill-amount">
          ${formatMoney(toCents(bill.amount))}
        </span>

        <button class="delete-button">
          Delete
        </button>

      </div>
    `

      item
        .querySelector('button')
        .addEventListener('click', () => removeBill(bill.id))

      billList.appendChild(item)
    })
}

// ==========================================
// CALCULATE BALANCES
// ==========================================

function calculateBalances () {
  const balances = {}

  roommates.forEach(roommate => {
    balances[String(roommate.id)] = 0
  })

  bills.forEach(bill => {
    // Old expenses without payer information
    // cannot be included in debt calculations.

    if (!bill.paidBy || !bill.people.length) {
      return
    }

    const payerId = String(bill.paidBy)

    if (!(payerId in balances)) {
      return
    }

    const participants = [...new Set(bill.people.map(String))].sort()

    const total = toCents(bill.amount)
    const baseShare = Math.floor(total / participants.length)

    const remainder = total % participants.length

    participants.forEach((personId, index) => {
      if (!(personId in balances)) {
        return
      }

      const share = baseShare + (index < remainder ? 1 : 0)

      balances[personId] -= share
      balances[payerId] += share
    })
  })

  // Apply completed payments

  payments.forEach(payment => {
    const from = String(payment.from)
    const to = String(payment.to)
    const amount = toCents(payment.amount)

    if (!(from in balances) || !(to in balances)) {
      return
    }

    balances[from] += amount
    balances[to] -= amount
  })

  // Separate creditors and debtors

  const creditors = []
  const debtors = []

  Object.entries(balances).forEach(([id, amount]) => {
    if (amount > 0) {
      creditors.push({
        id: id,
        amount: amount
      })
    }

    if (amount < 0) {
      debtors.push({
        id: id,
        amount: -amount
      })
    }
  })

  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  const transfers = []

  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount)

    if (amount > 0) {
      transfers.push({
        from: debtors[i].id,
        to: creditors[j].id,
        amount: amount
      })
    }

    debtors[i].amount -= amount
    creditors[j].amount -= amount

    if (debtors[i].amount === 0) i++
    if (creditors[j].amount === 0) j++
  }

  return transfers
}

// ==========================================
// RENDER BALANCES
// ==========================================

function renderBalances () {
  balanceList.innerHTML = ''

  const transfers = calculateBalances()

  const totalOutstanding = transfers.reduce(
    (sum, transfer) => sum + transfer.amount,
    0
  )

  outstandingBalance.textContent = formatMoney(totalOutstanding)

  if (transfers.length === 0) {
    balanceList.innerHTML = `
      <p class="empty">
        🎉 All settled! No outstanding balances.
      </p>
    `
    return
  }

  transfers.forEach(transfer => {
    const fromName = getRoommateName(transfer.from)
    const toName = getRoommateName(transfer.to)

    const item = document.createElement('div')
    item.className = 'balance-card'

    item.innerHTML = `
      <div>

        <h4>
          ${escapeHTML(fromName)}
          owes
          ${escapeHTML(toName)}
        </h4>

        <p>Outstanding payment</p>

      </div>

      <div class="balance-actions">

        <span class="balance-amount">
          ${formatMoney(transfer.amount)}
        </span>

        <button class="settle-button">
          Settle Up
        </button>

      </div>
    `

    item
      .querySelector('button')
      .addEventListener('click', () => settleUp(transfer))

    balanceList.appendChild(item)
  })
}

// ==========================================
// SETTLE UP
// ==========================================

function settleUp (transfer) {
  const fromName = getRoommateName(transfer.from)
  const toName = getRoommateName(transfer.to)

  const confirmed = confirm(
    `Confirm payment?\n\n` +
      `${fromName} paid ${formatMoney(transfer.amount)} ` +
      `to ${toName}.`
  )

  if (!confirmed) {
    return
  }

  payments.push({
    id: generateId(),
    from: transfer.from,
    to: transfer.to,
    amount: transfer.amount / 100,
    date: new Date().toISOString().slice(0, 10)
  })

  saveData()
  renderAll()

  alert('Payment recorded successfully!')
}

// ==========================================
// PAYMENT HISTORY
// ==========================================

function renderPayments () {
  paymentList.innerHTML = ''

  completedPayments.textContent = payments.length

  if (payments.length === 0) {
    paymentList.innerHTML = `
      <p class="empty">
        No completed payments yet.
      </p>
    `
    return
  }

  payments
    .slice()
    .reverse()
    .forEach(payment => {
      const fromName = getRoommateName(payment.from)
      const toName = getRoommateName(payment.to)

      const item = document.createElement('div')
      item.className = 'payment-item'

      item.innerHTML = `
      <div>

        <strong>
          ${escapeHTML(fromName)}
          paid
          ${escapeHTML(toName)}
        </strong>

        <p class="description">
          ${escapeHTML(payment.date)}
        </p>

      </div>

      <div>

        <strong>
          ${formatMoney(toCents(payment.amount))}
        </strong>

        <span class="payment-status">
          Paid
        </span>

      </div>
    `

      paymentList.appendChild(item)
    })
}

// ==========================================
// UPDATE DASHBOARD
// ==========================================

function updateDashboard () {
  const total = bills.reduce((sum, bill) => sum + toCents(bill.amount), 0)

  totalExpenses.textContent = formatMoney(total)
}

// ==========================================
// RENDER EVERYTHING
// ==========================================

function renderAll () {
  renderRoommates()
  renderBills()
  renderBalances()
  renderPayments()
  updateDashboard()
}

// ==========================================
// EVENT LISTENERS
// ==========================================

addRoommateBtn.addEventListener('click', addRoommate)

addBillBtn.addEventListener('click', addBill)

searchExpense.addEventListener('input', renderBills)

roommateNameInput.addEventListener('keypress', event => {
  if (event.key === 'Enter') {
    addRoommate()
  }
})

// ==========================================
// INITIALIZE APP
// ==========================================

saveData()
renderAll()
