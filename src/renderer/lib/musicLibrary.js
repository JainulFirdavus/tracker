const databaseName = "little-reset-audio";
const storeName = "tracks";
export const MAX_AUDIO_BYTES = 104857600;
const supportedAudio = /\.(aac|flac|m4a|mp3|ogg|opus|wav|webm)$/i;

export function isAudioFile(file) {
  return Boolean(
    file && (file.type.startsWith("audio/") || supportedAudio.test(file.name)),
  );
}

function openDatabase() {
  if (!globalThis.indexedDB)
    return Promise.reject(
      new Error("Local audio storage is unavailable in this browser."),
    );
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("Could not open local audio storage."));
  });
}

async function transact(mode, action) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    let result;
    const request = action(transaction.objectStore(storeName));
    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () =>
      reject(new Error("Could not access the selected audio file."));
    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };
    transaction.onerror = () => {
      database.close();
      reject(new Error("Could not save local audio data."));
    };
    transaction.onabort = () => {
      database.close();
      reject(new Error("Local audio storage was interrupted."));
    };
  });
}

function runTransaction(mode, action) {
  return openDatabase().then(
    (database) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, mode);
        let result;
        try {
          result = action(transaction.objectStore(storeName));
        } catch (error) {
          database.close();
          reject(error);
          return;
        }
        transaction.oncomplete = () => {
          database.close();
          resolve(result);
        };
        transaction.onerror = () => {
          database.close();
          reject(new Error("Could not save local audio data."));
        };
        transaction.onabort = () => {
          database.close();
          reject(new Error("Local audio storage was interrupted."));
        };
      }),
  );
}

export function saveAudioFile(file) {
  return transact("readwrite", (store) => store.put(file, "selected"));
}

export function loadAudioFile() {
  return transact("readonly", (store) => store.get("selected"));
}

export function clearAudioFile() {
  return transact("readwrite", (store) => store.delete("selected"));
}

export function saveLibraryFiles(entries) {
  return runTransaction("readwrite", (store) => {
    entries.forEach(({ id, file }) => store.put({ id, file }, id));
  });
}

export async function loadLibraryFiles() {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    let result = [];
    const request = transaction.objectStore(storeName).getAll();
    request.onsuccess = () => {
      result = request.result.filter(
        (entry) =>
          entry && typeof entry.id === "string" && entry.file instanceof Blob,
      );
    };
    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };
    transaction.onerror = () => {
      database.close();
      reject(new Error("Could not read the local music library."));
    };
    transaction.onabort = () => {
      database.close();
      reject(new Error("Reading the local music library was interrupted."));
    };
  });
}

export function loadLibraryFile(id) {
  return transact("readonly", (store) => store.get(id)).then(
    (entry) => entry?.file ?? null,
  );
}

export function deleteLibraryFile(id) {
  return runTransaction("readwrite", (store) => store.delete(id));
}
