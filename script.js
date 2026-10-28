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

let roommates = []
let bills = []
let payments = []
let currentUser = null
let currentGroup = null
let isRegisterMode = false
const $ = id => document.getElementById(id)
const accountsKey = 'splitmate-v3-demo-accounts'
const groupsKey = 'splitmate-v3-demo-groups'
const getAccounts = () => loadData(accountsKey, [])
const getGroups = () => loadData(groupsKey, [])
const isAdmin = () => !!currentGroup && currentGroup.adminId === currentUser?.id
const groupStorageKey = suffix => `splitmate-v3-${currentGroup.id}-${suffix}`

function loadGroupData () {
  roommates = loadData(groupStorageKey('roommates'), [])
  bills = loadData(groupStorageKey('bills'), [])
  payments = loadData(groupStorageKey('payments'), [])
}
function saveGroupData () {
  if (!currentGroup) return
  localStorage.setItem(groupStorageKey('roommates'), JSON.stringify(roommates))
  localStorage.setItem(groupStorageKey('bills'), JSON.stringify(bills))
  localStorage.setItem(groupStorageKey('payments'), JSON.stringify(payments))
}
function renderSession () {
  $('authScreen').hidden = !!currentUser
  $('appShell').hidden = !currentUser
  if (!currentUser) return
  currentGroup = getGroups().find(g => g.id === currentUser.groupId) || null
  $('groupSetup').hidden = !!currentGroup
  $('groupDetails').hidden = !currentGroup
  $('expenseApp').hidden = !currentGroup
  $('groupTitle').textContent = currentGroup?.name || 'Start with a home group'
  $('roleBadge').textContent = currentGroup ? (isAdmin() ? '👑 Admin' : '👤 Member') : 'No group'
  $('groupStatus').textContent = currentGroup ? `Signed in as ${currentUser.name}` : 'Create a group or join one to get started.'
  if (!currentGroup) return
  $('groupCode').textContent = currentGroup.code
  $('groupMembers').textContent = `Members: ${getAccounts().filter(a => a.groupId === currentGroup.id).map(a => a.name).join(', ')}`
  loadGroupData()
  renderAll()
  $('roommateName').disabled = !isAdmin()
  $('addRoommateBtn').disabled = !isAdmin()
  $('billName').disabled = !isAdmin()
  $('billAmount').disabled = !isAdmin()
  $('paidBy').disabled = !isAdmin()
  $('addBillBtn').disabled = !isAdmin()
  $('roommateCheckboxes').querySelectorAll('input').forEach(el => el.disabled = !isAdmin())
}
function updateAccount (patch) {
  const accounts = getAccounts()
  const account = accounts.find(a => a.id === currentUser.id)
  Object.assign(account, patch)
  currentUser = account
  localStorage.setItem(accountsKey, JSON.stringify(accounts))
  renderSession()
}
function toggleAuth () {
  isRegisterMode = !isRegisterMode
  $('registerFields').hidden = !isRegisterMode
  $('authTitle').textContent = isRegisterMode ? 'Create your account' : 'Welcome back'
  $('authSubmit').textContent = isRegisterMode ? 'Create account' : 'Log in'
  $('authPrompt').textContent = isRegisterMode ? 'Already have an account?' : 'New to SplitMate?'
  $('authToggle').textContent = isRegisterMode ? 'Log in' : 'Create an account'
  $('authPassword').autocomplete = isRegisterMode ? 'new-password' : 'current-password'
  $('authPassword').minLength = isRegisterMode ? 6 : 1
  $('authPassword').placeholder = isRegisterMode ? 'At least 6 characters' : 'Enter your password'
  $('authError').hidden = true
  $('authError').textContent = ''
}
async function passwordDigest (value) {
  // Demo only: hashing client-side does NOT make this secure authentication.
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}
function authWarning(message) {
  $('authError').textContent = message
  $('authError').hidden = false
  showToast(message, 'error')
}
async function handleAuth (event) {
  event.preventDefault()
  $('authError').hidden = true
  const email = $('authEmail').value.trim().toLowerCase()
  const password = $('authPassword').value
  const name = $('authName').value.trim()
  if (!email || !password) return authWarning('Please enter your email and password.')
  const accounts = getAccounts()
  if (isRegisterMode) {
    if (name.length < 2) return authWarning('Please enter your full name (at least 2 characters).')
    if (accounts.some(a => a.email === email)) return authWarning('An account with this email already exists. Please log in instead.')
    if (password.length < 6) return authWarning('Password must contain at least 6 characters.')
    const hash = await passwordDigest(password)
    currentUser = {id: generateId(), name, email, passwordHash: hash, groupId: null}
    accounts.push(currentUser)
    localStorage.setItem(accountsKey, JSON.stringify(accounts))
  } else {
    const account = accounts.find(a => a.email === email)
    if (!account) return authWarning('No account found with this email. Please register first.')
    const hash = await passwordDigest(password)
    if (account.passwordHash !== hash) return authWarning('Incorrect password. Please try again.')
    currentUser = account
  }
  sessionStorage.setItem('splitmate-v3-session', currentUser.id)
  $('authForm').reset()
  renderSession()
  showToast(`Welcome, ${currentUser.name}!`, 'success')
}

