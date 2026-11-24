'use client'
import Crud from '@/components/Crud'
import { today } from '@/lib/util'

const categories = ['Rent', 'Electricity', 'Gas', 'Salary', 'Groceries', 'Repairs', 'Other'].map(c => ({ value: c, label: c }))

export default function Expenses() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">Expenses</h1>
      <p className="text-sm text-ink/60">Everything you spend. The monthly report subtracts this from sales.</p>
      <Crud table="expenses" order="spent_on" desc init={{ spent_on: today(), category: 'Groceries' }} cols={[
        { key: 'spent_on', label: 'Date', type: 'date' },
        { key: 'category', label: 'Category', type: 'select', options: categories },
        { key: 'title', label: 'Details' },
        { key: 'amount', label: 'Amount', type: 'number' },
      ]} />
    </div>
  )
}
