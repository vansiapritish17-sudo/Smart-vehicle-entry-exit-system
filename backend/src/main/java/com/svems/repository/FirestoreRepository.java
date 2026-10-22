package com.svems.repository;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.google.firebase.cloud.FirestoreClient;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ExecutionException;

/**
 * Firestore implementation of {@link DocumentStore} — wraps all operations used by services.
 */
@Repository
public class FirestoreRepository implements DocumentStore {

    private Firestore getDb() {
        return FirestoreClient.getFirestore();
    }

    /** Return all documents in a collection as List<Map>. */
    @Override
    public List<Map<String, Object>> findAll(String collection)
            throws ExecutionException, InterruptedException {
        return toMaps(getDb().collection(collection).get().get());
    }

    /** Return a single document by ID. */
    @Override
    public Optional<Map<String, Object>> findById(String collection, String id)
            throws ExecutionException, InterruptedException {
        return toMap(getDb().collection(collection).document(id).get().get());
    }

    /** Save document with auto-generated ID, returns the ID. */
    @Override
    public String save(String collection, Map<String, Object> data)
            throws ExecutionException, InterruptedException {
        DocumentReference ref = getDb().collection(collection).document();
        data.put("id", ref.getId());
        ref.set(data).get();
        return ref.getId();
    }

    /** Save document with explicit ID. */
    @Override
    public void saveWithId(String collection, String id, Map<String, Object> data)
            throws ExecutionException, InterruptedException {
        data.put("id", id);
        getDb().collection(collection).document(id).set(data).get();
    }

    /** Update specific fields in a document. */
    @Override
    public void update(String collection, String id, Map<String, Object> fields)
            throws ExecutionException, InterruptedException {
        getDb().collection(collection).document(id).update(fields).get();
    }

    /** Delete a document. */
    @Override
    public void delete(String collection, String id)
            throws ExecutionException, InterruptedException {
        getDb().collection(collection).document(id).delete().get();
    }

    /** Delete many documents, in batches of Firestore's 500-write limit. */
    @Override
    public void deleteAll(String collection, Collection<String> ids)
            throws ExecutionException, InterruptedException {
        Firestore db = getDb();
        List<String> all = new ArrayList<>(ids);
        for (int start = 0; start < all.size(); start += 500) {
            WriteBatch batch = db.batch();
            for (String id : all.subList(start, Math.min(start + 500, all.size()))) {
                batch.delete(db.collection(collection).document(id));
            }
            batch.commit().get();
        }
    }

    /** Query documents where field equals value. */
    @Override
    public List<Map<String, Object>> findWhere(String collection, String field, Object value)
            throws ExecutionException, InterruptedException {
        return toMaps(getDb().collection(collection).whereEqualTo(field, value).get().get());
    }

    /**
     * Firestore transaction: the documents it reads are locked until commit, and the
     * function is retried if one of them changed, so its checks hold when it writes.
     */
    @Override
    public <T> T runTransaction(TransactionWork<T> work) throws Exception {
        Firestore db = getDb();
        ApiFuture<T> result = db.runTransaction(tx -> work.run(new FirestoreTransaction(db, tx)));
        try {
            return result.get();
        } catch (ExecutionException e) {
            // Surface the work's own exception (e.g. an ApiException), not the future's wrapper.
            if (e.getCause() instanceof Exception cause) throw cause;
            throw e;
        }
    }

    private record FirestoreTransaction(Firestore db, com.google.cloud.firestore.Transaction tx)
            implements DocumentStore.Transaction {

        @Override
        public Optional<Map<String, Object>> get(String collection, String id) throws Exception {
            return toMap(tx.get(db.collection(collection).document(id)).get());
        }

        @Override
        public List<Map<String, Object>> findWhere(String collection, String field, Object value) throws Exception {
            return toMaps(tx.get(db.collection(collection).whereEqualTo(field, value)).get());
        }

        @Override
        public String newId(String collection) {
            return db.collection(collection).document().getId();
        }

        @Override
        public void set(String collection, String id, Map<String, Object> data) {
            data.put("id", id);
            tx.set(db.collection(collection).document(id), data);
        }

        @Override
        public void update(String collection, String id, Map<String, Object> fields) {
            tx.update(db.collection(collection).document(id), fields);
        }
    }

    private static Optional<Map<String, Object>> toMap(DocumentSnapshot doc) {
        if (!doc.exists()) return Optional.empty();
        Map<String, Object> data = doc.getData();
        if (data != null) data.put("id", doc.getId());
        return Optional.ofNullable(data);
    }

    private static List<Map<String, Object>> toMaps(QuerySnapshot snapshot) {
        List<Map<String, Object>> results = new ArrayList<>();
        for (DocumentSnapshot doc : snapshot.getDocuments()) {
            Map<String, Object> data = doc.getData();
            if (data != null) {
                data.put("id", doc.getId());
                results.add(data);
            }
        }
        return results;
    }
}
