import { ObjectId } from 'mongodb';
import { getDb, isMongoConfigured } from './mongodb';
import { SnippetDTO } from './types';

export interface UserDoc {
  _id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SnippetDoc {
  _id: string;
  userId: string;
  title: string;
  code: string;
  language: string;
  tags: string[];
  summary: string | null;
  description: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory memory fallback store when MONGODB_URI is not yet configured with real password
const memoryUsers = new Map<string, UserDoc>();
const memorySnippets = new Map<string, SnippetDoc>();

// Helper to convert Mongo or Memory doc to SnippetDTO
export function toSnippetDTO(doc: SnippetDoc, userEmail?: string, userName?: string): SnippetDTO {
  return {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description,
    code: doc.code,
    language: doc.language,
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    summary: doc.summary,
    isPublic: doc.isPublic,
    userId: doc.userId,
    user: userEmail ? { id: doc.userId, email: userEmail, name: userName || null } : undefined,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

// ========================
// USER OPERATIONS
// ========================

export async function findUserByEmail(email: string): Promise<UserDoc | null> {
  const normalized = email.toLowerCase().trim();
  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      const user = await db.collection('users').findOne({ email: normalized });
      if (!user) return null;
      return {
        _id: user._id.toString(),
        email: user.email,
        name: user.name ?? null,
        passwordHash: user.passwordHash,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (err) {
      console.error('MongoDB findUserByEmail error:', err);
      throw err;
    }
  }

  // Fallback store
  for (const u of memoryUsers.values()) {
    if (u.email === normalized) return u;
  }
  return null;
}

export async function findUserById(id: string): Promise<UserDoc | null> {
  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      const objectId = ObjectId.isValid(id) ? new ObjectId(id) : null;
      const user = await db.collection('users').findOne(objectId ? { _id: objectId } : { _id: id as any });
      if (!user) return null;
      return {
        _id: user._id.toString(),
        email: user.email,
        name: user.name ?? null,
        passwordHash: user.passwordHash,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (err) {
      console.error('MongoDB findUserById error:', err);
      throw err;
    }
  }

  return memoryUsers.get(id) || null;
}

export async function createUser(data: { email: string; name?: string | null; passwordHash: string }): Promise<UserDoc> {
  const normalized = data.email.toLowerCase().trim();
  const now = new Date();

  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      const res = await db.collection('users').insertOne({
        email: normalized,
        name: data.name?.trim() || null,
        passwordHash: data.passwordHash,
        createdAt: now,
        updatedAt: now,
      });

      return {
        _id: res.insertedId.toString(),
        email: normalized,
        name: data.name?.trim() || null,
        passwordHash: data.passwordHash,
        createdAt: now,
        updatedAt: now,
      };
    } catch (err) {
      console.error('MongoDB createUser error:', err);
      throw err;
    }
  }

  const id = new ObjectId().toString();
  const user: UserDoc = {
    _id: id,
    email: normalized,
    name: data.name?.trim() || null,
    passwordHash: data.passwordHash,
    createdAt: now,
    updatedAt: now,
  };
  memoryUsers.set(id, user);
  return user;
}

// ========================
// SNIPPET OPERATIONS
// ========================

export async function findSnippets(params: {
  userId?: string;
  isPublic?: boolean;
  search?: string;
  language?: string;
  tag?: string;
}): Promise<SnippetDTO[]> {
  const { userId, isPublic, search, language, tag } = params;

  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      const query: any = {};

      if (userId) {
        query.userId = userId;
      } else if (isPublic !== undefined) {
        query.isPublic = isPublic;
      }

      if (language && language !== 'all') {
        query.language = language.toLowerCase().trim();
      }

      if (tag) {
        const normalizedTag = tag.startsWith('#') ? tag.toLowerCase() : `#${tag.toLowerCase()}`;
        query.tags = normalizedTag;
      }

      if (search) {
        const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        query.$or = [
          { title: regex },
          { code: regex },
          { summary: regex },
          { description: regex },
          { tags: regex },
        ];
      }

      const docs = await db
        .collection('snippets')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      // Collect user info for public or shared display
      const userIds = Array.from(new Set(docs.map((d) => d.userId)));
      const usersMap = new Map<string, { email: string; name: string | null }>();

      if (userIds.length > 0) {
        const objectIds = userIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
        const users = await db
          .collection('users')
          .find({ _id: { $in: objectIds } })
          .toArray();

        for (const u of users) {
          usersMap.set(u._id.toString(), { email: u.email, name: u.name });
        }
      }

      return docs.map((d) => {
        const user = usersMap.get(d.userId);
        return toSnippetDTO(
          {
            _id: d._id.toString(),
            userId: d.userId,
            title: d.title,
            code: d.code,
            language: d.language,
            tags: d.tags || [],
            summary: d.summary ?? null,
            description: d.description ?? null,
            isPublic: Boolean(d.isPublic),
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          },
          user?.email,
          user?.name || undefined
        );
      });
    } catch (err) {
      console.error('MongoDB findSnippets error:', err);
      throw err;
    }
  }

