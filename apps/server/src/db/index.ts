import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { env } from '../env.ts'
import * as schema from './schema.ts'

const pool = mysql.createPool(env.databaseUrl)

export const db = drizzle(pool, { schema, mode: 'default' })
export { schema }
