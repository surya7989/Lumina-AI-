import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const missingMsg = 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — please set these as build-time environment variables.'

let supabase

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
} else {
  // Avoid throwing during module initialization. Provide a lazy-throwing proxy so the app can render a friendly message.
  console.warn(missingMsg)
  const thrower = () => { throw new Error(missingMsg) }
  const handler = {
    get() {
      return new Proxy(thrower, { apply: () => { thrower() }, get: () => handler.get() })
    },
    apply: () => { thrower() },
  }
  supabase = new Proxy({}, handler)
}

export const supabaseClient = supabase
export default supabase
