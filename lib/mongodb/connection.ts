import { connectToDatabase } from './client'

export async function getDb() {
  const { db } = await connectToDatabase()
  return db
}

export { connectToDatabase } from './client'
