package com.svems.repository;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.google.firebase.cloud.FirestoreClient;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ExecutionException;

/**
 * Generic Firestore helper — wraps all CRUD operations used by services.
 */
@Repository
public class FirestoreRepository {

    private Firestore getDb() {
        return FirestoreClient.getFirestore();
    }

    /** Return all documents in a collection as List<Map>. */
    public List<Map<String, Object>> findAll(String collection)
            throws ExecutionException, InterruptedException {
        ApiFuture<QuerySnapshot> future = getDb().collection(collection).get();
        List<Map<String, Object>> results = new ArrayList<>();
        for (DocumentSnapshot doc : future.get().getDocuments()) {
            Map<String, Object> data = doc.getData();
            if (data != null) {
                data.put("id", doc.getId());
                results.add(data);
            }
        }
        return results;
    }

    /** Return a single document by ID. */
    public Optional<Map<String, Object>> findById(String collection, String id)
            throws ExecutionException, InterruptedException {
        DocumentSnapshot doc = getDb().collection(collection).document(id).get().get();
        if (!doc.exists()) return Optional.empty();
        Map<String, Object> data = doc.getData();
        if (data != null) data.put("id", doc.getId());
        return Optional.ofNullable(data);
    }

    /** Save document with auto-generated ID, returns the ID. */
    public String save(String collection, Map<String, Object> data)
            throws ExecutionException, InterruptedException {
        DocumentReference ref = getDb().collection(collection).document();
        data.put("id", ref.getId());
        ref.set(data).get();
        return ref.getId();
    }

    /** Save document with explicit ID. */
    public void saveWithId(String collection, String id, Map<String, Object> data)
            throws ExecutionException, InterruptedException {
        data.put("id", id);
        getDb().collection(collection).document(id).set(data).get();
    }

    /** Update specific fields in a document. */
    public void update(String collection, String id, Map<String, Object> fields)
            throws ExecutionException, InterruptedException {
        getDb().collection(collection).document(id).update(fields).get();
    }

    /** Delete a document. */
    public void delete(String collection, String id)
            throws ExecutionException, InterruptedException {
        getDb().collection(collection).document(id).delete().get();
    }

    /** Query documents where field equals value. */
    public List<Map<String, Object>> findWhere(String collection, String field, Object value)
            throws ExecutionException, InterruptedException {
        ApiFuture<QuerySnapshot> future = getDb().collection(collection)
                .whereEqualTo(field, value).get();
        List<Map<String, Object>> results = new ArrayList<>();
        for (DocumentSnapshot doc : future.get().getDocuments()) {
            Map<String, Object> data = doc.getData();
            if (data != null) {
                data.put("id", doc.getId());
                results.add(data);
            }
        }
        return results;
    }
}
