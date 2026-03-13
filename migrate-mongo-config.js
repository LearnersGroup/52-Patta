require('dotenv').config({ path: './env/dev.env' });

const hasMongoCreds = !!(process.env.MONGO_USERNAME && process.env.MONGO_PASSWORD);

module.exports = {
    mongodb: {
        url: process.env.MONGO_HOST,
        databaseName: process.env.MONGO_DB_NAME,
        options: hasMongoCreds
            ? {
                auth: {
                    username: process.env.MONGO_USERNAME,
                    password: process.env.MONGO_PASSWORD,
                },
            }
            : {},
    },
    migrationsDir: 'migrations',
    changelogCollectionName: 'migrations_changelog',
    migrationFileExtension: '.js',
    moduleSystem: 'commonjs',
};
