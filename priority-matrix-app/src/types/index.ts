/**
 * GLX: Connect the World - Civic Networking Platform
 * 
 * Copyright (c) 2025 rsl37
 * Licensed under PolyForm Shield License 1.0.0
 * 
 * ⚠️  TERMS:
 * - Commercial use strictly prohibited without written permission from copyright holder
 * - Forking/derivative works prohibited without written permission
 * - Violations subject to legal action and damages
 * 
 * See LICENSE file in repository root for full terms.
 * Contact: roselleroberts@pm.me for licensing inquiries
 */

export interface Priority {
    id: number;
    title: string;
    description: string;
    level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Task {
    id: number;
    title: string;
    priority: Priority;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface User {
    id: number;
    name: string;
    email: string;
}
