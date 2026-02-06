/**
 * GLX Systems Network Monitoring Platform
 * Blockchain Transaction Implementation
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface TransactionData {
  id?: string;
  transactionType: string;
  entityType: string;
  entityId: string;
  data: object;
  timestamp?: number;
  createdBy?: string | null;
}

export class Transaction {
  public id: string;
  public transactionType: string;
  public entityType: string;
  public entityId: string;
  public data: object;
  public timestamp: number;
  public createdBy: string | null;
  public hash: string;

  constructor(data: TransactionData) {
    this.id = data.id || uuidv4();
    this.transactionType = data.transactionType;
    this.entityType = data.entityType;
    this.entityId = data.entityId;
    this.data = data.data;
    this.timestamp = data.timestamp || Date.now();
    this.createdBy = data.createdBy || null;
    this.hash = this.calculateHash();
  }

  /**
   * Calculate SHA-256 hash of the transaction
   */
  public calculateHash(): string {
    const txData = JSON.stringify({
      id: this.id,
      transactionType: this.transactionType,
      entityType: this.entityType,
      entityId: this.entityId,
      data: this.data,
      timestamp: this.timestamp,
      createdBy: this.createdBy,
    });

    return crypto.createHash('sha256').update(txData).digest('hex');
  }

  /**
   * Validate transaction integrity
   */
  public isValid(): boolean {
    // Verify hash
    if (this.hash !== this.calculateHash()) {
      return false;
    }

    // Validate required fields
    if (!this.transactionType || !this.entityType || !this.entityId) {
      return false;
    }

    // Validate timestamp
    if (this.timestamp > Date.now()) {
      return false;
    }

    return true;
  }

  /**
   * Serialize transaction for storage
   */
  public toJSON() {
    return {
      id: this.id,
      hash: this.hash,
      transactionType: this.transactionType,
      entityType: this.entityType,
      entityId: this.entityId,
      data: this.data,
      timestamp: this.timestamp,
      createdBy: this.createdBy,
    };
  }

  /**
   * Deserialize transaction from JSON
   */
  public static fromJSON(json: any): Transaction {
    const tx = new Transaction({
      id: json.id,
      transactionType: json.transactionType,
      entityType: json.entityType,
      entityId: json.entityId,
      data: json.data,
      timestamp: json.timestamp,
      createdBy: json.createdBy,
    });

    // Verify hash matches
    if (tx.hash !== json.hash) {
      throw new Error('Transaction hash mismatch during deserialization');
    }

    return tx;
  }

  /**
   * Create a transaction for supply chain events
   */
  public static createSupplyChainTransaction(
    eventType: string,
    shipmentId: string,
    data: object,
    userId?: string
  ): Transaction {
    return new Transaction({
      transactionType: eventType,
      entityType: 'supply_chain',
      entityId: shipmentId,
      data,
      createdBy: userId,
    });
  }

  /**
   * Create a transaction for ATC events
   */
  public static createATCTransaction(
    eventType: string,
    flightNumber: string,
    data: object,
    userId?: string
  ): Transaction {
    return new Transaction({
      transactionType: eventType,
      entityType: 'atc',
      entityId: flightNumber,
      data,
      createdBy: userId,
    });
  }

  /**
   * Create a transaction for logistics events
   */
  public static createLogisticsTransaction(
    eventType: string,
    entityId: string,
    data: object,
    userId?: string
  ): Transaction {
    return new Transaction({
      transactionType: eventType,
      entityType: 'logistics',
      entityId,
      data,
      createdBy: userId,
    });
  }
}
