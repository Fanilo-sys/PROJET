import NodeCache from 'node-cache';

// Cache avec TTL de 5 minutes
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

export const getCache = <T>(key: string): T | undefined => {
  return cache.get<T>(key);
};

export const setCache = <T>(key: string, data: T): void => {
  cache.set(key, data);
};

export const deleteCache = (key: string): void => {
  cache.del(key);
};

export const clearCache = (): void => {
  cache.flushAll();
};

export default cache;