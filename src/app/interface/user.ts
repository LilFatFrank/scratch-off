export interface User {
    wallet: string,
    fid: number,
    username: string,
    created_at: string,
    amount_won: number,
    cards_count: number,
    last_active: string,
    total_reveals: number,
    total_wins: number,
    notification_enabled?: boolean,
    notification_token?: string | null,
}