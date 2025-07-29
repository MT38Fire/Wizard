import db from './db.js';

export const saveMatchResult = async (matchResult) => {
    const { room_name, players } = matchResult;
    
    if (!room_name || !Array.isArray(players)) {
        throw new Error('Invalid match result data');
    }
    
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
        // 1. Inserisci la partita
        const [matchResult] = await connection.query(
            'INSERT INTO matches (room_name) VALUES (?)',
            [room_name]
        );
        
        const matchId = matchResult.insertId;

        // 2. Inserisci i partecipanti
        for (const player of players) {
            await connection.query(
                `INSERT INTO users_matches (username, match_id, points, is_guest) 
                 VALUES (?, ?, ?, ?)`,
                [player.username, matchId, player.score, player.isGuest]
            );
        }
        
        await connection.commit();
        return { success: true, matchId };
    } catch (error) {
        await connection.rollback();
        console.error('Error saving match result:', error);
        throw error;
    } finally {
        connection.release();
    }
}