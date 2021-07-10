/* eslint-disable func-names, import/no-extraneous-dependencies */
import { describe, it, after } from 'mocha';
import { assert } from 'chai';
import { CONFIG } from "../../globals";
import DatabaseManager from '../database';

describe('Start standard DatabaseManager', async function () {
    this.timeout(10000);
    let db: DatabaseManager;

    before(function() {
        db = new DatabaseManager({
            host: CONFIG.database.host,
            port: CONFIG.database.port,
            user: CONFIG.database.user,
            database: CONFIG.database.database,
            schema: CONFIG.database.schema + '_test',
            password: CONFIG.database.pass,
            max: CONFIG.database.connections,
        })
    })

    it('should acquire connection', async function() {
        const connection = await db.acquire();
        assert.isObject(connection)
    })

    it('should drop all previously created tables', async function() {
        await db.dropAll();
    })

    it('should initialize', async function() {
        await db.init()
    });
});