function createGroup () {
  const name = $('newGroupName').value.trim()
  if (!name) return showToast('Enter a group name.', 'error')
  const groups = getGroups()
  const group = {id: generateId(), name, adminId: currentUser.id, code: Math.random().toString(36).slice(2, 8).toUpperCase()}
  groups.push(group)
  localStorage.setItem(groupsKey, JSON.stringify(groups))
  updateAccount({groupId: group.id})
  showToast('Home group created! You are the admin.', 'success')
}
function joinGroup () {
  const code = $('joinGroupCode').value.trim().toUpperCase()
  const group = getGroups().find(g => g.code === code)
  if (!group) return showToast('Group not found in this browser.', 'error')
  updateAccount({groupId: group.id})
  showToast('You joined the group!', 'success')
}
function requireAdmin () {
  if (isAdmin()) return true
  showToast('Only the group admin can make this change.', 'error')
  return false
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function saveData () { saveGroupData() }

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

const euroFormatter = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' })
const MAX_CENTS = 999999999999

function formatMoney (cents) {
  return euroFormatter.format(cents / 100)
}

// Parse decimal amounts as strings to avoid floating-point multiplication errors.
function parseMoneyToCents (raw) {
  const value = String(raw).trim()
  if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(value)) return null
  const [whole, fractional = ''] = value.split('.')
  const cents = Number(whole) * 100 + Number(fractional.padEnd(2, '0'))
  return Number.isSafeInteger(cents) && cents > 0 && cents <= MAX_CENTS ? cents : null
}

function toCents (amount) {
  return Math.round(Number(amount) * 100) // legacy stored values only
}

function notify (message, type = 'success') {
  const region = document.getElementById('toastRegion')
  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status')
  const icon = document.createElement('span')
  icon.textContent = type === 'error' ? '⚠' : '✓'
  const label = document.createElement('span')
  label.textContent = message
  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'toast-close'
  close.textContent = '×'
  close.setAttribute('aria-label', 'Dismiss notification')
  close.addEventListener('click', () => toast.remove())
  toast.append(icon, label, close)
  region.appendChild(toast)
  setTimeout(() => toast.remove(), 4200)
}

function askConfirmation (message) {
  const dialog = document.getElementById('confirmDialog')
  if (!dialog.showModal) return Promise.resolve(window.confirm(message))
  document.getElementById('confirmText').textContent = message
  return new Promise(resolve => {
    const yes = document.getElementById('acceptConfirm')
    const no = document.getElementById('cancelConfirm')
    function finish(value) {
      yes.removeEventListener('click', accept)
      no.removeEventListener('click', cancel)
      dialog.removeEventListener('cancel', cancel)
      dialog.close()
      resolve(value)
    }
    const accept = () => finish(true)
    const cancel = event => { event.preventDefault(); finish(false) }
    yes.addEventListener('click', accept)
    no.addEventListener('click', cancel)
    dialog.addEventListener('cancel', cancel)
    dialog.showModal()
  })
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
    removeButton.hidden = !isAdmin()

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
  if (!requireAdmin()) return
  const name = roommateNameInput.value.trim()

  if (!name) {
    notify('Please enter a roommate name.', 'error')
    return
  }

  const exists = roommates.some(
    roommate => roommate.name.toLowerCase() === name.toLowerCase()
  )

  if (exists) {
    notify('This roommate already exists.', 'error')
    return
  }

  roommates.push({
    id: generateId(),
    name: name
  })

  roommateNameInput.value = ''

  saveData()
  renderAll()
  notify('Roommate added successfully!')
}

