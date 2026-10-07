import { loadTestEnv } from './env_helper';
loadTestEnv();
import { getDb } from '../src/lib/mongodb';
import { createUser, createSnippet, findSnippets, findSnippetById, updateSnippet, deleteSnippet } from '../src/lib/db';
import { hashPassword, verifyPassword, signToken, verifyToken } from '../src/lib/auth';
import { ObjectId } from 'mongodb';

async function run() {
  console.log('>>> Starting Live Auth & Authorization Verification <<<');
  const timestamp = Date.now();
  const userA_email = `user_a_${timestamp}@example.com`;
  const userB_email = `user_b_${timestamp}@example.com`;
  const plainPassword = 'Password123!';

  // 1. Password Hashing
  console.log('1. Testing Password Hashing & Verification...');
  const hashA = await hashPassword(plainPassword);
  const validA = await verifyPassword(plainPassword, hashA);
  const invalidA = await verifyPassword('WrongPassword', hashA);
  if (!validA || invalidA) throw new Error('Password verification logic failed!');
  console.log('   Password hashing verified.');

  // 2. Register User A in MongoDB Atlas
  console.log('2. Registering User A in MongoDB Atlas...');
  const userA = await createUser({
    email: userA_email,
    name: 'Alice Developer',
    passwordHash: hashA,
  });
  console.log('   User A registered with ID:', userA._id);

  // 3. Register User B in MongoDB Atlas
  console.log('3. Registering User B in MongoDB Atlas...');
  const hashB = await hashPassword(plainPassword);
  const userB = await createUser({
    email: userB_email,
    name: 'Bob Developer',
    passwordHash: hashB,
  });
  console.log('   User B registered with ID:', userB._id);

  // 4. Token & Session Verification
  console.log('4. Verifying JWT Session tokens...');
  const tokenA = signToken({ id: userA._id, email: userA.email, name: userA.name });
  const verifiedA = verifyToken(tokenA);
  if (!verifiedA || verifiedA.id !== userA._id) throw new Error('JWT token verification failed!');
  console.log('   JWT Session token valid.');

  // 5. User A Creates Private Snippet
  console.log('5. User A creating private snippet in MongoDB Atlas...');
  const snippetA = await createSnippet({
    userId: userA._id,
    title: 'Alice Secret Algorithm',
    code: 'function secret() { return 42; }',
    language: 'javascript',
    tags: ['#secret', '#alice'],
    summary: 'Alice private algorithm snippet',
    isPublic: false,
  });
  console.log('   Snippet A created with ID:', snippetA.id);

  // 6. User A Can Read Their Snippet
  console.log('6. User A fetching their snippets...');
  const aliceSnippets = await findSnippets({ userId: userA._id });
  const aliceHasSnippet = aliceSnippets.some(s => s.id === snippetA.id);
  if (!aliceHasSnippet) throw new Error('User A cannot view their own snippet!');
  console.log('   User A successfully retrieved snippet A.');

  // 7. User B Dashboard Isolation (User B must NOT see User A private snippet)
  console.log('7. User B fetching their snippets (Dashboard Isolation)...');
  const bobSnippets = await findSnippets({ userId: userB._id });
  const bobSeesAlice = bobSnippets.some(s => s.id === snippetA.id);
  if (bobSeesAlice) throw new Error('SECURITY VIOLATION: User B can see User A private snippet!');
  console.log('   Verified: User B dashboard does NOT contain User A private snippet.');

  // 8. IDOR Prevention: User B attempts to read User A snippet directly by ID
  console.log('8. IDOR Test: User B attempting to fetch User A snippet directly by ID...');
  const directReadByBob = await findSnippetById(snippetA.id, userB._id);
  if (directReadByBob !== null) throw new Error('SECURITY VIOLATION: User B accessed User A snippet directly!');
  console.log('   Verified: Direct access by User B returned null (Protected).');

  // 9. IDOR Prevention: User B attempts to edit User A snippet
  console.log('9. IDOR Test: User B attempting to edit User A snippet...');
  const maliciousEdit = await updateSnippet(snippetA.id, userB._id, {
    title: 'HACKED BY BOB',
  });
  if (maliciousEdit !== null) throw new Error('SECURITY VIOLATION: User B modified User A snippet!');
  const checkSnippet = await findSnippetById(snippetA.id, userA._id);
  if (!checkSnippet || checkSnippet.title !== 'Alice Secret Algorithm') {
    throw new Error('SECURITY VIOLATION: Snippet title changed!');
  }
  console.log('   Verified: Edit attempt by User B rejected.');

  // 10. IDOR Prevention: User B attempts to delete User A snippet
  console.log('10. IDOR Test: User B attempting to delete User A snippet...');
  const maliciousDelete = await deleteSnippet(snippetA.id, userB._id);
  if (maliciousDelete) throw new Error('SECURITY VIOLATION: User B deleted User A snippet!');
  const checkStillExists = await findSnippetById(snippetA.id, userA._id);
  if (!checkStillExists) throw new Error('SECURITY VIOLATION: Snippet deleted by unauthorized user!');
  console.log('    Verified: Delete attempt by User B rejected.');

  // 11. User A Legitimate Update
  console.log('11. User A updating their snippet...');
  const legitUpdate = await updateSnippet(snippetA.id, userA._id, {
    title: 'Alice Secret Algorithm v2',
  });
  if (!legitUpdate || legitUpdate.title !== 'Alice Secret Algorithm v2') {
    throw new Error('Legitimate update by User A failed!');
  }
  console.log('    Verified: User A updated snippet.');

  // 12. User A Legitimate Deletion
  console.log('12. User A deleting their snippet...');
  const legitDelete = await deleteSnippet(snippetA.id, userA._id);
  if (!legitDelete) throw new Error('Legitimate delete by User A failed!');
  const checkDeleted = await findSnippetById(snippetA.id, userA._id);
  if (checkDeleted !== null) throw new Error('Snippet still exists after User A deleted it!');
  console.log('    Verified: User A deleted snippet.');

  // Clean up test users from Atlas
  const db = await getDb();
  await db.collection('users').deleteMany({
    _id: { $in: [new ObjectId(userA._id), new ObjectId(userB._id)] }
  });
  console.log('13. Test users cleaned up from MongoDB Atlas.');

  console.log('\n>>> ALL AUTHENTICATION & AUTHORIZATION SECURITY CHECKS PASSED! <<<\n');
}

run().catch(err => {
  console.error('AUTH / AUTHORIZATION CHECK FAILED:', err);
  process.exit(1);
});
