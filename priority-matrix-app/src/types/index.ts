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