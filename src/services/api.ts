
export interface LeaderboardEntry {
    id: string;
    username: string;
    avatarId?: string;
    avatarColor: string;
    score: number;
}

const API_BASE = '/api'; // Relative path, relying on Nginx proxy

export async function syncScore(data: LeaderboardEntry) {
    try {
        await fetch(`${API_BASE}/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (e) {
        console.warn("Failed to sync score to server:", e);
    }
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
        const res = await fetch(`${API_BASE}/leaderboard`);
        if (!res.ok) throw new Error("Network response was not ok");
        return await res.json();
    } catch (e) {
        console.warn("Failed to fetch leaderboard:", e);
        return [];
    }
}

export async function apiRegister(data: any) {
    const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Registration failed');
    return json;
}

export async function apiLogin(data: any) {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Login failed');
    return json;
}
