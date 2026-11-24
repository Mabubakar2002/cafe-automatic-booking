// Server-only Supabase-compatible client (runs on Node server: directly accesses store.ts)
import { localDb } from './store'

class LocalServerQueryBuilder {
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
    return localDb.query(this.table, {
      filters: this.filters,
      order: this.sortOption,
      limit: this.limitCount,
      single: this.isSingle,
      maybeSingle: this.isMaybeSingle,
      count: this.countOption,
      head: this.isHead,
    })
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
      return localDb.insert(self.table, payload)
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
            const r = await localDb.update(self.table, patch, filters)
            const row = Array.isArray(r.data) ? r.data[0] : r.data
            return { data: row, error: r.error }
          },
          then(onfulfilled?: any, onrejected?: any) {
            return Promise.resolve(localDb.update(self.table, patch, filters)).then(onfulfilled, onrejected)
          },
        }
      },
      then(onfulfilled?: any, onrejected?: any) {
        return Promise.resolve(localDb.update(self.table, patch, filters)).then(onfulfilled, onrejected)
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
      then(onfulfilled?: any, onrejected?: any) {
        return Promise.resolve(localDb.delete(self.table, filters)).then(onfulfilled, onrejected)
      },
    }
  }
}

export function createLocalServerClient() {
  return {
    from(table: string) {
      return new LocalServerQueryBuilder(table)
    },

    async rpc(fn: string, args: Record<string, any> = {}) {
      return localDb.rpc(fn, args)
    },

    auth: {
      async signInWithPassword(credentials: { email: string; password: string }) {
        return localDb.signInWithPassword(credentials)
      },
      async signOut() {
        return { error: null }
      },
      async getUser() {
        return { data: { user: null }, error: null }
      },
    },
  }
}
