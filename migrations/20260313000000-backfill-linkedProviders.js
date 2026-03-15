module.exports = {
    async up(db) {
        await db.collection('users').updateMany(
            {
                provider: { $in: ['google', 'facebook'] },
                providerId: { $type: 'string', $ne: '' },
                'linkedProviders.0': { $exists: false },
            },
            [
                {
                    $set: {
                        linkedProviders: [
                            {
                                provider: '$provider',
                                providerId: '$providerId',
                                linkedAt: { $ifNull: ['$date', '$$NOW'] },
                            },
                        ],
                    },
                },
            ]
        );
    },

    async down(db) {
        await db.collection('users').updateMany(
            {
                'linkedProviders.0': { $exists: true },
            },
            [
                {
                    $set: {
                        provider: {
                            $ifNull: [{ $arrayElemAt: ['$linkedProviders.provider', 0] }, '$provider'],
                        },
                        providerId: {
                            $ifNull: [{ $arrayElemAt: ['$linkedProviders.providerId', 0] }, '$providerId'],
                        },
                        linkedProviders: [],
                    },
                },
            ]
        );
    },
};
