const roommateNameInput = document.getElementById('roommateName')
const addRoommateBtn = document.getElementById('addRoommateBtn')
const roommateList = document.getElementById('roommateList')
const roommateCheckboxes = document.getElementById('roommateCheckboxes')

const billNameInput = document.getElementById('billName')
const billAmountInput = document.getElementById('billAmount')
const addBillBtn = document.getElementById('addBillBtn')
const billList = document.getElementById('billList')

const totalExpenses = document.getElementById('totalExpenses')
const summaryList = document.getElementById('summaryList')

let roommates = JSON.parse(localStorage.getItem('splitmate-roommates')) || [
  { id: 1, name: 'Alex' },
  { id: 2, name: 'Mia' },
  { id: 3, name: 'Sam' }
]

let bills = JSON.parse(localStorage.getItem('splitmate-bills')) || [
  {
    id: 1,
    name: 'Electricity',
    amount: 90,
    people: [1, 2, 3]
  },
  {
    id: 2,
    name: 'Internet',
    amount: 45,
    people: [1, 2, 3]
  }
]

function saveData () {
  localStorage.setItem('splitmate-roommates', JSON.stringify(roommates))

  localStorage.setItem('splitmate-bills', JSON.stringify(bills))
}

function renderRoommates () {
  roommateList.innerHTML = ''
  roommateCheckboxes.innerHTML = ''

  if (roommates.length === 0) {
    roommateList.innerHTML = '<p class="empty">No roommates added yet.</p>'

    roommateCheckboxes.innerHTML = '<p class="empty">Add roommates first.</p>'

    return
  }

  roommates.forEach(roommate => {
    const item = document.createElement('div')
    item.className = 'roommate-item'

    item.innerHTML = `
            <span>👤 ${roommate.name}</span>
            <button onclick="removeRoommate(${roommate.id})">
                Remove
            </button>
        `

    roommateList.appendChild(item)

    const checkbox = document.createElement('label')
    checkbox.className = 'checkbox-item'

    checkbox.innerHTML = `
            <input
                type="checkbox"
                value="${roommate.id}"
                checked
            >
            ${roommate.name}
        `

    roommateCheckboxes.appendChild(checkbox)
  })
}

function addRoommate () {
  const name = roommateNameInput.value.trim()

  if (!name) {
    alert('Please enter a roommate name.')
    return
  }

  roommates.push({
    id: Date.now(),
    name: name
  })

  roommateNameInput.value = ''

  saveData()
  renderAll()
}

function removeRoommate (id) {
  roommates = roommates.filter(roommate => roommate.id !== id)

  bills = bills.map(bill => ({
    ...bill,
    people: bill.people.filter(personId => personId !== id)
  }))

  bills = bills.filter(bill => bill.people.length > 0)

  saveData()
  renderAll()
}

function addBill () {
  const name = billNameInput.value.trim()
  const amount = parseFloat(billAmountInput.value)

  const selectedPeople = Array.from(
    roommateCheckboxes.querySelectorAll('input[type="checkbox"]:checked')
  ).map(input => Number(input.value))

  if (!name) {
    alert('Please enter a bill name.')
    return
  }

  if (!amount || amount <= 0) {
    alert('Please enter a valid bill amount.')
    return
  }

  if (selectedPeople.length === 0) {
    alert('Please select at least one roommate.')
    return
  }

  bills.push({
    id: Date.now(),
    name: name,
    amount: amount,
    people: selectedPeople
  })

  billNameInput.value = ''
  billAmountInput.value = ''

  saveData()
  renderAll()
}

function removeBill (id) {
  bills = bills.filter(bill => bill.id !== id)

  saveData()
  renderAll()
}

function renderBills () {
  billList.innerHTML = ''

  if (bills.length === 0) {
    billList.innerHTML = '<p class="empty">No bills added yet.</p>'
    return
  }

  bills.forEach(bill => {
    const includedNames = bill.people
      .map(id => {
        const person = roommates.find(roommate => roommate.id === id)

        return person ? person.name : ''
      })
      .filter(Boolean)

    const splitAmount =
      bill.people.length > 0 ? bill.amount / bill.people.length : 0

    const item = document.createElement('div')
    item.className = 'bill-card'

    item.innerHTML = `
            <div class="bill-info">
                <h4>${bill.name}</h4>
                <p>
                    ${includedNames.join(', ')}
                    · €${splitAmount.toFixed(2)} each
                </p>
            </div>

            <div>
                <span class="bill-amount">
                    €${bill.amount.toFixed(2)}
                </span>

                <button onclick="removeBill(${bill.id})">
                    ✕
                </button>
            </div>
        `

    billList.appendChild(item)
  })
}

function renderSummary () {
  summaryList.innerHTML = ''

  if (roommates.length === 0) {
    summaryList.innerHTML =
      '<p class="empty">Add roommates to see the summary.</p>'
    return
  }

  roommates.forEach(roommate => {
    let totalOwed = 0

    bills.forEach(bill => {
      if (bill.people.includes(roommate.id)) {
        totalOwed += bill.amount / bill.people.length
      }
    })

    const card = document.createElement('div')
    card.className = 'summary-card'

    card.innerHTML = `
            <p>${roommate.name}</p>
            <h4>€${totalOwed.toFixed(2)}</h4>
        `

    summaryList.appendChild(card)
  })
}

function updateTotalExpenses () {
  const total = bills.reduce((sum, bill) => sum + bill.amount, 0)

  totalExpenses.textContent = `€${total.toFixed(2)}`
}

function renderAll () {
  renderRoommates()
  renderBills()
  renderSummary()
  updateTotalExpenses()
}

addRoommateBtn.addEventListener('click', addRoommate)

addBillBtn.addEventListener('click', addBill)

roommateNameInput.addEventListener('keypress', event => {
  if (event.key === 'Enter') {
    addRoommate()
  }
})

renderAll()
