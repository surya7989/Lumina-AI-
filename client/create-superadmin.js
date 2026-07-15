import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env')

// Manual .env parser to avoid external dependencies
const env = {}
try {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const parts = trimmed.split('=')
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join('=').trim()
    }
  })
} catch (e) {
  console.error("Failed to read root .env file:", e.message)
  process.exit(1)
}

const supabaseUrl = env.SUPABASE_URL
const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in root .env")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function run() {
  const email = 'superadmin@aiplatform.com'
  const password = 'superadmin123'
  const name = 'Super Admin'

  console.log(`Creating superadmin auth user: ${email}...`)
  
  // 1. Create the user using admin API (bypasses email verification)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  if (authError) {
    if (authError.message.includes('already exists') || authError.message.includes('already registered') || authError.status === 422) {
      console.log("Auth user already exists. Attempting to create/update profile...")
      const { data: users, error: listError } = await supabase.auth.admin.listUsers()
      if (listError) {
        console.error("Error listing users:", listError)
        return
      }
      const existingUser = users.users.find(u => u.email === email)
      if (!existingUser) {
        console.error("Could not find existing user by email.")
        return
      }
      await createProfile(existingUser.id, name, email)
    } else {
      console.error("Failed to create auth user:", authError)
    }
    return
  }

  console.log("Auth user created successfully ID:", authData.user.id)
  await createProfile(authData.user.id, name, email)
}

async function createProfile(id, name, email) {
  console.log("Creating/updating profile row...")
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id,
      name,
      email,
      role: 'superadmin',
      status: 'active'
    }, { onConflict: 'id' })

  if (error) {
    console.error("Failed to upsert profile:", error)
  } else {
    console.log("Superadmin profile set up successfully!")
    console.log("\nCredentials:")
    console.log(`Email: ${email}`)
    console.log(`Password: superadmin123`)
  }
}

run()