  // Fallback memory store
  let items = Array.from(memorySnippets.values());

  if (userId) {
    items = items.filter((s) => s.userId === userId);
  } else if (isPublic !== undefined) {
    items = items.filter((s) => s.isPublic === isPublic);
  }

  if (language && language !== 'all') {
    items = items.filter((s) => s.language.toLowerCase() === language.toLowerCase().trim());
  }

  if (tag) {
    const normalizedTag = tag.startsWith('#') ? tag.toLowerCase() : `#${tag.toLowerCase()}`;
    items = items.filter((s) => s.tags.map((t) => t.toLowerCase()).includes(normalizedTag));
  }

  if (search) {
    const q = search.toLowerCase();
    items = items.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.summary && s.summary.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return items.map((doc) => {
    const user = memoryUsers.get(doc.userId);
    return toSnippetDTO(doc, user?.email, user?.name || undefined);
  });
}

export async function findSnippetById(id: string, currentUserId?: string): Promise<SnippetDTO | null> {
  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      const objectId = ObjectId.isValid(id) ? new ObjectId(id) : null;
      const query = objectId ? { _id: objectId } : { _id: id as any };
      const doc = await db.collection('snippets').findOne(query);

      if (!doc) return null;

      // Ownership and privacy check
      if (!doc.isPublic && doc.userId !== currentUserId) {
        return null;
      }

      const user = await findUserById(doc.userId);

      return toSnippetDTO(
        {
          _id: doc._id.toString(),
          userId: doc.userId,
          title: doc.title,
          code: doc.code,
          language: doc.language,
          tags: doc.tags || [],
          summary: doc.summary ?? null,
          description: doc.description ?? null,
          isPublic: Boolean(doc.isPublic),
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
        user?.email,
        user?.name || undefined
      );
    } catch (err) {
      console.error('MongoDB findSnippetById error:', err);
      throw err;
    }
  }

  const doc = memorySnippets.get(id);
  if (!doc) return null;

  if (!doc.isPublic && doc.userId !== currentUserId) {
    return null;
  }

  const user = memoryUsers.get(doc.userId);
  return toSnippetDTO(doc, user?.email, user?.name || undefined);
}

