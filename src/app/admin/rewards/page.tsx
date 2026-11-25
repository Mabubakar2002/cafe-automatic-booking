'use client'
import { FormEvent, useState } from 'react'

type RewardHistory = {
  customer_key: string
  customer_name: string
  phone: string
  visit_dates: string[]
  paid_visit_count: number
  visit_count: number
  completed: boolean
  reward_percent: number
}

export default function RewardsHistory() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<RewardHistory[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const term = query.trim()
    if (term.length < 2) {
      setError('Enter at least 2 characters to search.')
      setResults([])
      setSearched(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/rewards?q=${encodeURIComponent(term)}`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not search customer rewards.')
      setResults(payload.results)
      setSearched(true)
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Could not search customer rewards.')
      setResults([])
      setSearched(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Customer rewards history</h1>
        <p className="mt-1 text-sm text-ink/60">Search by customer name or mobile number. Only paid visits count toward rewards.</p>
      </div>

      <form onSubmit={search} className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-ink/10 sm:flex-row">
        <label className="sr-only" htmlFor="reward-search">Customer name or mobile number</label>
        <input
          id="reward-search"
          className="min-w-0 flex-1 rounded-xl border border-ink/15 px-4 py-3 outline-none focus:border-chilli"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Name or mobile number"
          autoComplete="off"
        />
        <button className="btn-primary min-h-11" type="submit" disabled={loading}>
          {loading ? 'Searching…' : 'Search rewards'}
        </button>
      </form>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      {loading && <p role="status" className="text-sm text-ink/60">Searching customer history…</p>}
      {searched && !results.length && !loading && <p className="rounded-2xl bg-white p-5 text-ink/60 ring-1 ring-ink/10">No matching customer reward history found.</p>}

      <div className="space-y-3">
        {results.map(customer => (
          <article key={customer.customer_key} className="rounded-2xl bg-white p-5 ring-1 ring-ink/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold">{customer.customer_name}</h2>
                <p className="text-sm text-ink/60">{customer.phone}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${customer.completed ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-900'}`}>
                {customer.completed ? `${customer.reward_percent}% reward ready` : customer.visit_count ? 'Reward in progress' : 'No active reward cycle'}
              </span>
            </div>

            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
              <p><span className="font-bold">{customer.visit_count}/7</span> visits in current cycle</p>
              <p><span className="font-bold">{customer.paid_visit_count}</span> total paid visit days</p>
              <p><span className="font-bold">{customer.reward_percent}%</span> reward after 7 visits</p>
            </div>

            <details className="mt-4 border-t border-ink/10 pt-3">
              <summary className="cursor-pointer text-sm font-bold">Paid visit dates ({customer.paid_visit_count})</summary>
              {customer.visit_dates.length ? (
                <ol className="mt-3 grid gap-1 text-sm text-ink/70 sm:grid-cols-2 lg:grid-cols-3">
                  {[...customer.visit_dates].reverse().map(date => <li key={date}>{date}</li>)}
                </ol>
              ) : (
                <p className="mt-2 text-sm text-ink/60">No paid visits recorded yet.</p>
              )}
            </details>
          </article>
        ))}
      </div>
    </div>
  )
}
