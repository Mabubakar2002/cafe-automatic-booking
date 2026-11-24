import Customer from '@/components/Customer'
import SwRegister from '@/components/SwRegister'

export default function TablePage({ params }: { params: { table: string } }) {
  const n = Number(params.table)
  if (!Number.isInteger(n) || n < 1) return <p className="p-6">This table does not exist.</p>
  return (
    <>
      <SwRegister />
      <Customer table={n} />
    </>
  )
}
