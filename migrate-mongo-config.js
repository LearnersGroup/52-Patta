require('dotenv').config({ path: './env/dev.env' });

module.exports = {
    mongodb: {
        url: process.env.MONGO_HOST,
    },
    migrationsDir: 'migrations',
    changelogCollectionName: 'migrations_changelog',
    migrationFileExtension: '.js',
    moduleSystem: 'commonjs',
};