function removeRoommate (id) {
  if (!requireAdmin()) return
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
    notify('This roommate has expense or payment history. Removing them would affect existing balances.', 'error')
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
  if (!requireAdmin()) return
  const name = billNameInput.value.trim()
  const amountCents = parseMoneyToCents(billAmountInput.value)
  const paidBy = paidBySelect.value

  const selectedPeople = Array.from(
    roommateCheckboxes.querySelectorAll('input[type="checkbox"]:checked')
  ).map(input => input.value)

  if (!name) {
    notify('Please enter an expense name.', 'error')
    return
  }

  if (amountCents === null) {
    notify('Enter a valid amount (up to 2 decimals, max €9,999,999,999.99).', 'error')
    return
  }

  if (!paidBy) {
    notify('Please select who paid.', 'error')
    return
  }

  if (selectedPeople.length === 0) {
    notify('Please select at least one roommate.', 'error')
    return
  }

  bills.push({
    id: generateId(),
    name: name,
    amount: amountCents / 100,
    paidBy: paidBy,
    people: selectedPeople,
    date: new Date().toISOString().slice(0, 10)
  })

  billNameInput.value = ''
  billAmountInput.value = ''
  paidBySelect.value = ''

  saveData()
  renderAll()
  notify('Bill added and split successfully!')
}

// ==========================================
// DELETE EXPENSE
// ==========================================

async function removeBill (id) {
  if (!requireAdmin()) return
  const confirmed = await askConfirmation('Are you sure you want to delete this expense?')

  if (!confirmed) return

  bills = bills.filter(bill => String(bill.id) !== String(id))

  saveData()
  renderAll()
  notify('Expense deleted.')
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

      item.querySelector('button').hidden = !isAdmin()
      item.querySelector('button').addEventListener('click', () => removeBill(bill.id))

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

    item.querySelector('button').hidden = !isAdmin()
    item.querySelector('button').addEventListener('click', () => settleUp(transfer))

    balanceList.appendChild(item)
  })
}

// ==========================================
// SETTLE UP
// ==========================================

async function settleUp (transfer) {
  if (!requireAdmin()) return
  const fromName = getRoommateName(transfer.from)
  const toName = getRoommateName(transfer.to)

  const confirmed = await askConfirmation(
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

  notify('Payment recorded successfully!')
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

$('authForm').addEventListener('submit', handleAuth)
$('authToggle').addEventListener('click', toggleAuth)
$('createGroupBtn').addEventListener('click', createGroup)
$('joinGroupBtn').addEventListener('click', joinGroup)
$('logoutButton').addEventListener('click', async () => {
  const confirmed = await askConfirmation('Are you sure you want to log out of SplitMate?')
  if (!confirmed) return
  sessionStorage.removeItem('splitmate-v3-session')
  currentUser = null
  currentGroup = null
  renderSession()
  showToast('You have logged out successfully.', 'success')
})
$('profileButton').addEventListener('click', () => {
  $('profileAvatar').textContent = currentUser.name.trim().charAt(0).toUpperCase()
  $('profileName').value = currentUser.name
  $('profileEmail').textContent = currentUser.email
  $('profileGroup').textContent = currentGroup?.name || 'Not in a group yet'
  $('profileRole').textContent = currentGroup ? (isAdmin() ? 'Group admin' : 'Group member') : 'No group'
  $('profileDialog').showModal()
})
$('profileForm').addEventListener('submit', event => {
  event.preventDefault()
  const name = $('profileName').value.trim()
  if (name.length < 2) return showToast('Name must be at least 2 characters.', 'error')
  updateAccount({name})
  $('profileDialog').close()
  showToast('Your profile has been updated!', 'success')
})
$('closeProfile').addEventListener('click', () => $('profileDialog').close())
const sessionId = sessionStorage.getItem('splitmate-v3-session')
currentUser = getAccounts().find(a => a.id === sessionId) || null
renderSession()