export async function createSnippet(data: {
  userId: string;
  title: string;
  code: string;
  language: string;
  tags: string[];
  summary?: string | null;
  description?: string | null;
  isPublic?: boolean;
}): Promise<SnippetDTO> {
  const now = new Date();
  const cleanDoc = {
    userId: data.userId,
    title: data.title.trim(),
    code: data.code.trim(),
    language: data.language.toLowerCase().trim(),
    tags: data.tags,
    summary: data.summary?.trim() || null,
    description: data.description?.trim() || null,
    isPublic: Boolean(data.isPublic),
    createdAt: now,
    updatedAt: now,
  };

  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      const res = await db.collection('snippets').insertOne(cleanDoc);

      const user = await findUserById(data.userId);

      return toSnippetDTO(
        {
          _id: res.insertedId.toString(),
          ...cleanDoc,
        },
        user?.email,
        user?.name || undefined
      );
    } catch (err) {
      console.error('MongoDB createSnippet error:', err);
      throw err;
    }
  }

  const id = new ObjectId().toString();
  const doc: SnippetDoc = {
    _id: id,
    ...cleanDoc,
  };
  memorySnippets.set(id, doc);

  const user = memoryUsers.get(data.userId);
  return toSnippetDTO(doc, user?.email, user?.name || undefined);
}

/**
 * Updates a snippet with strict ownership guard:
 * Only updates if { _id: id, userId: currentUserId }
 */
export async function updateSnippet(
  id: string,
  userId: string,
  updates: {
    title?: string;
    code?: string;
    language?: string;
    tags?: string[];
    summary?: string | null;
    description?: string | null;
    isPublic?: boolean;
  }
): Promise<SnippetDTO | null> {
  const now = new Date();
  const setFields: any = { updatedAt: now };

  if (updates.title !== undefined) setFields.title = updates.title.trim();
  if (updates.code !== undefined) setFields.code = updates.code.trim();
  if (updates.language !== undefined) setFields.language = updates.language.toLowerCase().trim();
  if (updates.tags !== undefined) setFields.tags = updates.tags;
  if (updates.summary !== undefined) setFields.summary = updates.summary?.trim() || null;
  if (updates.description !== undefined) setFields.description = updates.description?.trim() || null;
  if (updates.isPublic !== undefined) setFields.isPublic = Boolean(updates.isPublic);

  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      const objectId = ObjectId.isValid(id) ? new ObjectId(id) : null;
      const query = objectId
        ? { _id: objectId, userId }
        : { _id: id as any, userId };

      const res = await db.collection('snippets').findOneAndUpdate(
        query,
        { $set: setFields },
        { returnDocument: 'after' }
      );

      if (!res) return null;

      const user = await findUserById(userId);

      return toSnippetDTO(
        {
          _id: res._id.toString(),
          userId: res.userId,
          title: res.title,
          code: res.code,
          language: res.language,
          tags: res.tags,
          summary: res.summary,
          description: res.description,
          isPublic: res.isPublic,
          createdAt: res.createdAt,
          updatedAt: res.updatedAt,
        },
        user?.email,
        user?.name || undefined
      );
    } catch (err) {
      console.error('MongoDB updateSnippet error:', err);
      throw err;
    }
  }

  // Fallback memory store with strict ownership check
  const doc = memorySnippets.get(id);
  if (!doc) return null;

  // Strict ownership check
  if (doc.userId !== userId) {
    return null;
  }

  Object.assign(doc, setFields);
  memorySnippets.set(id, doc);

  const user = memoryUsers.get(userId);
  return toSnippetDTO(doc, user?.email, user?.name || undefined);
}

/**
 * Deletes a snippet with strict ownership guard:
 * Only deletes if { _id: id, userId: currentUserId }
 */
export async function deleteSnippet(id: string, userId: string): Promise<boolean> {
  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      const objectId = ObjectId.isValid(id) ? new ObjectId(id) : null;
      const query = objectId
        ? { _id: objectId, userId }
        : { _id: id as any, userId };

      const res = await db.collection('snippets').deleteOne(query);
      return res.deletedCount > 0;
    } catch (err) {
      console.error('MongoDB deleteSnippet error:', err);
      throw err;
    }
  }

  // Fallback memory store with strict ownership check
  const doc = memorySnippets.get(id);
  if (!doc) return false;

  // Strict ownership check
  if (doc.userId !== userId) {
    return false;
  }

  return memorySnippets.delete(id);
}

// Utility to clear test memory store
export function resetMemoryDb() {
  memoryUsers.clear();
  memorySnippets.clear();
}
