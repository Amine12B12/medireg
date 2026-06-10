'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    throw new Error(`Missing Supabase env vars: URL=${url}, KEY=${key ? 'present' : 'missing'}`)
  }
  
  return createBrowserClient(url, key)
}