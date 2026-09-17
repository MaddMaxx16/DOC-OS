import { getReceivables } from './ledger.js'

export const LEDGER_OPENING_BALANCE = 2500
export const LEDGER_BANK_SCHEMA_VERSION = 1

export function createInitialLedgerBanking() {
  return {
    schemaVersion: LEDGER_BANK_SCHEMA_VERSION,
    openingBalance: LEDGER_OPENING_BALANCE,
    transactions: [],
  }
}

function normalizeTransaction(transaction) {
  const amount = Number(transaction?.amount || 0)
  if (!transaction?.id || !Number.isFinite(amount) || amount <= 0) return null
  return {
    ...transaction,
    amount,
    direction: transaction.direction === 'debit' ? 'debit' : 'credit',
  }
}

export function normalizeLedgerBanking(value) {
  const openingBalance = Number(value?.openingBalance)
  return {
    schemaVersion: LEDGER_BANK_SCHEMA_VERSION,
    openingBalance: Number.isFinite(openingBalance) ? openingBalance : LEDGER_OPENING_BALANCE,
    transactions: Array.isArray(value?.transactions) ? value.transactions.map(normalizeTransaction).filter(Boolean) : [],
  }
}

export function getLedgerAccountSummary(value) {
  const banking = normalizeLedgerBanking(value)
  const balance = banking.transactions.reduce((sum, transaction) => (
    sum + (transaction.direction === 'debit' ? -transaction.amount : transaction.amount)
  ), banking.openingBalance)
  return {
    openingBalance: banking.openingBalance,
    currentBalance: balance,
    availableBalance: balance,
    transactionCount: banking.transactions.length,
  }
}

export function reconcileLedgerBanking(value, loads = [], carriers = [], workflows = {}) {
  const banking = normalizeLedgerBanking(value)
  const existingIds = new Set(banking.transactions.map((transaction) => transaction.id))
  const receivables = getReceivables(loads, carriers, workflows)
  const deposits = []

  receivables.forEach((receivable) => {
    if (receivable.financialStatus !== 'PAID') return
    const transactionId = `invoice-payment:${receivable.loadId}`
    if (existingIds.has(transactionId)) return
    deposits.push({
      id: transactionId,
      type: 'invoice-payment',
      direction: 'credit',
      amount: Number(receivable.dispatchRevenue || 0),
      description: `${receivable.carrierName} payment`,
      reference: receivable.invoiceNumber || receivable.loadNumber || receivable.loadId,
      loadId: receivable.loadId,
      carrierId: receivable.carrierId,
      invoiceNumber: receivable.invoiceNumber || null,
      postedGameMinute: Number.isFinite(receivable.paymentReceivedGameMinute) ? receivable.paymentReceivedGameMinute : null,
    })
  })

  if (!deposits.length && value?.schemaVersion === LEDGER_BANK_SCHEMA_VERSION && Number(value?.openingBalance) === banking.openingBalance && Array.isArray(value?.transactions)) return value
  return { ...banking, transactions: [...banking.transactions, ...deposits] }
}
