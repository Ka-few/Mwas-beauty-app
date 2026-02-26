# Sync Strategy: Local SQLite ↔ Cloud PostgreSQL

This document details the synchronization logic for the Salon Management System, specifically for handling payments and invoice status transitions.

## 1. Data Flow Architecture

We use a **Hybrid Sync** approach:
- **Relational Data (Invoices/Clients)**: Bi-directional synchronization using timestamps (`last_modified`).
- **Transactional Data (M-Pesa Payments)**: Cloud-first approach. All payments originate on the cloud; local SQLite tracks the remote status.

## 2. Sync Algorithm (Pseudo-code)

### A. Local to Cloud (Pushing Invoice)
1.  **Local**: Save invoice in SQLite with `sync_status = 'PENDING'`.
2.  **Sync Job**:
    ```javascript
    const localInvoices = db.get("SELECT * FROM sales WHERE sync_status = 'PENDING'");
    for (const inv of localInvoices) {
      try {
        await cloudApi.post("/sync/push", { invoice: inv, branchId });
        db.run("UPDATE sales SET sync_status = 'SYNCED' WHERE id = ?", inv.id);
      } catch (e) {
        logRetry(inv.id); // Add to retry queue with exponential backoff
      }
    }
    ```

### B. Cloud to Local (Status Reconciliation)
This is critical for M-Pesa payments where the callback hits the Cloud.
1.  **Cloud**: Receives callback -> Updates Postgres `payments.status = 'PAID'`.
2.  **Local (Poll)**:
    ```javascript
    const pendingPayments = db.get("SELECT * FROM sales WHERE status = 'PENDING' AND payment_method = 'Mpesa'");
    for (const p of pendingPayments) {
      const remoteStatus = await cloudApi.get(`/payments/${p.id}/status`);
      if (remoteStatus.status === 'PAID') {
        db.run("UPDATE sales SET status = 'COMPLETED', mpesa_code = ? WHERE id = ?", remoteStatus.mpesa_receipt, p.id);
      }
    }
    ```

## 3. Conflict Resolution Strategy

### Last-Write-Wins (LWW)
For non-transactional data (e.g., Client notes), we use UTC timestamps.
- If `local.updated_at > remote.updated_at`, push local.
- If `remote.updated_at > local.updated_at`, pull remote.

### Semantic Merge (Clients/Users)
To avoid `UNIQUE` constraint failures on phone numbers:
- If a client is created locally and a client with the same phone exists on the cloud:
    - Update local record with the cloud's UUID/Remote ID.
    - Merge notes/history.

## 4. Handling Failures

| Scenario | Strategy |
| :--- | :--- |
| **No Internet during Sale** | Sale is saved locally. User selects "Cash" or "M-Pesa (Later)". If M-Pesa is used, the app retries initiation once back online. |
| **Cloud Callback Failure** | Use the Daraja **Transaction Query API** manually or via a cron job on the cloud to verify status with Safaricom. |
| **Database Lock** | Use SQLite `IMMEDIATE` transactions to prevent write collisions during sync and local operations. |

## 5. Idempotency Handling

On the Cloud Backend, we enforce idempotency at two levels:
1.  **M-Pesa Callback**: Unique index on `mpesa_receipt`.
2.  **Payment Initiation**: Client generates a `request_id` (UUID). If the cloud receives the same `request_id` within 5 minutes, it returns the existing `checkout_request_id` instead of triggering a new STK push.
