// Browser-safe Supabase-compatible client proxy (ZERO node dependencies: no fs, no path)

class LocalClientQueryBuilder {
  private table: string
  private filters: Array<{ col: string; op: string; val: any }> = []
  private sortOption?: { col: string; ascending: boolean }
  private limitCount?: number
  private isSingle = false
  private isMaybeSingle = false
  private isHead = false
  private countOption?: 'exact' | null
  private selectedFields?: string

  constructor(table: string) {
    this.table = table
  }

  select(fields?: string, options?: { count?: 'exact'; head?: boolean }) {
    this.selectedFields = fields
    if (options?.count) this.countOption = options.count
    if (options?.head) this.isHead = options.head
    return this
  }

  eq(col: string, val: any) {
    this.filters.push({ col, op: 'eq', val })
    return this
  }

  neq(col: string, val: any) {
    this.filters.push({ col, op: 'neq', val })
    return this
  }

  gt(col: string, val: any) {
    this.filters.push({ col, op: 'gt', val })
    return this
  }

  gte(col: string, val: any) {
    this.filters.push({ col, op: 'gte', val })
    return this
  }

  lt(col: string, val: any) {
    this.filters.push({ col, op: 'lt', val })
    return this
  }

  lte(col: string, val: any) {
    this.filters.push({ col, op: 'lte', val })
    return this
  }

  in(col: string, val: any[]) {
    this.filters.push({ col, op: 'in', val })
    return this
  }

  is(col: string, val: any) {
    this.filters.push({ col, op: 'is', val })
    return this
  }

  order(col: string, options?: { ascending?: boolean }) {
    this.sortOption = { col, ascending: options?.ascending ?? true }
    return this
  }

  limit(n: number) {
    this.limitCount = n
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  maybeSingle() {
    this.isMaybeSingle = true
    return this
  }

  private async executeQuery() {
    const queryOptions = {
      filters: this.filters,
      order: this.sortOption,
      limit: this.limitCount,
      single: this.isSingle,
      maybeSingle: this.isMaybeSingle,
      count: this.countOption,
      head: this.isHead,
    }

    try {
      const res = await fetch('/api/local-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'query', table: this.table, options: queryOptions }),
      })
      return await res.json()
    } catch (e: any) {
      return { data: null, error: { message: e.message } }
    }
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.executeQuery().then(onfulfilled, onrejected)
  }

  insert(payload: any) {
    const self = this
    const execute = async () => {
      const res = await fetch('/api/local-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'insert', table: self.table, payload }),
      })
      return await res.json()
    }

    return {
      select() {
        return {
          async single() {
            const r = await execute()
            const row = Array.isArray(r.data) ? r.data[0] : r.data
            return { data: row, error: r.error }
          },
          then(onfulfilled?: any, onrejected?: any) {
            return execute().then(onfulfilled, onrejected)
          },
        }
      },
      then(onfulfilled?: any, onrejected?: any) {
        return execute().then(onfulfilled, onrejected)
      },
    }
  }

  update(patch: any) {
    const self = this
    const filters = [...this.filters]
    return {
      eq(col: string, val: any) {
        filters.push({ col, op: 'eq', val })
        return this
      },
      select() {
        return {
          async single() {
            const r = await this.execute()
            const row = Array.isArray(r.data) ? r.data[0] : r.data
            return { data: row, error: r.error }
          },
          async execute() {
            const res = await fetch('/api/local-db', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'update', table: self.table, patch, filters }),
            })
            return await res.json()
          },
          then(onfulfilled?: any, onrejected?: any) {
            return this.execute().then(onfulfilled, onrejected)
          },
        }
      },
      async execute() {
        const res = await fetch('/api/local-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', table: self.table, patch, filters }),
        })
        return await res.json()
      },
      then(onfulfilled?: any, onrejected?: any) {
        return this.execute().then(onfulfilled, onrejected)
      },
    }
  }

  delete() {
    const self = this
    const filters = [...this.filters]
    return {
      eq(col: string, val: any) {
        filters.push({ col, op: 'eq', val })
        return this
      },
      async execute() {
        const res = await fetch('/api/local-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', table: self.table, filters }),
        })
        return await res.json()
      },
      then(onfulfilled?: any, onrejected?: any) {
        return this.execute().then(onfulfilled, onrejected)
      },
    }
  }
}

export function createLocalClient() {
  return {
    from(table: string) {
      return new LocalClientQueryBuilder(table)
    },

    async rpc(fn: string, args: Record<string, any> = {}) {
      try {
        const res = await fetch('/api/local-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'rpc', fn, args }),
        })
        return await res.json()
      } catch (e: any) {
        return { data: null, error: { message: e.message } }
      }
    },

    auth: {
      async signInWithPassword(credentials: { email: string; password: string }) {
        try {
          const res = await fetch('/api/local-db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'auth_signin', credentials }),
          })
          const data = await res.json()
          if (data.data?.user) {
            localStorage.setItem('cafe_local_user', JSON.stringify(data.data.user))
          }
          return data
        } catch (e: any) {
          return { data: { user: null, session: null }, error: { message: e.message } }
        }
      },

      async signOut() {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cafe_local_user')
          document.cookie = 'cafe_local_staff=; path=/; max-age=0'
          await fetch('/api/local-db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'auth_signout' }),
          }).catch(() => {})
        }
        return { error: null }
      },

      async getUser() {
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem('cafe_local_user')
          if (raw) {
            try {
              return { data: { user: JSON.parse(raw) }, error: null }
            } catch {}
          }
        }
        return { data: { user: null }, error: null }
      },
    },

    channel(name: string) {
      return {
        on(_event: string, _opts: any, _callback: () => void) {
          return this
        },
        subscribe() {
          return this
        },
      }
    },

    removeChannel(_channel: any) {},
  }
}
