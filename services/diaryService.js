// server/services/diaryService.js

const pool = require("../db");

async function saveDiaryToDB(user_id, diary, imageFiles, gpsList, locationInfo, tripDateDB) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [dRes] = await conn.query(
            `INSERT INTO ai_diary_info (user_id, diary_title, diary_content, trip_date)
            VALUES (?, ?, ?, ?)`,
            [user_id, diary.title, diary.content, tripDateDB]
        );
        const diary_idx = dRes.insertId;

        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            const { lat, lng } = gpsList[i] || {};

            const [pRes] = await conn.query(
                `INSERT INTO photo_info (user_id, file_name, exif_loc, taken_at, tags, lat, lng)
                VALUES (?, ?, ?, NOW(), '', ?, ?)`,
                [user_id, file.filename, locationInfo, lat, lng]
            );

            const photo_idx = pRes.insertId;

            await conn.query(
                `INSERT INTO ai_diary_photos (diary_idx, photo_idx, created_at)
                VALUES (?, ?, NOW())`,
                [diary_idx, photo_idx]
            );
        }

        await conn.commit();
        return diary_idx;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

async function fetchDiaryById(diaryId) {
    const conn = await pool.getConnection();
    const [diaries] = await conn.query(
        "SELECT * FROM ai_diary_info WHERE diary_idx = ?",
        [diaryId]
    );
    if (diaries.length === 0) throw new Error("일기 없음");

    const [photos] = await conn.query(
        `SELECT p.photo_idx, p.file_name, p.lat, p.lng, p.taken_at, p.tags, d.diary_title
   FROM ai_diary_photos ap
   JOIN photo_info p ON ap.photo_idx = p.photo_idx
   JOIN ai_diary_info d ON ap.diary_idx = d.diary_idx
   WHERE ap.diary_idx = ?`,
        [diaryId]
    );

    conn.release();
    return { diary: diaries[0], photos };
}

async function fetchDiaryByPhoto(photoIdx, user_id) {
    const [rows] = await pool.query(
        `SELECT d.diary_idx, d.diary_title, d.diary_content, d.trip_date
        FROM ai_diary_photos ap
        JOIN ai_diary_info d ON ap.diary_idx = d.diary_idx
        WHERE ap.photo_idx = ? AND d.user_id = ?`,
        [photoIdx, user_id]
    );
    if (rows.length === 0) throw new Error("해당 사진의 일기 없음");
    return rows[0];
}

async function fetchAllDiaries(user_id) {
    const [rows] = await pool.query(
        `SELECT d.diary_idx, d.diary_title, d.diary_content, d.trip_date,
                (SELECT p.file_name
                 FROM ai_diary_photos dp
                 LEFT JOIN photo_info p ON dp.photo_idx = p.photo_idx
                 WHERE dp.diary_idx = d.diary_idx
                 ORDER BY dp.created_at ASC LIMIT 1) AS file_name
         FROM ai_diary_info d
         WHERE d.user_id = ?
         ORDER BY d.trip_date DESC
         LIMIT 5`,
        [user_id]
    );
    return rows;
}


async function fetchRandomDiaries(user_id) {
    const [rows] = await pool.query(
        `SELECT d.diary_idx, d.diary_title, d.diary_content, d.trip_date,
            (SELECT p.file_name
             FROM ai_diary_photos dp
             LEFT JOIN photo_info p ON dp.photo_idx = p.photo_idx
             WHERE dp.diary_idx = d.diary_idx
             ORDER BY dp.created_at ASC LIMIT 1) AS file_name
        FROM ai_diary_info d
        WHERE d.user_id = ?
        ORDER BY RAND() LIMIT 3`,
        [user_id]
    );
    return rows;
}

async function deleteDiaryCascade(diaryId, user_id) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [photoRows] = await conn.query(
            `SELECT p.photo_idx
            FROM ai_diary_photos ap
            JOIN photo_info p ON ap.photo_idx = p.photo_idx
            WHERE ap.diary_idx = ? AND p.user_id = ?`,
            [diaryId, user_id]
        );
        const photoIdxList = photoRows.map(row => row.photo_idx);

        await conn.query(`DELETE FROM ai_diary_photos WHERE diary_idx = ?`, [diaryId]);

        if (photoIdxList.length > 0) {
            await conn.query(
                `DELETE FROM photo_info WHERE photo_idx IN (?) AND user_id = ?`,
                [photoIdxList, user_id]
            );
        }

        await conn.query(
            `DELETE FROM ai_diary_info WHERE diary_idx = ? AND user_id = ?`,
            [diaryId, user_id]
        );

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

module.exports = {
    saveDiaryToDB,
    fetchDiaryById,
    fetchDiaryByPhoto,
    fetchAllDiaries,
    fetchRandomDiaries,
    deleteDiaryCascade,
};