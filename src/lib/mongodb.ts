import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || '';

interface GlobalMongo {
  _mongoClientPromise?: Promise<MongoClient>;
}

declare const globalThis: GlobalMongo;

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

/**
 * Checks if the configured MongoDB URI is valid and ready to connect
 */
export function isMongoConfigured(): boolean {
  if (!uri) return false;
  if (uri.includes('<db_password>') || uri.includes('<password>')) return false;
  return uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://');
}

/**
 * Gets the connected MongoDB client instance using Next.js cached connection pooling
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (!isMongoConfigured()) {
    throw new Error(
      'MONGODB_URI is not properly configured. Please supply a valid MongoDB connection string in .env.local or Vercel environment variables.'
    );
  }

  const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  if (process.env.NODE_ENV === 'development') {
    if (!globalThis._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalThis._mongoClientPromise = client.connect();
    }
    return globalThis._mongoClientPromise;
  } else {
    if (!clientPromise) {
      client = new MongoClient(uri, options);
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

/**
 * Gets database instance
 */
export async function getDb(dbName: string = 'snippet_vault'): Promise<Db> {
  const client = await getMongoClient();
  return client.db(dbName);
}
