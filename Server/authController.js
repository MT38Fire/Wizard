import db from './db.js';
import bcrypt from 'bcrypt';

///qui dovrebbe esserci tutto

export const loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Username non trovato' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Password errata' });
    }

    res.status(200).json({ username: user.username });
  } catch (error) {
    console.error('Errore login:', error);
    res.status(500).json({ message: 'Errore server durante il login' });
  }
};

export const registerUser = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username e password obbligatori' });
  }

  try {
    const [existingUser] = await db.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Username già in uso' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );

    res.status(201).json({ message: 'Utente registrato con successo' });

  } catch (error) {
    console.error('Errore registrazione:', error);
    res.status(500).json({ message: 'Errore server durante la registrazione' });
  }
};

export const sendProfileInfo = async (req, res) => {
  const { username } = req.params;

  if (!username) {
    return res.status(400).json({ message: 'Username mancante' });
  }

  const connection = await db.getConnection();
  
  try {
    // 1. Ottieni le informazioni base dell'utente
    const [userRows] = await connection.query(
      `SELECT 
        username, 
        registration_date,
        (SELECT COUNT(*) FROM users_matches WHERE username = ?) AS games_played,
        (SELECT COUNT(*) FROM (
          SELECT match_id FROM users_matches 
          WHERE username = ? 
          GROUP BY match_id 
          HAVING MAX(points) = (
            SELECT MAX(points) FROM users_matches um2 
            WHERE um2.match_id = users_matches.match_id
          )
        ) AS wins) AS wins,
        (SELECT COALESCE(SUM(points), 0) FROM users_matches WHERE username = ?) AS total_points
      FROM users 
      WHERE username = ?`,
      [username, username, username, username]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    const user = userRows[0];

    // 2. Ottieni lo storico delle partite (ultime 10) con posizione calcolata
    const [matchRows] = await connection.query(
      `SELECT 
        m.room_name,
        m.ending_time AS match_date,
        um.points,
        um.is_guest,
        (SELECT COUNT(*) + 1 
         FROM users_matches um2 
         WHERE um2.match_id = um.match_id AND um2.points > um.points) AS position
      FROM 
        users_matches um
      JOIN 
        matches m ON um.match_id = m.match_id
      WHERE 
        um.username = ?
      ORDER BY 
        m.ending_time DESC
      LIMIT 10`,
      [username]
    );

    res.status(200).json({
      user: {
        username: user.username,
        registration_date: user.registration_date,
        games_played: user.games_played,
        wins: user.wins,
        total_points: user.total_points
      },
      matchHistory: matchRows.map(row => ({
        room_name: row.room_name,
        match_date: row.match_date,
        points: row.points,
        position: row.position,
        is_guest: row.is_guest
      }))
    });

  } catch (error) {
    console.error('Errore recupero profilo:', error);
    res.status(500).json({ message: 'Errore server durante il recupero del profilo' });
  } finally {
    connection.release();
  }
};