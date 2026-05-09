import { supabase } from '@/lib/supabase'
import type { CalculatorHistory } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export const calculatorService = {
  async getHistory(userId: string): Promise<CalculatorHistory[]> {
    const { data, error } = await db
      .from('calculator_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return data || []
  },

  async saveCalculation(calc: Omit<CalculatorHistory, 'id' | 'created_at'>): Promise<CalculatorHistory> {
    const { data, error } = await db
      .from('calculator_history')
      .insert(calc)
      .select()
      .single()
    if (error) throw error
    return data
  },
}

export function calculateBunks(attended: number, total: number, target: number) {
  const currentPct = total > 0 ? (attended / total) * 100 : 0
  const canMiss = Math.max(0, Math.floor((attended * 100) / target - total))
  const mustAttend =
    currentPct >= target
      ? 0
      : Math.ceil((target / 100 * total - attended) / (1 - target / 100))

  return { currentPct, canMiss, mustAttend }
}
