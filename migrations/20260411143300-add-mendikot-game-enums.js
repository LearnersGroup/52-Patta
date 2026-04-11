module.exports = {
    async up(db) {
        await db.collection('games').updateMany(
            {
                game_type: { $exists: false },
            },
            {
                $set: { game_type: 'kaliteri' },
            }
        );

        await db.collection('games').updateMany(
            {
                trump_mode: { $exists: false },
                game_type: 'judgement',
            },
            {
                $set: { trump_mode: 'random' },
            }
        );

        // For kaliteri/older rows without a trump_mode, leave the field unset —
        // Mongoose will apply the default ("random") on next save.

        await db.collection('games').updateMany(
            {
                band_hukum_pick_phase: { $exists: false },
            },
            {
                $set: { band_hukum_pick_phase: null },
            }
        );

        await db.collection('games').updateMany(
            {
                rounds_count: { $exists: false },
            },
            {
                $set: { rounds_count: null },
            }
        );

        await db.collection('games').updateMany(
            {
                team_a_players: { $exists: false },
            },
            {
                $set: { team_a_players: [] },
            }
        );

        await db.collection('games').updateMany(
            {
                team_b_players: { $exists: false },
            },
            {
                $set: { team_b_players: [] },
            }
        );
    },

    async down(db) {
        await db.collection('games').updateMany(
            {},
            {
                $unset: {
                    band_hukum_pick_phase: '',
                    rounds_count: '',
                    team_a_players: '',
                    team_b_players: '',
                },
            }
        );

        await db.collection('games').updateMany(
            {
                game_type: 'mendikot',
            },
            {
                $set: { game_type: 'kaliteri' },
            }
        );

        await db.collection('games').updateMany(
            {
                trump_mode: { $in: ['band', 'cut'] },
            },
            {
                $set: { trump_mode: 'random' },
            }
        );

        await db.collection('games').updateMany(
            {
                state: 'band-hukum-pick',
            },
            {
                $set: { state: 'lobby' },
            }
        );
    },
};
