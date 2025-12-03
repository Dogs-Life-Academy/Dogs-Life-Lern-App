import { createClient } from '@supabase/supabase-js';
import { Question } from '../types.ts';

const SUPABASE_URL = 'https://suwcwfkbtueqwqfpxpyz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2N3ZmtidHVlcXdxZnB4cHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NzEyNjcsImV4cCI6MjA4MDM0NzI2N30.z8yPdQqDxzXFUfqcxielqPjgrQX67Lxr50DrV_Cnhvw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const fetchQuestions = async (): Promise<Question[]> => {
  const { data, error } = await supabase.from('questions').select('*');
  if (error) throw error;
  return data as Question[];
};

export const fetchQuizQuestions = async (category: string, count: number): Promise<Question[]> => {
  // Supabase doesn't natively support "random" sort efficiently without RPC.
  // For this scope, we fetch all by category and shuffle client-side or fetch a larger subset.
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('category', category);
  
  if (error) throw error;
  
  const shuffled = (data as Question[]).sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const deleteQuestion = async (id: number): Promise<void> => {
  const { error } = await supabase.from('questions').delete().eq('id', id);
  if (error) throw error;
};

export const upsertQuestion = async (question: Partial<Question>): Promise<void> => {
  const { error } = await supabase.from('questions').upsert(question);
  if (error) throw error;
};

export const bulkInsertQuestions = async (questions: Partial<Question>[]): Promise<void> => {
  const { error } = await supabase.from('questions').insert(questions);
  if (error) throw error;
};