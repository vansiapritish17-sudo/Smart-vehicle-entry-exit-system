package com.svems.repository;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * The document operations the services need. {@link FirestoreRepository} is the
 * production implementation; tests run the same services against an in-memory one.
 *
 * Documents are plain maps; every read puts the document id under {@code "id"}.
 */
public interface DocumentStore {

    List<Map<String, Object>> findAll(String collection) throws Exception;

    Optional<Map<String, Object>> findById(String collection, String id) throws Exception;

    /** Save with a generated id, which is returned. */
    String save(String collection, Map<String, Object> data) throws Exception;

    void saveWithId(String collection, String id, Map<String, Object> data) throws Exception;

    void update(String collection, String id, Map<String, Object> fields) throws Exception;

    void delete(String collection, String id) throws Exception;

    /** Delete many documents at once. */
    void deleteAll(String collection, Collection<String> ids) throws Exception;

    List<Map<String, Object>> findWhere(String collection, String field, Object value) throws Exception;

    /**
     * Run {@code work} as one atomic unit: either every write it makes is applied or
     * none is. Reads inside it see a consistent snapshot, and the store may retry the
     * work if a document it read changed before commit — so the work must not have
     * side effects outside the transaction.
     */
    <T> T runTransaction(TransactionWork<T> work) throws Exception;

    @FunctionalInterface
    interface TransactionWork<T> {
        T run(Transaction tx) throws Exception;
    }

    /** Operations available inside a transaction. As in Firestore, all reads come before any write. */
    interface Transaction {

        Optional<Map<String, Object>> get(String collection, String id) throws Exception;

        List<Map<String, Object>> findWhere(String collection, String field, Object value) throws Exception;

        /** A fresh document id, for a document this transaction will create. */
        String newId(String collection);

        void set(String collection, String id, Map<String, Object> data);

        void update(String collection, String id, Map<String, Object> fields);
    }
}
