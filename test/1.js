
/**
 * @file 1 test
 * @module mongodb-restore
 * @subpackage test
 * @version 0.0.1
 * @author hex7c0 <hex7c0@gmail.com>
 * @license GPLv3
 */


/*
* initialize module
*/
const backup = require('mongodb-backup');
const assert = require('assert');
const fs = require('fs');
const client = require('mongodb').MongoClient;
const dotenv = require('dotenv');

dotenv.config({ path: `${__dirname}/../.env` });

const URI = process.env.URI;
const URI2 = process.env.SRC_DB_URI;

/*
 * test module
 */
describe('start', function () {

  const ROOT = __dirname + '/dump';

  describe('mongodb-backup', function () {

    describe('directory', function () {

      it('should build 1 directory and drop database', function (done) {

        backup({
          uri: URI2,
          root: ROOT,
          collections: ['auths'],
          metadata: true,
          callback: function (err) {

            assert.ifError(err);
            fs.readdirSync(ROOT).forEach(function (first) { // database

              const database = ROOT + '/' + first;

              assert.equal(fs.statSync(database).isDirectory(), true);
              const second = fs.readdirSync(database);

              assert.equal(second.indexOf('auths') >= 0, true);

            });
            done();

          },
        });

      });

    });

    describe('tar', function () {

      const path0 = ROOT + '/t1.tar';
      const path1 = ROOT + '/t_stream.tar';

      it('should make a tar file', function (done) {

        backup({
          uri: URI2,
          root: ROOT,
          tar: 't1.tar',
          callback: function (err) {

            assert.ifError(err);
            assert.equal(fs.existsSync(path0), true);
            done();

          },
        });

      });
      it('should make a tar file for stream', function (done) {

        backup({
          uri: URI2,
          root: ROOT,
          collections: ['logins'],
          tar: 't_stream.tar',
          callback: function (err) {

            assert.ifError(err);
            assert.equal(fs.existsSync(path1), true);
            done();

          },
        });

      });

    });

  });

});
