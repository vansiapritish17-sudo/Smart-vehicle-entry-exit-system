package com.svems.support;

import com.svems.repository.DocumentStore;

import java.util.*;
import java.util.function.Consumer;

/**
 * An in-memory {@link DocumentStore} with Firestore's transaction rules, so services
 * can be tested without a database:
 * <ul>
 *   <li>a transaction's writes are buffered and applied only if it completes;</li>
 *   <li>reads after the first write in a transaction are rejected, as Firestore does;</li>
 *   <li>updating a document that does not exist fails, as Firestore does.</li>
 * </ul>
 * {@link #failNextCommit()} makes the next transaction fail at commit, after its work
 * has run, to prove that nothing it wrote survives.
 */
public class InMemoryDocumentStore implements DocumentStore {

    private final Map<String, Map<String, Map<String, Object>>> collections = new HashMap<>();
    private int nextId = 1;
    private boolean failNextCommit;

    public void failNextCommit() {
        failNextCommit = true;
    }

    /** Every document in a collection, for assertions. */
    public List<Map<String, Object>> all(String collection) {
        return collection(collection).values().stream().map(InMemoryDocumentStore::copy).toList();
    }

    @Override
    public List<Map<String, Object>> findAll(String collection) {
        return all(collection);
    }

    @Override
    public Optional<Map<String, Object>> findById(String collection, String id) {
        return Optional.ofNullable(collection(collection).get(id)).map(InMemoryDocumentStore::copy);
    }

    @Override
    public String save(String collection, Map<String, Object> data) {
        String id = generateId(collection);
        saveWithId(collection, id, data);
        return id;
    }

    @Override
    public void saveWithId(String collection, String id, Map<String, Object> data) {
        data.put("id", id);
        collection(collection).put(id, copy(data));
    }

    @Override
    public void update(String collection, String id, Map<String, Object> fields) {
        Map<String, Object> doc = collection(collection).get(id);
        if (doc == null) throw new IllegalStateException("NOT_FOUND: " + collection + "/" + id);
        doc.putAll(fields);
    }

    @Override
    public void delete(String collection, String id) {
        collection(collection).remove(id);
    }

    @Override
    public void deleteAll(String collection, Collection<String> ids) {
        ids.forEach(id -> delete(collection, id));
    }

    @Override
    public List<Map<String, Object>> findWhere(String collection, String field, Object value) {
        return collection(collection).values().stream()
                .filter(doc -> Objects.equals(doc.get(field), value))
                .map(InMemoryDocumentStore::copy)
                .toList();
    }

    @Override
    public <T> T runTransaction(TransactionWork<T> work) throws Exception {
        BufferedTransaction tx = new BufferedTransaction();
        T result = work.run(tx);
        if (failNextCommit) {
            failNextCommit = false;
            throw new IllegalStateException("Simulated commit failure");
        }
        tx.writes.forEach(write -> write.accept(this));
        return result;
    }

    private class BufferedTransaction implements DocumentStore.Transaction {
        private final List<Consumer<InMemoryDocumentStore>> writes = new ArrayList<>();

        private void checkNoWritesYet() {
            if (!writes.isEmpty()) {
                throw new IllegalStateException("Firestore transactions require all reads before any write");
            }
        }

        @Override
        public Optional<Map<String, Object>> get(String collection, String id) {
            checkNoWritesYet();
            return findById(collection, id);
        }

        @Override
        public List<Map<String, Object>> findWhere(String collection, String field, Object value) {
            checkNoWritesYet();
            return InMemoryDocumentStore.this.findWhere(collection, field, value);
        }

        @Override
        public String newId(String collection) {
            return generateId(collection);
        }

        @Override
        public void set(String collection, String id, Map<String, Object> data) {
            Map<String, Object> snapshot = copy(data);
            writes.add(store -> store.saveWithId(collection, id, snapshot));
        }

        @Override
        public void update(String collection, String id, Map<String, Object> fields) {
            Map<String, Object> snapshot = copy(fields);
            writes.add(store -> store.update(collection, id, snapshot));
        }
    }

    private Map<String, Map<String, Object>> collection(String name) {
        return collections.computeIfAbsent(name, k -> new LinkedHashMap<>());
    }

    private String generateId(String collection) {
        return collection + "-" + nextId++;
    }

    private static Map<String, Object> copy(Map<String, Object> doc) {
        return new LinkedHashMap<>(doc);
    }
}
