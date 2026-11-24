import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fixmate';
const DB_NAME = 'fixmate';

let client = null;
let dbInstance = null;
let isUsingLocalStore = false;

// Local JSON fallback store for offline/local development without MongoDB
const fallbackFilePath = path.resolve('data_store.json');

const getLocalData = () => {
  if (!fs.existsSync(fallbackFilePath)) {
    const initialData = {
      users: [],
      services: [],
      bookings: [],
      payments: []
    };
    fs.writeFileSync(fallbackFilePath, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }
  try {
    return JSON.parse(fs.readFileSync(fallbackFilePath, 'utf-8'));
  } catch (err) {
    return { users: [], services: [], bookings: [], payments: [] };
  }
};

const saveLocalData = (data) => {
  fs.writeFileSync(fallbackFilePath, JSON.stringify(data, null, 2), 'utf-8');
};

// Create collection wrapper that supports MongoDB or Local Store with identical API
function createCollectionWrapper(name) {
  return {
    async find(query = {}) {
      if (!isUsingLocalStore && dbInstance) {
        return dbInstance.collection(name).find(query);
      }
      const data = getLocalData();
      let items = [...(data[name] || [])];

      // Simple query filtering
      items = items.filter(item => {
        for (const [key, val] of Object.entries(query)) {
          if (key === '$or') {
            const matchesAny = val.some(subQuery => {
              for (const [subK, subV] of Object.entries(subQuery)) {
                if (subV instanceof RegExp) {
                  if (!subV.test(item[subK] || '')) return false;
                } else if (item[subK] !== subV) {
                  return false;
                }
              }
              return true;
            });
            if (!matchesAny) return false;
          } else if (val instanceof RegExp) {
            if (!val.test(item[key] || '')) return false;
          } else if (typeof val === 'object' && val !== null && val.$regex) {
            const re = new RegExp(val.$regex, val.$options || 'i');
            if (!re.test(item[key] || '')) return false;
          } else if (typeof val === 'object' && val !== null && val.$in) {
            if (!val.$in.includes(item[key])) return false;
          } else if (key === '_id') {
            if (String(item._id) !== String(val)) return false;
          } else {
            if (item[key] !== val) return false;
          }
        }
        return true;
      });

      return {
        _items: items,
        sort(sortObj = {}) {
          const [sortKey, sortDir] = Object.entries(sortObj)[0] || ['createdAt', -1];
          this._items.sort((a, b) => {
            const valA = a[sortKey];
            const valB = b[sortKey];
            if (valA === valB) return 0;
            if (sortDir === 1 || sortDir === 'asc') return valA > valB ? 1 : -1;
            return valA < valB ? 1 : -1;
          });
          return this;
        },
        skip(n = 0) {
          this._items = this._items.slice(n);
          return this;
        },
        limit(n = 0) {
          if (n > 0) this._items = this._items.slice(0, n);
          return this;
        },
        async toArray() {
          return this._items;
        }
      };
    },

    async findOne(query = {}) {
      if (!isUsingLocalStore && dbInstance) {
        return dbInstance.collection(name).findOne(query);
      }
      const data = getLocalData();
      const items = data[name] || [];
      return items.find(item => {
        for (const [key, val] of Object.entries(query)) {
          if (key === '_id') {
            if (String(item._id) !== String(val)) return false;
          } else if (item[key] !== val) {
            return false;
          }
        }
        return true;
      }) || null;
    },

    async countDocuments(query = {}) {
      if (!isUsingLocalStore && dbInstance) {
        return dbInstance.collection(name).countDocuments(query);
      }
      const wrapper = await this.find(query);
      return wrapper._items.length;
    },

    async insertOne(doc) {
      if (!isUsingLocalStore && dbInstance) {
        return dbInstance.collection(name).insertOne(doc);
      }
      const data = getLocalData();
      if (!data[name]) data[name] = [];
      const newDoc = {
        _id: doc._id || new ObjectId().toString(),
        createdAt: doc.createdAt || new Date(),
        ...doc
      };
      data[name].push(newDoc);
      saveLocalData(data);
      return { insertedId: newDoc._id, acknowledged: true };
    },

    async insertMany(docs) {
      if (!isUsingLocalStore && dbInstance) {
        return dbInstance.collection(name).insertMany(docs);
      }
      const data = getLocalData();
      if (!data[name]) data[name] = [];
      const insertedDocs = docs.map(d => ({
        _id: d._id || new ObjectId().toString(),
        createdAt: d.createdAt || new Date(),
        ...d
      }));
      data[name].push(...insertedDocs);
      saveLocalData(data);
      return { insertedCount: insertedDocs.length, acknowledged: true };
    },

    async updateOne(filter, update) {
      if (!isUsingLocalStore && dbInstance) {
        return dbInstance.collection(name).updateOne(filter, update);
      }
      const data = getLocalData();
      const items = data[name] || [];
      const idx = items.findIndex(item => {
        for (const [key, val] of Object.entries(filter)) {
          if (key === '_id') {
            if (String(item._id) !== String(val)) return false;
          } else if (item[key] !== val) {
            return false;
          }
        }
        return true;
      });

      if (idx === -1) return { matchedCount: 0, modifiedCount: 0 };

      if (update.$set) {
        items[idx] = { ...items[idx], ...update.$set, updatedAt: new Date() };
      }
      if (update.$push) {
        for (const [pushKey, pushVal] of Object.entries(update.$push)) {
          if (!Array.isArray(items[idx][pushKey])) items[idx][pushKey] = [];
          items[idx][pushKey].push(pushVal);
        }
      }
      saveLocalData(data);
      return { matchedCount: 1, modifiedCount: 1, acknowledged: true };
    },

    async deleteOne(filter) {
      if (!isUsingLocalStore && dbInstance) {
        return dbInstance.collection(name).deleteOne(filter);
      }
      const data = getLocalData();
      const items = data[name] || [];
      const initialLen = items.length;
      data[name] = items.filter(item => {
        for (const [key, val] of Object.entries(filter)) {
          if (key === '_id') {
            if (String(item._id) === String(val)) return false;
          } else if (item[key] === val) {
            return false;
          }
        }
        return true;
      });
      const deleted = initialLen - data[name].length;
      saveLocalData(data);
      return { deletedCount: deleted, acknowledged: true };
    }
  };
}

export const usersCollection = createCollectionWrapper('users');
export const servicesCollection = createCollectionWrapper('services');
export const bookingsCollection = createCollectionWrapper('bookings');
export const paymentsCollection = createCollectionWrapper('payments');

export async function connectDB() {
  if (dbInstance) return dbInstance;
  try {
    if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('<username>')) {
      console.log('ℹ️ No remote MongoDB Atlas URI provided. Running on robust local data store engine.');
      isUsingLocalStore = true;
      return null;
    }
    client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 4000
    });
    await client.connect();
    dbInstance = client.db(DB_NAME);
    isUsingLocalStore = false;
    console.log('✅ Successfully connected to MongoDB Atlas database:', DB_NAME);
    return dbInstance;
  } catch (err) {
    console.warn('⚠️ Could not connect to MongoDB Atlas (' + err.message + '). Auto-falling back to persistent local store.');
    isUsingLocalStore = true;
    return null;
  }
}

export { ObjectId };
