import clientPromise from './mongodb';

export async function getDb() {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB_NAME || 'ha-hootz');
}

export async function getUsersCollection() {
  const db = await getDb();
  return db.collection('users');
}

export async function getPresentationsCollection() {
  const db = await getDb();
  return db.collection('presentations');
}

