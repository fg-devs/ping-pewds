/* eslint-disable func-names, import/no-extraneous-dependencies */
import { describe, it, after } from 'mocha';
import { assert } from 'chai';
import { CONFIG } from '../../globals';
import DatabaseManager from '../database';

describe('Start punishments tests', async function () {
    this.timeout(10000);
    let db: DatabaseManager;

    before(function () {
        db = new DatabaseManager({
            host: CONFIG.database.host,
            port: CONFIG.database.port,
            user: CONFIG.database.user,
            database: CONFIG.database.database,
            schema: `${CONFIG.database.schema}_test`,
            password: CONFIG.database.pass,
            max: CONFIG.database.connections,
        });
    });

    it('should create a punishment', async () => {
        let created = await db.punishments.create({
            index: 0,
            type: 'ban',
            target: 'user',
            targetKey: '1234',
            lenient: false
        })

        assert.isTrue(created);

        created = await db.punishments.create({
            index: 2,
            type: 'ban',
            target: 'user',
            targetKey: '1234',
            lenient: false
        })

        assert.isTrue(created);
    });

    it('should fetch all active punishments', async () => {
        const punishments = await db.punishments.getAllActive();

        assert.isTrue(punishments.length > 0)
    })
});
