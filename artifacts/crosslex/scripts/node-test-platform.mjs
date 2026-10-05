import { registerHooks } from 'node:module';

// Unit tests exercise the real dictionary and scorer without loading native
// bridge code into Node. Storage remains functional within each test process.
registerHooks({
  resolve(specifier, context, nextResolve) {
    let source;
    if (specifier === 'react-native') {
      source = "export const Platform = { OS: 'web' };";
    } else if (specifier === '@react-native-async-storage/async-storage') {
      source = `const values = new Map(); export default {
        async getItem(key) { return values.get(key) ?? null; },
        async setItem(key, value) { values.set(key, value); },
        async removeItem(key) { values.delete(key); }
      };`;
    } else {
      return nextResolve(specifier, context);
    }
    return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true };
  },
});
