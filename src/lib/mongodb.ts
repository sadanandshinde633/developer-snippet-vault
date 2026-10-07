import { MongoClient, Db } from 'mongodb';

interface GlobalMongo {
  _mongoClientPromise?: Promise<MongoClient>;
}

declare const globalThis: GlobalMongo;

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

/**
 * Automatically sanitizes MongoDB URIs by percent-encoding credentials if they contain special characters (like unescaped '@')
 */
export function sanitizeMongoUri(rawUri: string): string {
  if (!rawUri) return '';
  const trimmed = rawUri.trim();
  const protocolMatch = trimmed.match(/^(mongodb(?:\+srv)?:\/\/)(.*)$/);
  if (!protocolMatch) return trimmed;

  const protocol = protocolMatch[1];
  const rest = protocolMatch[2];

  const queryIndex = rest.search(/[\/?]/);
  const authAndHost = queryIndex !== -1 ? rest.substring(0, queryIndex) : rest;
  const tail = queryIndex !== -1 ? rest.substring(queryIndex) : '';

  const atIndex = authAndHost.lastIndexOf('@');
  if (atIndex === -1) return trimmed; // No credentials

  const authPart = authAndHost.substring(0, atIndex);
  const hostPart = authAndHost.substring(atIndex + 1);

  const colonIndex = authPart.indexOf(':');
  if (colonIndex === -1) return trimmed; // Only username

  const username = authPart.substring(0, colonIndex);
  const password = authPart.substring(colonIndex + 1);

  let decodedPass = password;
  try {
    decodedPass = decodeURIComponent(password);
  } catch {}

  const encodedPass = encodeURIComponent(decodedPass);
  return `${protocol}${username}:${encodedPass}@${hostPart}${tail}`;
}

/**
 * Checks if the configured MongoDB URI is valid and ready to connect
 */
export function isMongoConfigured(): boolean {
  const raw = process.env.MONGODB_URI || '';
  if (!raw) return false;
  if (raw.includes('<db_password>') || raw.includes('<password>')) return false;
  return raw.startsWith('mongodb://') || raw.startsWith('mongodb+srv://');
}

/**
 * Gets the connected MongoDB client instance using Next.js cached connection pooling
 */
export async function getMongoClient(): Promise<MongoClient> {
  const raw = process.env.MONGODB_URI || '';
  if (!isMongoConfigured()) {
    throw new Error(
      'MONGODB_URI is not properly configured. Please supply a valid MongoDB connection string in .env or Vercel environment variables.'
    );
  }

  const sanitizedUri = sanitizeMongoUri(raw);

  const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  if (process.env.NODE_ENV === 'development') {
    if (!globalThis._mongoClientPromise) {
      client = new MongoClient(sanitizedUri, options);
      globalThis._mongoClientPromise = client.connect();
    }
    return globalThis._mongoClientPromise;
  } else {
    if (!clientPromise) {
      client = new MongoClient(sanitizedUri, options);
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
